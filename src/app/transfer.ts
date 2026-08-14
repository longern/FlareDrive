import pLimit from "p-limit";

import { encodeKey, FileItem } from "../FileGrid";
import { parseXmlSafely, extractFileInfoFromXml, debugXmlIssues } from "../utils/xmlParser";
import { getAuthHeaders } from "../utils/auth";

const WEBDAV_ENDPOINT = "/file/";

// In-memory listing cache. PROPFIND is the dominant read request; caching it
// for a short TTL turns repeated navigation (folder → back → folder) into zero
// network round-trips. Invalidated explicitly after any write (upload/delete/
// rename). A 30s TTL bounds staleness without an ETag round-trip.
// ponytail: swap the Map for IndexedDB when cold-start listing latency matters.
const LISTING_TTL_MS = 30_000;
const listingCache = new Map<string, { items: FileItem[]; expires: number }>();

export function invalidateListings() {
  listingCache.clear();
}

// Non-enumerable helper so the UI can skip the loading spinner when a listing
// will be served straight from cache.
export function isListingCached(path: string): boolean {
  const c = listingCache.get(path);
  return Boolean(c && c.expires > Date.now());
}

// Helper function to parse responses from DOM elements
async function parseResponsesFromDOM(responses: Element[], path: string): Promise<FileItem[]> {
  const currentPath = path.replace(/\/$/, "");

  const items: FileItem[] = responses
    .filter((response) => {
      const href = response.querySelector("href")?.textContent;
      if (!href) return false;
      
      const decodedPath = decodeURIComponent(href).slice(WEBDAV_ENDPOINT.length);
      return decodedPath !== currentPath;
    })
    .map((response) => {
      try {
        const href = response.querySelector("href")?.textContent;
        if (!href) throw new Error("Missing href in response");
        
        const contentType = response.querySelector("getcontenttype")?.textContent || "application/octet-stream";
        const size = response.querySelector("getcontentlength")?.textContent;
        const lastModified = response.querySelector("getlastmodified")?.textContent;
        const thumbnail = response.getElementsByTagNameNS("flaredrive", "thumbnail")[0]?.textContent;
        
        const fileItem = {
          key: decodeURI(href).replace(/^\/file\//, ""),
          size: size ? Number(size) : 0,
          uploaded: lastModified || new Date().toISOString(),
          httpMetadata: { contentType },
          customMetadata: { thumbnail },
        } as FileItem;
        
        return fileItem;
      } catch (error) {
        console.error("Error parsing response item:", error, response);
        return null;
      }
    })
    .filter((item): item is FileItem => item !== null);
  
  return items;
}

// Helper function to parse responses from regex-extracted data
async function parseResponsesFromRegex(
  fileInfos: Array<{
    href: string;
    contentType?: string;
    size?: string;
    lastModified?: string;
    thumbnail?: string;
  }>,
  path: string
): Promise<FileItem[]> {
  const currentPath = path.replace(/\/$/, "");

  const items: FileItem[] = fileInfos
    .filter((fileInfo) => {
      const decodedPath = decodeURIComponent(fileInfo.href).slice(WEBDAV_ENDPOINT.length);
      return decodedPath !== currentPath;
    })
    .map((fileInfo) => {
      try {
        const fileItem = {
          key: decodeURI(fileInfo.href).replace(/^\/file\//, ""),
          size: fileInfo.size ? Number(fileInfo.size) : 0,
          uploaded: fileInfo.lastModified || new Date().toISOString(),
          httpMetadata: { contentType: fileInfo.contentType || "application/octet-stream" },
          customMetadata: { thumbnail: fileInfo.thumbnail },
        } as FileItem;
        
        return fileItem;
      } catch (error) {
        console.error("Error parsing file info:", error, fileInfo);
        return null;
      }
    })
    .filter((item): item is FileItem => item !== null);
  
  return items;
}

export async function fetchPath(path: string): Promise<FileItem[]> {
  const cached = listingCache.get(path);
  if (cached && cached.expires > Date.now()) return cached.items;

  const headers: Record<string, string> = {
    Depth: "1",
    ...getAuthHeaders()
  };

  const url = `${WEBDAV_ENDPOINT}${encodeKey(path)}`;

  const res = await fetch(url, {
    method: "PROPFIND",
    headers,
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch: ${res.status} ${res.statusText}`);
  }

  const contentType = res.headers.get("Content-Type");
  if (!contentType?.includes("application/xml")) {
    throw new Error(`Invalid response content type: ${contentType}`);
  }

  const text = await res.text();

  // Try robust XML parsing first
  const document = parseXmlSafely(text);
  let items: FileItem[] = [];

  if (document) {
    // XML parsing succeeded, use DOM approach
    const responses = Array.from(document.querySelectorAll("response"));
    items = await parseResponsesFromDOM(responses, path);
  } else {
    // XML parsing failed, use regex fallback
    debugXmlIssues(text);
    const fileInfos = extractFileInfoFromXml(text);
    items = await parseResponsesFromRegex(fileInfos, path);
  }

  listingCache.set(path, { items, expires: Date.now() + LISTING_TTL_MS });
  return items;
}

const THUMBNAIL_SIZE = 144;

export async function generateThumbnail(file: File) {
  const canvas = document.createElement("canvas");
  canvas.width = THUMBNAIL_SIZE;
  canvas.height = THUMBNAIL_SIZE;
  var ctx = canvas.getContext("2d")!;

  if (file.type.startsWith("image/")) {
    const image = await new Promise<HTMLImageElement>((resolve) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.src = URL.createObjectURL(file);
    });
    ctx.drawImage(image, 0, 0, THUMBNAIL_SIZE, THUMBNAIL_SIZE);
  } else if (file.type === "video/mp4") {
    // Generate thumbnail from video
    const video = await new Promise<HTMLVideoElement>(
      async (resolve, reject) => {
        const video = document.createElement("video");
        video.muted = true;
        video.src = URL.createObjectURL(file);
        setTimeout(() => reject(new Error("Video load timeout")), 2000);
        await video.play();
        video.pause();
        video.currentTime = 0;
        resolve(video);
      }
    );
    ctx.drawImage(video, 0, 0, THUMBNAIL_SIZE, THUMBNAIL_SIZE);
  } else if (file.type === "application/pdf") {
    const pdfjsLib = await import(
      // @ts-ignore
      "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.min.mjs"
    );
    pdfjsLib.GlobalWorkerOptions.workerSrc =
      "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.worker.min.mjs";
    const pdf = await pdfjsLib.getDocument(URL.createObjectURL(file)).promise;
    const page = await pdf.getPage(1);
    const { width, height } = page.getViewport({ scale: 1 });
    var scale = THUMBNAIL_SIZE / Math.max(width, height);
    const viewport = page.getViewport({ scale });
    const renderContext = { canvasContext: ctx, viewport };
    await page.render(renderContext).promise;
  }

  const thumbnailBlob = await new Promise<Blob>((resolve) =>
    canvas.toBlob((blob) => resolve(blob!))
  );

  return thumbnailBlob;
}

export async function blobDigest(blob: Blob) {
  const digest = await crypto.subtle.digest("SHA-1", await blob.arrayBuffer());
  const digestArray = Array.from(new Uint8Array(digest));
  const digestHex = digestArray
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return digestHex;
}

export const SIZE_LIMIT = 100 * 1000 * 1000; // 100MB

/**
 * Sanitize filename to lowercase and replace spaces/symbols with dash
 * Example: "Kahitna - Menikahimu.mp3" -> "kahitna---menikahimu.mp3"
 * Keeps only alphanumeric, dots (for extension), and dashes
 */
export function sanitizeFileName(fileName: string): string {
  // Split filename and extension
  const lastDotIndex = fileName.lastIndexOf('.');
  let name = fileName;
  let extension = '';

  if (lastDotIndex > 0) {
    name = fileName.substring(0, lastDotIndex);
    extension = fileName.substring(lastDotIndex); // includes the dot
  }

  // Convert to lowercase
  name = name.toLowerCase();
  extension = extension.toLowerCase();

  // Replace any character that is not alphanumeric or dash with dash
  // This will replace spaces, special characters, etc. with dash
  name = name.replace(/[^a-z0-9-]+/g, '-');

  // Remove leading/trailing dashes
  name = name.replace(/^-+|-+$/g, '');

  // Replace multiple consecutive dashes with single dash
  name = name.replace(/-+/g, '-');

  return name + extension;
}

function xhrFetch(
  url: RequestInfo | URL,
  requestInit: RequestInit & {
    onUploadProgress?: (progressEvent: ProgressEvent) => void;
    abortSignal?: AbortSignal;
  }
) {
  return new Promise<Response>((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    // Handle abort signal — remove the listener on completion so a cancelled
    // upload (or one that finished first) does not leak the handle.
    const onAbort = () => {
      xhr.abort();
      reject(new DOMException('Aborted', 'AbortError'));
    };
    if (requestInit.abortSignal) {
      requestInit.abortSignal.addEventListener('abort', onAbort);
    }
    const cleanup = () => requestInit.abortSignal?.removeEventListener('abort', onAbort);
    xhr.upload.onprogress = (event) => {
      if (requestInit.onUploadProgress) requestInit.onUploadProgress(event);
    };
    xhr.open(
      requestInit.method ?? "GET",
      url instanceof Request ? url.url : url
    );
    const headers = new Headers(requestInit.headers);
    headers.forEach((value, key) => xhr.setRequestHeader(key, value));
    xhr.onload = () => {
      cleanup();
      const headers = xhr
        .getAllResponseHeaders()
        .trim()
        .split("\r\n")
        .reduce((acc, header) => {
          const [key, value] = header.split(": ");
          acc[key] = value;
          return acc;
        }, {} as Record<string, string>);

      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(new Response(xhr.responseText, { status: xhr.status, headers }));
      } else {
        reject(new Error(`Upload failed with status ${xhr.status}: ${xhr.responseText}`));
      }
    };
    xhr.onerror = () => {
      cleanup();
      reject(new Error('Network error during upload'));
    };
    if (
      requestInit.body instanceof Blob ||
      typeof requestInit.body === "string"
    ) {
      xhr.send(requestInit.body);
    }
  });
}

export async function multipartUpload(
  key: string,
  file: File,
  options?: {
    headers?: Record<string, string>;
    onUploadProgress?: (progressEvent: {
      loaded: number;
      total: number;
    }) => void;
    abortSignal?: AbortSignal;
  }
) {
  const headers = { ...getAuthHeaders(), ...(options?.headers || {}) };
  headers["content-type"] = file.type;

  const uploadResponse = await fetch(`/file/${encodeKey(key)}?uploads`, {
    headers,
    method: "POST",
  });
  const { uploadId } = await uploadResponse.json<{ uploadId: string }>();
  const totalChunks = Math.ceil(file.size / SIZE_LIMIT);

  const limit = pLimit(2);
  const parts = Array.from({ length: totalChunks }, (_, i) => i + 1);
  const promises = parts.map((i) =>
    limit(async () => {
      const chunk = file.slice((i - 1) * SIZE_LIMIT, i * SIZE_LIMIT);
      const searchParams = new URLSearchParams({
        partNumber: i.toString(),
        uploadId,
      });
      const res = await xhrFetch(`/file/${encodeKey(key)}?${searchParams}`, {
        method: "PUT",
        headers: { ...headers, ...getAuthHeaders() },
        body: chunk,
        abortSignal: options?.abortSignal,
        onUploadProgress: (progressEvent) => {
          if (typeof options?.onUploadProgress !== "function") return;
          options.onUploadProgress({
            loaded: (i - 1) * SIZE_LIMIT + progressEvent.loaded,
            total: file.size,
          });
        },
      });
      return { partNumber: i, etag: res.headers.get("etag")! };
    })
  );
  const uploadedParts = await Promise.all(promises);
  const completeParams = new URLSearchParams({ uploadId });
  await fetch(`/file/${encodeKey(key)}?${completeParams}`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify({ parts: uploadedParts }),
  });
}

export async function copyPaste(source: string, target: string, move = false) {
  const uploadUrl = `${WEBDAV_ENDPOINT}${encodeKey(source)}`;
  const destinationUrl = new URL(
    `${WEBDAV_ENDPOINT}${encodeKey(target)}`,
    window.location.href
  );
  await fetch(uploadUrl, {
    method: move ? "MOVE" : "COPY",
    headers: { Destination: destinationUrl.href, ...getAuthHeaders() },
  });
}

export async function createFolder(cwd: string, folderName: string) {
  if (!folderName || folderName.includes("/")) return;
  try {
    const folderKey = `${cwd}${folderName}`;
    const uploadUrl = `${WEBDAV_ENDPOINT}${encodeKey(folderKey)}`;
    await fetch(uploadUrl, { method: "MKCOL", headers: getAuthHeaders() });
  } catch (error) {
    console.log(`Create folder failed`);
  }
}

export const uploadQueue: {
  basedir: string;
  file: File;
  uploadId?: string;
  abortController?: AbortController;
}[] = [];

export async function processUploadQueue(
  uploadManager?: any,
  onProgress?: (loaded: number, total: number, uploadId: string) => void
) {
  if (!uploadQueue.length) return;

  const item = uploadQueue.shift()!;
  const { basedir, file, uploadId, abortController } = item;
  let thumbnailDigest = null;

  try {
    // Sanitize the filename
    const sanitizedFileName = sanitizeFileName(file.name);

    const headers: { "fd-thumbnail"?: string } = {};
    if (thumbnailDigest) headers["fd-thumbnail"] = thumbnailDigest;

    // Update status to uploading
    if (uploadManager && uploadId) {
      uploadManager.setUploadStatus(uploadId, 'uploading');
    }

    if (file.size >= SIZE_LIMIT) {
      await multipartUpload(basedir + sanitizedFileName, file, {
        headers,
        abortSignal: abortController?.signal,
        onUploadProgress: (progressEvent) => {
          if (uploadManager && uploadId) {
            const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            uploadManager.updateProgress(uploadId, percentCompleted);
          }
          if (onProgress && uploadId) {
            onProgress(progressEvent.loaded, progressEvent.total, uploadId);
          }
        }
      });
    } else {
      const uploadUrl = `${WEBDAV_ENDPOINT}${encodeKey(basedir + sanitizedFileName)}`;
      await xhrFetch(uploadUrl, {
        method: "PUT",
        headers: { ...headers, ...getAuthHeaders() },
        body: file,
        abortSignal: abortController?.signal,
        onUploadProgress: (progressEvent) => {
          if (uploadManager && uploadId) {
            const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            uploadManager.updateProgress(uploadId, percentCompleted);
          }
        }
      });
    }
    
    // Mark as completed
    if (uploadManager && uploadId) {
      uploadManager.completeUpload(uploadId);
    }
  } catch (error: any) {
    console.log(`Upload ${file.name} failed`, error);
    
    // Check if it was cancelled
    if (error.name === 'AbortError') {
      if (uploadManager && uploadId) {
        // Status already set by cancelUpload method
      }
    } else {
      // Mark as error
      if (uploadManager && uploadId) {
        uploadManager.errorUpload(uploadId, error.message || 'Upload failed');
      }
    }
  }
  
  // Process next upload
  setTimeout(() => processUploadQueue(uploadManager, onProgress));
}
