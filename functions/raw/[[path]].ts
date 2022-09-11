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

  const headers = new Headers();
  obj.writeHttpMetadata(headers);
  if (path.startsWith("_$flaredrive$/thumbnails/"))
    headers.set("Cache-Control", "max-age=31536000");

  return new Response(obj.body, { headers });
}
