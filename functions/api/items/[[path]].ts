function notFound() {
  return new Response("Not found", { status: 404 });
}

export async function onRequestPut(context) {
  const { request, env, params } = context;
  const path = decodeURIComponent((params.path || []).join("/"));
  const driveid = new URL(request.url).hostname.replace(/\..*/, "");

  if (!env[driveid]) return notFound();

  const obj = await env[driveid].put(path, request.body);
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
