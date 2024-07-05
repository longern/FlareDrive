import { notFound, parseBucketPath } from "@/utils/bucket";

type EventContext = Parameters<PagesFunction>[0];

export async function onRequestPostCreateMultipart(context: EventContext) {
  const [bucket, path] = parseBucketPath(context);
  if (!bucket) return notFound();

  const request: Request = context.request;

  const customMetadata: Record<string, string> = {};
  if (request.headers.has("fd-thumbnail"))
    customMetadata.thumbnail = request.headers.get("fd-thumbnail")!;

  const multipartUpload = await bucket.createMultipartUpload(path, {
    httpMetadata: {
      contentType: request.headers.get("content-type") ?? undefined,
    },
    customMetadata,
  });

  return new Response(
    JSON.stringify({
      key: multipartUpload.key,
      uploadId: multipartUpload.uploadId,
    })
  );
}

export async function onRequestPostCompleteMultipart(context: EventContext) {
  const [bucket, path] = parseBucketPath(context);
  if (!bucket) return notFound();

  const request: Request = context.request;
  const url = new URL(request.url);
  const uploadId = new URLSearchParams(url.search).get("uploadId");
  if (!uploadId) return notFound();
  const multipartUpload = bucket.resumeMultipartUpload(path, uploadId);

  const completeBody: { parts: Array<any> } = await request.json();

  try {
    const object = await multipartUpload.complete(completeBody.parts);
    return new Response(null, {
      headers: { etag: object.httpEtag },
    });
  } catch (error: any) {
    return new Response(error.message, { status: 400 });
  }
}

export const onRequestPost: PagesFunction = async function (context) {
  const url = new URL(context.request.url);
  const searchParams = new URLSearchParams(url.search);

  if (searchParams.has("uploads")) {
    return onRequestPostCreateMultipart(context);
  }

  if (searchParams.has("uploadId")) {
    return onRequestPostCompleteMultipart(context);
  }

  return new Response("Method not allowed", { status: 405 });
};

export async function onRequestPutMultipart(context: EventContext) {
  const [bucket, path] = parseBucketPath(context);
  if (!bucket) return notFound();

  const request: Request = context.request;
  const url = new URL(request.url);

  const uploadId = new URLSearchParams(url.search).get("uploadId");
  if (!uploadId) return notFound();
  const multipartUpload = bucket.resumeMultipartUpload(path, uploadId);

  const partNumberStr = new URLSearchParams(url.search).get("partNumber");
  if (partNumberStr === null)
    return new Response("Invalid part number", {
      status: 400,
    });
  const partNumber = parseInt(partNumberStr);
  const uploadedPart = await multipartUpload.uploadPart(
    partNumber,
    request.body as ReadableStream<Uint8Array>
  );

  return new Response(null, {
    headers: {
      "Content-Type": "application/json",
      etag: uploadedPart.etag,
    },
  });
}

export const onRequestPut: PagesFunction = async function (context) {
  const url = new URL(context.request.url);

  if (new URLSearchParams(url.search).has("uploadId")) {
    return onRequestPutMultipart(context);
  }

  const [bucket, path] = parseBucketPath(context);
  if (!bucket) return notFound();

  const request: Request = context.request;

  let content = request.body;
  const customMetadata: Record<string, string> = {};

  if (request.headers.has("x-amz-copy-source")) {
    const sourceName = decodeURIComponent(
      request.headers.get("x-amz-copy-source")!
    );
    const source = await bucket.get(sourceName);
    if (!source) return notFound();
    content = source.body;
    if (source.customMetadata?.thumbnail)
      customMetadata.thumbnail = source.customMetadata.thumbnail;
  }

  if (request.headers.has("fd-thumbnail"))
    customMetadata.thumbnail = request.headers.get("fd-thumbnail")!;

  const obj = await bucket.put(path, content, {
    httpMetadata: {
      contentType: request.headers.get("content-type") ?? undefined,
    },
    customMetadata,
  });
  const { key, size, uploaded } = obj;
  return new Response(JSON.stringify({ key, size, uploaded }), {
    headers: { "Content-Type": "application/json" },
  });
};

export const onRequestDelete: PagesFunction = async function (context) {
  const [bucket, path] = parseBucketPath(context);
  if (!bucket) return notFound();

  await bucket.delete(path);
  return new Response(null, { status: 204 });
};
