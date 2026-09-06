import {
  RequestHandlerParams,
  ROOT_OBJECT,
  addThumbnailRef,
  isValidThumbnailDigest,
  releaseThumbnailRef,
  thumbnailObjectKey,
  thumbnailRefKey,
} from "./utils";

async function handleRequestPutMultipart({
  bucket,
  path,
  request,
}: RequestHandlerParams) {
  const url = new URL(request.url);

  const uploadId = new URLSearchParams(url.search).get("uploadId");
  const partNumberStr = new URLSearchParams(url.search).get("partNumber");
  if (!uploadId || !partNumberStr || !request.body)
    return new Response("Bad Request", { status: 400 });
  const multipartUpload = bucket.resumeMultipartUpload(path, uploadId);

  const partNumber = parseInt(partNumberStr);
  const uploadedPart = await multipartUpload.uploadPart(
    partNumber,
    request.body
  );

  return new Response(null, {
    headers: { "Content-Type": "application/json", etag: uploadedPart.etag },
  });
}

export async function handleRequestPut({
  bucket,
  path,
  request,
}: RequestHandlerParams) {
  const searchParams = new URLSearchParams(new URL(request.url).search);
  if (searchParams.has("uploadId")) {
    return handleRequestPutMultipart({ bucket, path, request });
  }

  if (request.url.endsWith("/")) {
    return new Response("Method Not Allowed", { status: 405 });
  }

  // Check if the parent directory exists
  if (!path.startsWith("_$flaredrive$/")) {
    const parentPath = path.replace(/(\/|^)[^/]*$/, "");
    const parentDir =
      parentPath === "" ? ROOT_OBJECT : await bucket.head(parentPath);
    if (parentDir === null) return new Response("Conflict", { status: 409 });
  }

  const rawThumbnail = request.headers.get("fd-thumbnail");
  const thumbnail = isValidThumbnailDigest(rawThumbnail)
    ? rawThumbnail
    : undefined;

  // Overwriting a file replaces its customMetadata, so remember whether the
  // previous object referenced a thumbnail that will need releasing.
  const prev = await bucket.head(path);
  const prevThumbnail = prev?.customMetadata?.thumbnail;

  if (thumbnail) {
    // Reference the thumbnail before the file exists, so a concurrent delete
    // of the last other file using it cannot garbage-collect it mid-upload.
    await addThumbnailRef(bucket, thumbnail, path);
    // The client uploads the thumbnail blob just before the file; if a
    // concurrent GC removed it in between, fail so the upload can be retried.
    if ((await bucket.head(thumbnailObjectKey(thumbnail))) === null) {
      await bucket.delete(thumbnailRefKey(thumbnail, path));
      return new Response("Thumbnail is missing", { status: 409 });
    }
  }

  const result = await bucket.put(path, request.body, {
    onlyIf: request.headers,
    httpMetadata: request.headers,
    customMetadata: thumbnail ? { thumbnail } : undefined,
  });

  if (!result) {
    if (thumbnail) await bucket.delete(thumbnailRefKey(thumbnail, path));
    return new Response("Preconditions failed", { status: 412 });
  }

  if (prevThumbnail !== thumbnail) {
    await releaseThumbnailRef(bucket, prevThumbnail, path);
  }

  return new Response("", { status: 201 });
}
