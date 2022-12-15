/**
 * @param {File} file
 */
export async function generateThumbnail(file) {
  /** @type HTMLImageElement */
  const image = await new Promise((resolve) => {
    var image = new Image();
    image.onload = () => resolve(image);
    image.src = URL.createObjectURL(file);
  });

  const canvas = document.createElement("canvas");
  canvas.width = 144;
  canvas.height = 144;
  var ctx = canvas.getContext("2d");
  ctx.drawImage(image, 0, 0, 144, 144);

  /** @type Blob */
  const thumbnailBlob = await new Promise((resolve) =>
    canvas.toBlob((blob) => resolve(blob))
  );

  return thumbnailBlob;
}

/**
 * @param {Blob} blob
 */
export async function blobDigest(blob) {
  const digest = await crypto.subtle.digest("SHA-1", await blob.arrayBuffer());
  const digestArray = Array.from(new Uint8Array(digest));
  const digestHex = digestArray
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return digestHex;
}

export const SIZE_LIMIT = 100 * 1000 * 1000;

/**
 * @param {string} key
 * @param {File} file
 * @param {Record<string, any>} options
 */
export async function multipartUpload(key, file, options) {
  const uploadId = await axios
    .post(`/api/write/items/${key}?uploads`, "", {
      headers: { "content-type": file.type },
    })
    .then((res) => res.data.uploadId);
  const totalChunks = Math.ceil(file.size / SIZE_LIMIT);
  const etags = new Array(totalChunks);
  for (let i = 0; i < totalChunks; i++) {
    const chunk = file.slice(i * SIZE_LIMIT, (i + 1) * SIZE_LIMIT);
    const searchParams = new URLSearchParams({ partNumber: i + 1, uploadId });
    /** @type Response */
    const partResponse = await axios.put(
      `/api/write/items/${key}?${searchParams}`,
      chunk,
      {
        onUploadProgress(progressEvent) {
          if (typeof options?.onUploadProgress !== "function") return;
          options.onUploadProgress({
            loaded: i * SIZE_LIMIT + progressEvent.loaded,
            total: file.size,
          });
        },
      }
    );
    etags[i] = partResponse.headers.etag;
  }
  const uploadedParts = etags.map((etag, index) => ({
    etag,
    partNumber: index + 1,
  }));
  const completeParams = new URLSearchParams({ uploadId });
  await axios.post(`/api/write/items/${key}?${completeParams}`, {
    parts: uploadedParts,
  });
}
