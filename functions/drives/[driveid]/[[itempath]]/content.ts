function notFound() {
  return new Response("Not found", { status: 404 });
}

interface Params {
  driveid: string;
  itempath: Array<string>;
}

export async function onRequestGet(context) {
  const { env, params } = context;
  const { driveid, itempath } = <Params>params;

  if (!env[driveid]) return notFound();

  const path = decodeURIComponent(itempath.join("/").replace(/:$/, ""));
  const obj = await env[driveid].get(path);
  if (obj === null) return notFound();
  return new Response(obj.body);
}

export async function onRequestPut(context) {
  const { request, env, params } = context;
  const { driveid, itempath } = <Params>params;

  if (!env[driveid]) return notFound();

  const path = decodeURIComponent(itempath.join("/").replace(/:$/, ""));
  const obj = await env[driveid].put(path, request.body);
  const { key, size, uploaded } = obj;
  return new Response(JSON.stringify({ key, size, uploaded }), {
    headers: { "Content-Type": "application/json" }
  });
}

export async function onRequestDelete(context) {
  const { env, params } = context;
  const { driveid, itempath } = <Params>params;

  if (!env[driveid]) return notFound();

  const path = decodeURIComponent(itempath.join("/").replace(/:$/, ""));
  await env[driveid].delete(path);
  return new Response(null, { status: 204 });
}
