import { RequestHandlerParams, ROOT_OBJECT } from "./utils";

async function handleRequestPutMultipart({
  bucket,
  path,
  request,
}: RequestHandlerParams) {
  const url = new URL(request.url);

  const uploadId = new URLSearchParams(url.search).get("uploadId");
  const partNumberStr = new URLSearchParams(url.search).get("partNumber");
  if (!uploadId || !partNumberStr || !request.body)
    return new Response("Bad Request", { status: 400 });
  const multipartUpload = bucket.resumeMultipartUpload(path, uploadId);

  const partNumber = parseInt(partNumberStr);
  const uploadedPart = await multipartUpload.uploadPart(
    partNumber,
    request.body
  );

  return new Response(null, {
    headers: { "Content-Type": "application/json", etag: uploadedPart.etag },
  });
}


async function handleStreamedUpload({
  bucket,
  path,
  request,
}: RequestHandlerParams) {
  const contentLength = request.headers.get("content-length");
  const transferEncoding = request.headers.get("transfer-encoding");
  
  if (transferEncoding === "chunked" || !contentLength) {
    // 处理 chunked transfer encoding
    const reader = request.body?.getReader();
    if (!reader) {
      return new Response("Bad Request", { status: 400 });
    }
    
    // 创建可写流来处理分块数据
    const chunks: Uint8Array[] = [];
    
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
      }
      
      // 合并所有分块
      const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
      const combined = new Uint8Array(totalLength);
      let offset = 0;
      
      for (const chunk of chunks) {
        combined.set(chunk, offset);
        offset += chunk.length;
      }
      
      // 上传到 R2
      const thumbnail = request.headers.get("fd-thumbnail");
      const customMetadata = thumbnail ? { thumbnail } : undefined;
      
      const result = await bucket.put(path, combined, {
        onlyIf: request.headers,
        httpMetadata: request.headers,
        customMetadata,
      });
      
      if (!result) return new Response("Preconditions failed", { status: 412 });
      return new Response("", { status: 201 });
      
    } catch (error) {
      console.error("Stream upload error:", error);
      return new Response("Internal Server Error", { status: 500 });
    }
  }
  
  // 回退到常规上传
  return handleRegularUpload({ bucket, path, request });
}

export async function handleRequestPut({
  bucket,
  path,
  request,
}: RequestHandlerParams) {
  const searchParams = new URLSearchParams(new URL(request.url).search);
  if (searchParams.has("uploadId")) {
    return handleRequestPutMultipart({ bucket, path, request });
  }

  if (request.url.endsWith("/")) {
    return new Response("Method Not Allowed", { status: 405 });
  }

  // Check if the parent directory exists
  if (!path.startsWith("_$flaredrive$/")) {
    const parentPath = path.replace(/(\/|^)[^/]*$/, "");
    const parentDir =
      parentPath === "" ? ROOT_OBJECT : await bucket.head(parentPath);
    if (parentDir === null) return new Response("Conflict", { status: 409 });
  }

  // 检查是否为流式上传
  const transferEncoding = request.headers.get("transfer-encoding");
  if (transferEncoding === "chunked") {
    return handleStreamedUpload({ bucket, path, request });
  }
  
  return handleRegularUpload({ bucket, path, request });
}

async function handleRegularUpload({
  bucket,
  path,
  request,
}: RequestHandlerParams) {
  const thumbnail = request.headers.get("fd-thumbnail");
  const customMetadata = thumbnail ? { thumbnail } : undefined;

  const result = await bucket.put(path, request.body, {
    onlyIf: request.headers,
    httpMetadata: request.headers,
    customMetadata,
  });

  if (!result) return new Response("Preconditions failed", { status: 412 });
  return new Response("", { status: 201 });
}