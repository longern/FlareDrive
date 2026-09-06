import { notFound } from "./utils";
import {
  deletePrefix,
  gcThumbnail,
  isValidThumbnailDigest,
  listAll,
  RequestHandlerParams,
  THUMBNAIL_PREFIX,
  thumbnailRefKey,
} from "./utils";

export async function handleRequestDelete({
  bucket,
  path,
}: RequestHandlerParams) {
  if (path !== "") {
    const obj = await bucket.head(path);
    if (obj === null) return notFound();
    await bucket.delete(path);
    if (obj.httpMetadata?.contentType !== "application/x-directory") {
      const digest = obj.customMetadata?.thumbnail;
      if (isValidThumbnailDigest(digest)) {
        await bucket.delete(thumbnailRefKey(digest, path));
        await gcThumbnail(bucket, digest);
      }
      return new Response(null, { status: 204 });
    }
  }

  // Remove one marker per deleted child first, then garbage-collect each
  // touched thumbnail once, so duplicates sharing a thumbnail are handled.
  const digests = new Set<string>();
  const children = listAll(bucket, path === "" ? undefined : `${path}/`);
  for await (const child of children) {
    await bucket.delete(child.key);
    const { thumbnail } = child.customMetadata ?? {};
    if (isValidThumbnailDigest(thumbnail)) {
      digests.add(thumbnail);
      await bucket.delete(thumbnailRefKey(thumbnail, child.key));
    }
  }
  for (const digest of digests) {
    await gcThumbnail(bucket, digest);
  }

  // "Delete all" removes every user object; drop the shared thumbnails with
  // them, as listAll skips the internal `_$flaredrive$/` subtree.
  if (path === "") {
    await deletePrefix(bucket, THUMBNAIL_PREFIX);
  }

  return new Response(null, { status: 204 });
}
