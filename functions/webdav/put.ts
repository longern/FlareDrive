import { RequestHandlerParams, ROOT_OBJECT } from "./utils";

export async function handleRequestPut({
  bucket,
  path,
  request,
}: RequestHandlerParams) {
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

  const thumbnail = request.headers.get("fd-thumbnail");
  const customMetadata = thumbnail ? { thumbnail } : undefined;

  const result = await bucket.put(path, request.body, {
    onlyIf: request.headers,
    httpMetadata: request.headers,
    customMetadata,
  });

  if (!result) return new Response("Preconditions failed", { status: 412 });

  return new Response("", { status: 201 });
}
