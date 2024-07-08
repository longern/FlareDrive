import { notFound, parseBucketPath } from "@/utils/bucket";
import { handleRequestGet } from "./get";
import { handleRequestPropfind } from "./propfind";
import { RequestHandlerParams } from "./utils";
import { handleRequestMkcol } from "./mkcol";
import { handleRequestPut } from "./put";

async function handleRequestOptions() {
  return new Response(null, {
    headers: { Allow: Object.keys(HANDLERS).join(", ") },
  });
}

async function handleMethodNotAllowed() {
  return new Response(null, { status: 405 });
}

const HANDLERS: Record<
  string,
  (context: RequestHandlerParams) => Promise<Response>
> = {
  PROPFIND: handleRequestPropfind,
  MKCOL: handleRequestMkcol,
  HEAD: handleRequestGet,
  GET: handleRequestGet,
  PUT: handleRequestPut,
  COPY: handleRequestGet,
  MOVE: handleRequestGet,
};

export const onRequest: PagesFunction<{
  WEBDAV_USERNAME: string;
  WEBDAV_PASSWORD: string;
}> = async function (context) {
  const { request, env } = context;
  if (request.method === "OPTIONS") return handleRequestOptions();

  if (!env.WEBDAV_USERNAME || env.WEBDAV_PASSWORD)
    return new Response("WebDAV not configured", { status: 500 });

  const auth = context.request.headers.get("Authorization");
  if (!auth) {
    return new Response("Unauthorized", {
      status: 401,
      headers: { "WWW-Authenticate": `Basic realm="WebDAV"` },
    });
  }
  const expectedAuth = `Basic ${btoa(
    `${env.WEBDAV_USERNAME}:${env.WEBDAV_PASSWORD}`
  )}`;
  if (auth !== expectedAuth)
    return new Response("Unauthorized", { status: 401 });

  const [bucket, path] = parseBucketPath(context);
  if (!bucket) return notFound();

  const method: string = (context.request as Request).method;
  const handler = HANDLERS[method] ?? handleMethodNotAllowed;
  return handler({ bucket, path, request: context.request });
};
