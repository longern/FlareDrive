import pLimit from "p-limit";

import { encodeKey, FileItem } from "../FileGrid";
import { TransferTask } from "./transferQueue";

const WEBDAV_ENDPOINT = "/webdav/";

export async function fetchPath(path: string) {
  const res = await fetch(`${WEBDAV_ENDPOINT}${encodeKey(path)}`, {
    method: "PROPFIND",
    headers: { Depth: "1" },
  });

  if (!res.ok) throw new Error("Failed to fetch");
  if (!res.headers.get("Content-Type")?.includes("application/xml"))
    throw new Error("Invalid response");

  const parser = new DOMParser();
  const text = await res.text();
  const document = parser.parseFromString(text, "application/xml");
  const items: FileItem[] = Array.from(document.querySelectorAll("response"))
    .filter(
      (response) =>
        decodeURIComponent(
          response.querySelector("href")?.textContent ?? ""
        ).slice(WEBDAV_ENDPOINT.length) !== path.replace(/\/$/, "")
    )
    .map((response) => {
      const href = response.querySelector("href")?.textContent;
      if (!href) throw new Error("Invalid response");
      const contentType = response.querySelector("getcontenttype")?.textContent;
      const size = response.querySelector("getcontentlength")?.textContent;
      const lastModified =
        response.querySelector("getlastmodified")?.textContent;
      const thumbnail = response.getElementsByTagNameNS(
        "flaredrive",
        "thumbnail"
      )[0]?.textContent;
      return {
        key: decodeURI(href).replace(/^\/webdav\//, ""),
        size: size ? Number(size) : 0,
        uploaded: lastModified!,
        httpMetadata: { contentType: contentType! },
        customMetadata: { thumbnail },
      } as FileItem;
    });
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

export async function copyPaste(source: string, target: string, move = false) {
  const uploadUrl = `${WEBDAV_ENDPOINT}${encodeKey(source)}`;
  const destinationUrl = new URL(
    `${WEBDAV_ENDPOINT}${encodeKey(target)}`,
    window.location.href
  );
  await fetch(uploadUrl, {
    method: move ? "MOVE" : "COPY",
    headers: { Destination: destinationUrl.href },
  });
}

export async function createFolder(cwd: string) {
  try {
    const folderName = window.prompt("Folder name");
    if (!folderName) return;
    if (folderName.includes("/")) {
      window.alert("Invalid folder name");
      return;
    }
    const folderKey = `${cwd}${folderName}`;
    const uploadUrl = `${WEBDAV_ENDPOINT}${encodeKey(folderKey)}`;
    await fetch(uploadUrl, { method: "MKCOL" });
  } catch (error) {
    console.log(`Create folder failed`);
  }
}

// 添加流式上传函数
export async function streamUpload(
  key: string,
  file: File,
  options?: {
    headers?: Record<string, string>;
    onUploadProgress?: (progressEvent: {
      loaded: number;
      total: number;
    }) => void;
    chunkSize?: number;
  }
) {
  const chunkSize = options?.chunkSize || 64 * 1024; // 64KB chunks
  const headers = options?.headers || {};
  headers["content-type"] = file.type;
  headers["transfer-encoding"] = "chunked";
  
  // 创建可读流
  const stream = new ReadableStream({
    start(controller) {
      let offset = 0;
      
      const pushChunk = async () => {
        if (offset >= file.size) {
          controller.close();
          return;
        }
        
        const chunk = file.slice(offset, offset + chunkSize);
        const arrayBuffer = await chunk.arrayBuffer();
        controller.enqueue(new Uint8Array(arrayBuffer));
        
        offset += chunkSize;
        options?.onUploadProgress?.({
          loaded: Math.min(offset, file.size),
          total: file.size
        });
        
        // 继续下一个chunk
        setTimeout(pushChunk, 0);
      };
      
      pushChunk();
    }
  });
  
  const uploadUrl = `${WEBDAV_ENDPOINT}${encodeKey(key)}`;
  return await fetch(uploadUrl, {
    method: "PUT",
    headers,
    body: stream,
    // @ts-ignore - 启用流式传输
    duplex: 'half'
  });
}

// 流式上传单个分片
async function streamChunk(
  url: string,
  file: File | Blob,
  options: {
    headers?: Record<string, string>;
    onProgress?: (event: { loaded: number; total: number }) => void;
  }
) {
  const chunkSize = 64 * 1024; // 64KB
  let loaded = 0;
  
  const stream = new ReadableStream({
    start(controller) {
      let offset = 0;
      
      const reader = new FileReader();
      
      const readNextChunk = () => {
        if (offset >= file.size) {
          controller.close();
          return;
        }
        
        const chunk = file.slice(offset, offset + chunkSize);
        reader.onload = (e) => {
          const arrayBuffer = e.target?.result as ArrayBuffer;
          controller.enqueue(new Uint8Array(arrayBuffer));
          
          loaded += arrayBuffer.byteLength;
          options.onProgress?.({ loaded, total: file.size });
          
          offset += chunkSize;
          setTimeout(readNextChunk, 0);
        };
        
        reader.readAsArrayBuffer(chunk);
      };
      
      readNextChunk();
    }
  });
  
  return await fetch(url, {
    method: "PUT",
    headers: {
      ...options.headers,
      "transfer-encoding": "chunked"
    },
    body: stream,
    // @ts-ignore
    duplex: 'half'
  });
}

// 修改 processTransferTask 函数
export async function processTransferTask({
  task,
  onTaskProgress,
}: {
  task: TransferTask;
  onTaskProgress?: (event: { loaded: number; total: number }) => void;
}) {
  const { remoteKey, file } = task;
  if (task.type !== "upload" || !file) throw new Error("Invalid task");
  let thumbnailDigest = null;

  if (
    file.type.startsWith("image/") ||
    file.type === "video/mp4" ||
    file.type === "application/pdf"
  ) {
    try {
      const thumbnailBlob = await generateThumbnail(file);
      const digestHex = await blobDigest(thumbnailBlob);

      const thumbnailUploadUrl = `/webdav/_$flaredrive$/thumbnails/${digestHex}.png`;
      try {
        await fetch(thumbnailUploadUrl, {
          method: "PUT",
          body: thumbnailBlob,
        });
        thumbnailDigest = digestHex;
      } catch (error) {
        console.log(`Upload ${digestHex}.png failed`);
      }
    } catch (error) {
      console.log(`Generate thumbnail failed`);
    }
  }

  const headers: { "fd-thumbnail"?: string } = {};
  if (thumbnailDigest) headers["fd-thumbnail"] = thumbnailDigest;
  
  if (file.size >= SIZE_LIMIT) {
    return await multipartUpload(remoteKey, file, {
      headers,
      onUploadProgress: onTaskProgress,
    });
  } else {
    // 对于小文件，也使用流式上传替代原来的 xhrFetch
    return await streamUpload(remoteKey, file, {
      headers,
      onUploadProgress: onTaskProgress,
    });
  }
}

// 修改 multipartUpload 函数使用流式传输
export async function multipartUpload(
  key: string,
  file: File,
  options?: {
    headers?: Record<string, string>;
    onUploadProgress?: (progressEvent: {
      loaded: number;
      total: number;
    }) => void;
  }
) {
  const headers = options?.headers || {};
  headers["content-type"] = file.type;

  // 对于大文件，使用真正的分片上传
  if (file.size > SIZE_LIMIT) {
    const uploadResponse = await fetch(`/webdav/${encodeKey(key)}?uploads`, {
      headers,
      method: "POST",
    });
    const { uploadId } = await uploadResponse.json<{ uploadId: string }>();
    const totalChunks = Math.ceil(file.size / SIZE_LIMIT);

    const limit = pLimit(2);
    const parts = Array.from({ length: totalChunks }, (_, i) => i + 1);
    const partsLoaded = Array.from({ length: totalChunks + 1 }, () => 0);
    
    const promises = parts.map((i) =>
      limit(async () => {
        const chunk = file.slice((i - 1) * SIZE_LIMIT, i * SIZE_LIMIT);
        const searchParams = new URLSearchParams({
          partNumber: i.toString(),
          uploadId,
        });
        const uploadUrl = `/webdav/${encodeKey(key)}?${searchParams}`;
        
        // 对每个分片使用流式上传
        const response = await streamChunk(uploadUrl, chunk, {
          headers,
          onProgress: (progressEvent) => {
            partsLoaded[i] = progressEvent.loaded;
            options?.onUploadProgress?.({
              loaded: partsLoaded.reduce((a, b) => a + b),
              total: file.size,
            });
          }
        });
        
        return { partNumber: i, etag: response.headers.get("etag")! };
      })
    );
    
    const uploadedParts = await Promise.all(promises);
    const completeParams = new URLSearchParams({ uploadId });
    const response = await fetch(`/webdav/${encodeKey(key)}?${completeParams}`, {
      method: "POST",
      body: JSON.stringify({ parts: uploadedParts }),
    });
    
    if (!response.ok) throw new Error(await response.text());
    return response;
  } else {
    // 小文件直接使用流式上传
    return await streamUpload(key, file, options);
  }
}