import { RequestHandlerParams } from "./utils";
import { handleRequestCopy } from "./copy";
import { handleRequestDelete } from "./delete";

export async function handleRequestMove({
  bucket,
  path,
  request,
}: RequestHandlerParams) {
  const response = await handleRequestCopy({ bucket, path, request });
  if (response.status >= 400) return response;
  return handleRequestDelete({ bucket, path, request });
}
