export interface RequestHandlerParams {
  bucket: R2Bucket;
  path: string;
  request: Request;
}

export const WEBDAV_ENDPOINT = "/webdav/";

export const ROOT_OBJECT = {
  key: "",
  uploaded: new Date(),
  httpMetadata: {
    contentType: "application/x-directory",
    contentDisposition: undefined,
    contentLanguage: undefined,
  },
  customMetadata: undefined,
  size: 0,
  etag: undefined,
};

export function notFound() {
  return new Response("Not found", { status: 404 });
}

export function parseBucketPath(context: any): [R2Bucket, string] {
  const { request, env, params } = context;
  const url = new URL(request.url);

  const pathSegments = (params.path || []) as String[];
  const path = decodeURIComponent(pathSegments.join("/"));
  const driveid = url.hostname.replace(/\..*/, "");

  return [env[driveid] || env["BUCKET"], path];
}

// Thumbnails are content-addressed (`_$flaredrive$/thumbnails/<digest>.png`)
// and shared by every file whose generated thumbnail has the same digest, so a
// file delete cannot remove one outright. Instead, each referencing file keeps
// an immutable marker object under THUMBNAIL_REFS_PREFIX; a thumbnail is
// deleted only once no marker remains. Markers are written before the
// referencing object and removed after the reference is gone, so a concurrent
// delete can at worst over-retain a thumbnail, never break one still in use.
export const THUMBNAIL_PREFIX = "_$flaredrive$/thumbnails/";
export const THUMBNAIL_REFS_PREFIX = `${THUMBNAIL_PREFIX}refs/`;

// Digests are hex-encoded hashes produced by the client (e.g. SHA-1).
const THUMBNAIL_DIGEST_RE = /^[a-f0-9]{16,128}$/;

export function isValidThumbnailDigest(digest: unknown): digest is string {
  return typeof digest === "string" && THUMBNAIL_DIGEST_RE.test(digest);
}

export function thumbnailObjectKey(digest: string): string {
  return `${THUMBNAIL_PREFIX}${digest}.png`;
}

export function thumbnailRefKey(digest: string, path: string): string {
  return `${THUMBNAIL_REFS_PREFIX}${digest}/${path}`;
}

export async function addThumbnailRef(
  bucket: R2Bucket,
  digest: unknown,
  path: string
) {
  if (!isValidThumbnailDigest(digest)) return;
  await bucket.put(thumbnailRefKey(digest, path), "");
}

/** Deletes a thumbnail if no reference marker is left for it. */
export async function gcThumbnail(bucket: R2Bucket, digest: unknown) {
  if (!isValidThumbnailDigest(digest)) return;
  const refs = await bucket.list({
    prefix: thumbnailRefKey(digest, ""),
    limit: 1,
  });
  if (refs.objects.length === 0) {
    await bucket.delete(thumbnailObjectKey(digest));
  }
}

/** Removes one reference marker, then garbage-collects the thumbnail. */
export async function releaseThumbnailRef(
  bucket: R2Bucket,
  digest: unknown,
  path: string
) {
  if (!isValidThumbnailDigest(digest)) return;
  await bucket.delete(thumbnailRefKey(digest, path));
  await gcThumbnail(bucket, digest);
}

/** Deletes every object under a key prefix (used for internal subtrees). */
export async function deletePrefix(bucket: R2Bucket, prefix: string) {
  let cursor: string | undefined = undefined;
  do {
    const listed = await bucket.list({ prefix, cursor });
    if (listed.objects.length > 0) {
      await bucket.delete(listed.objects.map((obj) => obj.key));
    }
    if (!listed.truncated) return;
    cursor = listed.cursor;
  } while (cursor);
}

/**
 * Copies an object while keeping thumbnail references in sync: adds a marker
 * for the copy before writing it, and releases the destination's previous
 * thumbnail (if any) after a successful overwrite.
 */
export async function copyObject(
  bucket: R2Bucket,
  source: R2ObjectBody,
  destination: string
) {
  const prev = await bucket.head(destination);
  const prevDigest = prev?.customMetadata?.thumbnail;
  const digest = source.customMetadata?.thumbnail;
  await addThumbnailRef(bucket, digest, destination);
  await bucket.put(destination, source.body, {
    httpMetadata: source.httpMetadata,
    customMetadata: source.customMetadata,
  });
  if (prevDigest !== digest) {
    await releaseThumbnailRef(bucket, prevDigest, destination);
  }
}

export async function* listAll(
  bucket: R2Bucket,
  prefix?: string,
  isRecursive: boolean = false
) {
  let cursor: string | undefined = undefined;
  do {
    var r2Objects = await bucket.list({
      prefix: prefix,
      delimiter: isRecursive ? undefined : "/",
      cursor: cursor,
      // @ts-ignore
      include: ["httpMetadata", "customMetadata"],
    });

    for await (const obj of r2Objects.objects)
      if (!obj.key.startsWith("_$flaredrive$/")) yield obj;

    if (r2Objects.truncated) cursor = r2Objects.cursor;
  } while (r2Objects.truncated);
}
