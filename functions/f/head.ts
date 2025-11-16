import { notFound } from "./utils";
import { RequestHandlerParams } from "./utils";

export async function handleRequestHead({
  bucket,
  path,
  request,
}: RequestHandlerParams) {
  if (request.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "HEAD, OPTIONS",
        "Access-Control-Allow-Headers": "*",
      },
    });
  }

  const obj = await bucket.head(path);
  if (obj === null) return notFound();

  const headers = new Headers();
  obj.writeHttpMetadata(headers);

  headers.set("Access-Control-Allow-Origin", "*");
  headers.set("Access-Control-Allow-Methods", "HEAD, OPTIONS");
  headers.set("Access-Control-Allow-Headers", "*");

  return new Response(null, { headers });
}
