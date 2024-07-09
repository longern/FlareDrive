import { notFound } from "@/utils/bucket";
import { listAll, RequestHandlerParams, WEBDAV_ENDPOINT } from "./utils";

export async function handleRequestCopy({
  bucket,
  path,
  request,
}: RequestHandlerParams) {
  const dontOverwrite = request.headers.get("Overwrite") === "F";
  const destinationHeader = request.headers.get("Destination");
  if (destinationHeader === null)
    return new Response("Bad Request", { status: 400 });

  const src = await bucket.get(path);
  if (src === null) return notFound();

  const destPathname = new URL(destinationHeader).pathname.replace(/\/$/, "");
  if (!destPathname.startsWith(WEBDAV_ENDPOINT))
    return new Response("Bad Request", { status: 400 });
  const destination = destPathname.slice(WEBDAV_ENDPOINT.length);

  // Check if the destination already exists
  const destinationExists = await bucket.head(destination);
  if (dontOverwrite && destinationExists)
    return new Response("Precondition Failed", { status: 412 });
  await bucket.put(destination, src.body, {
    httpMetadata: src.httpMetadata,
    customMetadata: src.customMetadata,
  });

  const isDirectory =
    src.httpMetadata?.contentType === "application/x-directory";
  if (isDirectory) {
    const depth = request.headers.get("Depth") ?? "infinity";
    switch (depth) {
      case "0":
        break;
      case "infinity": {
        const prefix = path + "/";
        const copy = async (object: R2Object) => {
          const target = `${destination}/${object.key.slice(prefix.length)}`;
          const src = await bucket.get(object.key);
          if (src === null) return;
          await bucket.put(target, src.body, {
            httpMetadata: object.httpMetadata,
            customMetadata: object.customMetadata,
          });
        };
        const promise_array = [];
        for await (const object of listAll(bucket, prefix, true)) {
          promise_array.push(copy(object));
        }
        await Promise.all(promise_array);
      }
      default:
        return new Response("Bad Request", { status: 400 });
    }
  }

  if (destinationExists) {
    return new Response(null, { status: 204 });
  } else {
    return new Response("", { status: 201 });
  }
}
