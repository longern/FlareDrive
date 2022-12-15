function notFound() {
  return new Response("Not found", { status: 404 });
}

export async function onRequestPostCreateMultipart(context) {
  const { request, env, params } = context;
  const url = new URL(request.url);

  const path = decodeURIComponent((params.path || []).join("/"));
  const driveid = url.hostname.replace(/\..*/, "");

  if (!env[driveid]) return notFound();

  const customMetadata: Record<string, string> = {};
  if (request.headers.has("fd-thumbnail"))
    customMetadata.thumbnail = request.headers.get("fd-thumbnail");

  const multipartUpload = await env[driveid].createMultipartUpload(path, {
    customMetadata,
  });

  return new Response(
    JSON.stringify({
      key: multipartUpload.key,
      uploadId: multipartUpload.uploadId,
    })
  );
}

export async function onRequestPostCompleteMultipart(context) {
  const { request, env, params } = context;
  const url = new URL(request.url);

  const path = decodeURIComponent((params.path || []).join("/"));
  const driveid = url.hostname.replace(/\..*/, "");

  if (!env[driveid]) return notFound();

  const uploadId = new URLSearchParams(url.search).get("uploadId");
  const multipartUpload = await env[driveid].resumeMultipartUpload(
    path,
    uploadId
  );

  const completeBody = await request.json();

  try {
    const object = await multipartUpload.complete(completeBody.parts);
    return new Response(null, {
      headers: { etag: object.httpEtag },
    });
  } catch (error: any) {
    return new Response(error.message, { status: 400 });
  }
}

export async function onRequestPost(context) {
  const url = new URL(context.request.url);
  const searchParams = new URLSearchParams(url.search);

  if (searchParams.has("uploads")) {
    return onRequestPostCreateMultipart(context);
  }

  if (searchParams.has("uploadId")) {
    return onRequestPostCompleteMultipart(context);
  }

  return new Response("Method not allowed", { status: 405 });
}

export async function onRequestPutMultipart(context) {
  const { request, env, params } = context;
  const url = new URL(request.url);

  const path = decodeURIComponent((params.path || []).join("/"));
  const driveid = url.hostname.replace(/\..*/, "");

  if (!env[driveid]) return notFound();

  const uploadId = new URLSearchParams(url.search).get("uploadId");
  const multipartUpload = await env[driveid].resumeMultipartUpload(
    path,
    uploadId
  );

  const partNumber = parseInt(
    new URLSearchParams(url.search).get("partNumber")
  );
  const uploadedPart = await multipartUpload.uploadPart(
    partNumber,
    request.body
  );

  return new Response(null, {
    headers: {
      "Content-Type": "application/json",
      etag: uploadedPart.etag,
    },
  });
}

export async function onRequestPut(context) {
  const { request, env, params } = context;
  const url = new URL(request.url);

  if (new URLSearchParams(url.search).has("uploadId")) {
    return onRequestPutMultipart(context);
  }

  const path = decodeURIComponent((params.path || []).join("/"));
  const driveid = url.hostname.replace(/\..*/, "");

  if (!env[driveid]) return notFound();

  let content = request.body;
  const customMetadata: Record<string, string> = {};

  if (request.headers.has("x-amz-copy-source")) {
    const sourceName = decodeURIComponent(
      request.headers.get("x-amz-copy-source")
    );
    const source = await env[driveid].get(sourceName);
    content = source.body;
    if (source.customMetadata.thumbnail)
      customMetadata.thumbnail = source.customMetadata.thumbnail;
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
