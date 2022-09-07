export async function onRequestGet(context) {
  try {
    const { request, env, params } = context;
    const path = decodeURIComponent((params.path || []).join("/"));
    const driveid = new URL(request.url).hostname.replace(/\..*/, "");

    const objList = await env[driveid].list({ prefix: path, delimiter: "/" });
    const objKeys = objList.objects.map((obj) => {
      const { key, size, uploaded } = obj;
      return { key, size, uploaded };
    });
    return new Response(
      JSON.stringify({ value: objKeys, folders: objList.delimitedPrefixes }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (e) {
    return new Response(e.toString(), { status: 500 });
  }
}
