import { S3Client } from "@/utils/s3";

export async function onRequest(context) {
  const { request, env } = context;
  const driveid = new URL(request.url).hostname.replace(/\..*/, "");

  const client = new S3Client(env.AWS_ACCESS_KEY_ID, env.AWS_SECRET_ACCESS_KEY);
  const forwardUrl = request.url.replace(
    /.*\/api\/s3\//,
    `https://${env.CF_ACCOUNT_ID}.r2.cloudflarestorage.com/${driveid}/`
  );
  return client.s3_fetch(forwardUrl, {
    method: request.method,
    body: request.body,
  });
}
