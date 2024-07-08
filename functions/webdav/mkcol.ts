import { RequestHandlerParams } from "./utils";

export async function handleRequestMkcol({
  bucket,
  path,
}: RequestHandlerParams) {
  // Check if the resource already exists
  let resource = await bucket.head(path);
  if (resource !== null) {
    return new Response("Method Not Allowed", { status: 405 });
  }

  // Check if the parent directory exists
  let parent_dir = path.replace(/(\/|^)[^/]*$/, "");

  if (parent_dir !== "" && !(await bucket.head(parent_dir))) {
    return new Response("Conflict", { status: 409 });
  }

  await bucket.put(path, "", {
    httpMetadata: { contentType: "application/x-directory" },
  });

  return new Response("Created", { status: 201 });
}
