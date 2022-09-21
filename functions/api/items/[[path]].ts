function notFound() {
  return new Response("Not found", { status: 404 });
}

export async function onRequestPut(context) {
  const { request, env, params } = context;
  const path = decodeURIComponent((params.path || []).join("/"));
  const driveid = new URL(request.url).hostname.replace(/\..*/, "");

  if (!env[driveid]) return notFound();

  let content = request.body;
  const customMetadata: Record<string, string> = {};

  if (request.headers.has("x-amz-copy-source")) {
    const sourceName = decodeURIComponent(request.headers.get("x-amz-copy-source"));
    const source = await env[driveid].get(sourceName);
    content = source.body;
    if (source.customMetadata.thumbnail)
      customMetadata.thumbnail = source.customMetadata.thumbnail
  }

  if (request.headers.has("fd-thumbnail"))
    customMetadata.thumbnail = request.headers.get("fd-thumbnail");

  const obj = await env[driveid].put(path, content, { customMetadata });
  const { key, size, uploaded } = obj;
  return new Response(JSON.stringify({ key, size, uploaded }), {
    headers: { "Content-Type": "application/json" },
  });
}

export async function onRequestDelete(context) {
  const { request, env, params } = context;
  const path = decodeURIComponent((params.path || []).join("/"));
  const driveid = new URL(request.url).hostname.replace(/\..*/, "");

  if (!env[driveid]) return notFound();

  await env[driveid].delete(path);
  return new Response(null, { status: 204 });
}
