import { notFound } from "@/utils/bucket";
import { RequestHandlerParams } from "./utils";

export async function handleRequestPut({
  bucket,
  path,
  request,
}: RequestHandlerParams) {
  if (request.url.endsWith("/")) {
    return new Response("Method Not Allowed", { status: 405 });
  }

  // Check if the parent directory exists
  let parent_dir = path.replace(/(\/|^)[^/]*$/, "");

  if (parent_dir !== "" && !(await bucket.head(parent_dir))) {
    return new Response("Conflict", { status: 409 });
  }

  const result = await bucket.put(path, request.body, {
    onlyIf: request.headers,
    httpMetadata: request.headers,
  });

  if (!result) return new Response("Preconditions failed", { status: 412 });

  return new Response("", { status: 201 });
}
