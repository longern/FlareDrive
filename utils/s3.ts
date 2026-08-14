function arrayBufferToHex(arrayBuffer: BufferSource) {
  return [...new Uint8Array(arrayBuffer as ArrayBuffer)]
    .map((x) => x.toString(16).padStart(2, "0"))
    .join("");
}

async function hmacSHA256(secret: BufferSource | string, message: BufferSource | string) {
  const keyData: BufferSource =
    typeof secret === "string" ? new TextEncoder().encode(secret) : secret;
  const messageData: BufferSource =
    typeof message === "string" ? new TextEncoder().encode(message) : message;
  const key = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  return crypto.subtle.sign("HMAC", key, messageData);
}

export class S3Client {
  accessKeyId: string;
  secretAccessKey: string;
  region: string;

  constructor(accessKeyId: string, secretAccessKey: string, region?: string) {
    this.accessKeyId = accessKeyId;
    this.secretAccessKey = secretAccessKey;
    this.region = region || "auto";
  }

  public async s3_fetch(input: string, init?: RequestInit) {
    init = init || {};
    const url = new URL(input);
    const objectKey = decodeURI(url.pathname);
    const method = init.method || "GET";
    // url.search is already percent-encoded; echoing it preserves the exact
    // query used for signing without relying on iterable URLSearchParams.
    const canonicalQueryString = url.search.replace(/^\?/, "");
    const hashedPayload = "UNSIGNED-PAYLOAD";
    const headers = new Headers(init.headers);
    const datetime = new Date().toISOString().replace(/-|:|\.\d+/g, "");
    headers.set("x-amz-date", datetime);
    headers.set("x-amz-content-sha256", hashedPayload);
    headers.set("host", url.host);
    const signedHeaderKeys: string[] = [];
    headers.forEach((_value, header) => {
      if (
        header === "host" ||
        header === "content-type" ||
        header.startsWith("x-amz-")
      )
        signedHeaderKeys.push(header);
    });
    const canonicalHeaders = signedHeaderKeys
      .map((key) => `${key}:${headers.get(key)}\n`)
      .join("");
    const signedHeaders = signedHeaderKeys.join(";");
    const canonicalUri = encodeURIComponent(objectKey)
      .replace(/%2F/g, "/")
      .replace(/[!*'()]/g, function (c) {
        return "%" + c.charCodeAt(0).toString(16).toUpperCase();
      });
    const canonicalRequest = [
      method,
      canonicalUri,
      canonicalQueryString,
      canonicalHeaders,
      signedHeaders,
      hashedPayload,
    ].join("\n");

    const hashedRequest = arrayBufferToHex(
      await crypto.subtle.digest(
        "SHA-256",
        new TextEncoder().encode(canonicalRequest)
      )
    );
    const scope = `${datetime.slice(0, 8)}/${this.region}/s3/aws4_request`;
    const stringToSign = [
      "AWS4-HMAC-SHA256",
      datetime,
      scope,
      hashedRequest,
    ].join("\n");

    const dateKey = await hmacSHA256(
      new TextEncoder().encode("AWS4" + this.secretAccessKey),
      datetime.slice(0, 8)
    );
    const dateRegionKey = await hmacSHA256(dateKey, this.region);
    const dateRegionServiceKey = await hmacSHA256(dateRegionKey, "s3");
    const signingKey = await hmacSHA256(dateRegionServiceKey, "aws4_request");
    const signature = arrayBufferToHex(
      await hmacSHA256(signingKey, stringToSign)
    );

    const credential = `${this.accessKeyId}/${scope}`;
    const authorizationString = `AWS4-HMAC-SHA256 Credential=${credential},SignedHeaders=${signedHeaders},Signature=${signature}`;

    headers.set("Authorization", authorizationString);
    init.headers = headers;
    return fetch(input, init);
  }
}
