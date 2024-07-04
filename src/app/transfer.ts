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

function xhrFetch(
  url: RequestInfo | URL,
  requestInit: RequestInit & {
    onUploadProgress?: (progressEvent: ProgressEvent) => void;
  }
) {
  return new Promise<Response>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.upload.onprogress = requestInit.onUploadProgress ?? null;
    xhr.open(
      requestInit.method ?? "GET",
      url instanceof Request ? url.url : url
    );
    const headers = new Headers(requestInit.headers);
    headers.forEach((value, key) => xhr.setRequestHeader(key, value));
    xhr.onload = () => {
      const headers = xhr
        .getAllResponseHeaders()
        .split("\r\n")
        .reduce((acc, header) => {
          const [key, value] = header.split(": ");
          acc[key] = value;
          return acc;
        }, {} as Record<string, string>);
      resolve(new Response(xhr.responseText, { status: xhr.status, headers }));
    };
    xhr.onerror = reject;
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
  }
) {
  const headers = options?.headers || {};
  headers["content-type"] = file.type;

  const uploadResponse = await fetch(`/api/write/items/${key}?uploads`, {
    headers,
    method: "POST",
  });
  const { uploadId } = await uploadResponse.json<{ uploadId: string }>();
  const totalChunks = Math.ceil(file.size / SIZE_LIMIT);

  const promiseGenerator = function* () {
    for (let i = 1; i <= totalChunks; i++) {
      const chunk = file.slice((i - 1) * SIZE_LIMIT, i * SIZE_LIMIT);
      const searchParams = new URLSearchParams({
        partNumber: i.toString(),
        uploadId,
      });
      yield xhrFetch(`/api/write/items/${key}?${searchParams}`, {
        method: "PUT",
        headers,
        body: chunk,
        onUploadProgress: (progressEvent) => {
          if (typeof options?.onUploadProgress !== "function") return;
          options.onUploadProgress({
            loaded: (i - 1) * SIZE_LIMIT + progressEvent.loaded,
            total: file.size,
          });
        },
      }).then((res) => ({
        partNumber: i,
        etag: res.headers.get("etag")!,
      }));
    }
  };

  const uploadedParts = [];
  for (const part of promiseGenerator()) {
    const { partNumber, etag } = await part;
    uploadedParts[partNumber - 1] = { partNumber, etag };
  }
  const completeParams = new URLSearchParams({ uploadId });
  await fetch(`/api/write/items/${key}?${completeParams}`, {
    method: "POST",
    body: JSON.stringify({ parts: uploadedParts }),
  });
}

export async function copyPaste(source: string, target: string) {
  const uploadUrl = `/api/write/items/${target}`;
  await fetch(uploadUrl, {
    method: "PUT",
    headers: { "x-amz-copy-source": encodeURIComponent(source) },
  });
}

export async function createFolder(cwd: string) {
  try {
    const folderName = window.prompt("Folder name");
    if (!folderName) return;
    const uploadUrl = `/api/write/items/${cwd}${folderName}/_$folder$`;
    await fetch(uploadUrl, { method: "PUT" });
  } catch (error) {
    fetch("/api/write/")
      .then((value) => {
        if (value.redirected) window.location.href = value.url;
      })
      .catch(() => {});
    console.log(`Create folder failed`);
  }
}

export const uploadQueue: {
  basedir: string;
  file: File;
}[] = [];

export async function processUploadQueue() {
  if (!uploadQueue.length) {
    return;
  }

  const { basedir, file } = uploadQueue.shift()!;
  let thumbnailDigest = null;

  if (file.type.startsWith("image/") || file.type === "video/mp4") {
    try {
      const thumbnailBlob = await generateThumbnail(file);
      const digestHex = await blobDigest(thumbnailBlob);

      const thumbnailUploadUrl = `/api/write/items/_$flaredrive$/thumbnails/${digestHex}.png`;
      try {
        await fetch(thumbnailUploadUrl, {
          method: "PUT",
          body: thumbnailBlob,
        });
        thumbnailDigest = digestHex;
      } catch (error) {
        fetch("/api/write/")
          .then((value) => {
            if (value.redirected) window.location.href = value.url;
          })
          .catch(() => {});
        console.log(`Upload ${digestHex}.png failed`);
      }
    } catch (error) {
      console.log(`Generate thumbnail failed`);
    }
  }

  try {
    const uploadUrl = `/api/write/items/${basedir}${file.name}`;
    const headers: { "fd-thumbnail"?: string } = {};
    if (thumbnailDigest) headers["fd-thumbnail"] = thumbnailDigest;
    if (file.size >= SIZE_LIMIT) {
      await multipartUpload(`${basedir}${file.name}`, file, {
        headers,
      });
    } else {
      await xhrFetch(uploadUrl, { headers, body: file });
    }
  } catch (error) {
    fetch("/api/write/")
      .then((value) => {
        if (value.redirected) window.location.href = value.url;
      })
      .catch(() => {});
    console.log(`Upload ${file.name} failed`, error);
  }
  setTimeout(processUploadQueue);
}
