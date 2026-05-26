import { notFound } from "./utils";
import { RequestHandlerParams } from "./utils";

export async function handleRequestPostCreateMultipart({
  bucket,
  path,
  request,
}: RequestHandlerParams) {
  const thumbnail = request.headers.get("fd-thumbnail");
  const customMetadata = thumbnail ? { thumbnail } : undefined;

  const multipartUpload = await bucket.createMultipartUpload(path, {
    httpMetadata: request.headers,
    customMetadata,
  });

  const { key, uploadId } = multipartUpload;
  return new Response(JSON.stringify({ key, uploadId }), {
    headers: { "Content-Type": "application/json" }
  });
}

export async function handleRequestPostCompleteMultipart({
  bucket,
  path,
  request,
}: RequestHandlerParams) {
  const url = new URL(request.url);
  const uploadId = new URLSearchParams(url.search).get("uploadId");
  if (!uploadId) return notFound();
  
  const multipartUpload = bucket.resumeMultipartUpload(path, uploadId);

  const completeBody: { parts: Array<any> } = await request.json();

  try {
    const object = await multipartUpload.complete(completeBody.parts);
    return new Response(null, {
      headers: { 
        etag: object.httpEtag,
        "Content-Type": "application/json"
      },
    });
  } catch (error: any) {
    return new Response(error.message, { status: 400 });
  }
}

// 新增：处理流式分片上传
export async function handleRequestPostStreamChunk({
  bucket,
  path,
  request,
}: RequestHandlerParams) {
  const url = new URL(request.url);
  const uploadId = url.searchParams.get("uploadId");
  const partNumber = url.searchParams.get("partNumber");
  
  if (!uploadId || !partNumber) {
    return new Response("Bad Request", { status: 400 });
  }
  
  const transferEncoding = request.headers.get("transfer-encoding");
  
  if (transferEncoding === "chunked") {
    // 处理流式分片数据
    const reader = request.body?.getReader();
    if (!reader) {
      return new Response("Bad Request", { status: 400 });
    }
    
    const chunks: Uint8Array[] = [];
    
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
      }
      
      const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
      const combined = new Uint8Array(totalLength);
      let offset = 0;
      
      for (const chunk of chunks) {
        combined.set(chunk, offset);
        offset += chunk.length;
      }
      
      const multipartUpload = bucket.resumeMultipartUpload(path, uploadId);
      const uploadedPart = await multipartUpload.uploadPart(
        parseInt(partNumber),
        combined
      );
      
      return new Response(null, {
        headers: { 
          "Content-Type": "application/json", 
          etag: uploadedPart.etag 
        },
      });
      
    } catch (error) {
      console.error("Stream chunk upload error:", error);
      return new Response("Internal Server Error", { status: 500 });
    }
  }
  
  // 回退到常规分片上传
  const multipartUpload = bucket.resumeMultipartUpload(path, uploadId);
  const uploadedPart = await multipartUpload.uploadPart(
    parseInt(partNumber),
    request.body
  );
  
  return new Response(null, {
    headers: { "Content-Type": "application/json", etag: uploadedPart.etag },
  });
}

export const handleRequestPost = async function ({
  bucket,
  path,
  request,
}: RequestHandlerParams) {
  const url = new URL(request.url);
  const searchParams = new URLSearchParams(url.search);

  if (searchParams.has("uploads")) {
    return handleRequestPostCreateMultipart({ bucket, path, request });
  }

  if (searchParams.has("uploadId")) {
    if (searchParams.has("partNumber")) {
      return handleRequestPostStreamChunk({ bucket, path, request });
    }
    return handleRequestPostCompleteMultipart({ bucket, path, request });
  }

  return new Response("Method not allowed", { status: 405 });
};