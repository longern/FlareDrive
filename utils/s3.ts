function arrayBufferToHex(arrayBuffer: ArrayBuffer) {
  return [...new Uint8Array(arrayBuffer)]
    .map((x) => x.toString(16).padStart(2, "0"))
    .join("");
}

async function hmacSHA256(secret: ArrayBuffer, message: string | ArrayBuffer) {
  if (typeof message === "string") message = new TextEncoder().encode(message);
  const key = await crypto.subtle.importKey(
    "raw",
    secret,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, message);
  return signature;
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
    const canonicalQueryString = [...url.searchParams]
      .map(
        ([key, value]) =>
          encodeURIComponent(key) + "=" + encodeURIComponent(value)
      )
      .join("&");
    const hashedPayload = "UNSIGNED-PAYLOAD";
    const headers = new Headers(init.headers);
    const datetime = new Date().toISOString().replace(/-|:|\.\d+/g, "");
    headers.set("x-amz-date", datetime);
    headers.set("x-amz-content-sha256", hashedPayload);
    headers.set("host", url.host);
    const signedHeaderKeys = [...headers.keys()].filter(
      (header) =>
        header === "host" ||
        header === "content-type" ||
        header.startsWith("x-amz-")
    );
    const canonicalHeaders = signedHeaderKeys
      .map((key) => `${key}:${headers.get(key)}\n`)
      .join("");
    const signedHeaders = signedHeaderKeys.join(";");
    const canonicalUri = encodeURIComponent(objectKey)
      .replaceAll("%2F", "/")
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
