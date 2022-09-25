import { S3Client } from "../../utils/s3";

export async function onRequestGet(context) {
  try {
    const { env } = context;
    const client = new S3Client(
      env.AWS_ACCESS_KEY_ID,
      env.AWS_SECRET_ACCESS_KEY
    );
    const response = await client.s3_fetch(
      `https://${env.CF_ACCOUNT_ID}.r2.cloudflarestorage.com/`
    );
    const responseText = await response.text();
    return new Response(responseText, {
      headers: { "content-type": "text/xml" },
    });
  } catch (e) {
    return new Response(e.toString(), { status: 500 });
  }
}
