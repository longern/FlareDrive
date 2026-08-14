import { notFound } from "./utils";
import { RequestHandlerParams } from "./utils";

export async function handleRequestGet({
  bucket,
  path,
  request,
}: RequestHandlerParams) {
  const obj = await bucket.get(path, {
    onlyIf: request.headers,
    range: request.headers,
  });
  if (obj === null) return notFound();
  if (!("body" in obj))
    return new Response("Preconditions failed", { status: 412 });

  const headers = new Headers();
  obj.writeHttpMetadata(headers);
  if (path.startsWith("_$flaredrive$/thumbnails/")) {
    headers.set("Cache-Control", "public, max-age=31536000, immutable");
  } else {
    // General objects get a short browser-only cache so repeat GETs (and
    // clients that re-download) skip R2. Stays `private` because GET is
    // auth-gated unless WEBDAV_PUBLIC_READ — shared-cache caching authed
    // content would be a leak. ETag is already written by writeHttpMetadata
    // for If-None-Match revalidation.
    headers.set("Cache-Control", "private, max-age=60");
  }
  return new Response(obj.body, { headers });
}
