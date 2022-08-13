interface Params {
  driveid: string;
  itempath: Array<string>;
}

export async function onRequestGet(context) {
  try {
    const { env, params } = context;
    const { driveid, itempath } = <Params>params;

    const path = decodeURIComponent(
      (itempath || []).join("/").replace(/:$/, "")
    );
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
