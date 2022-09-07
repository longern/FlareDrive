function notFound() {
  return new Response("Not found", { status: 404 });
}

export async function onRequestGet(context) {
  const { request, env, params } = context;
  const path = decodeURIComponent((params.path || []).join("/"));
  const driveid = new URL(request.url).hostname.replace(/\..*/, "");

  if (!env[driveid]) return notFound();

  const obj = await env[driveid].get(path);
  if (obj === null) return notFound();
  return new Response(obj.body, {
    headers: { "Content-Type": obj.httpMetadata.contentType },
  });
}
