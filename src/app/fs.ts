async function copyPaste(source: string, target: string) {
  const uploadUrl = `/api/write/items/${target}`;
  await fetch(uploadUrl, {
    method: "PUT",
    headers: { "x-amz-copy-source": encodeURIComponent(source) },
  });
}
