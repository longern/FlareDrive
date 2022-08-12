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
  await env[driveid].put(path, request.body);
  return new Response(null, { status: 204 });
}
