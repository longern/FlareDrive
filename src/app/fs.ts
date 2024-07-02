export async function copyPaste(source: string, target: string) {
  const uploadUrl = `/api/write/items/${target}`;
  await fetch(uploadUrl, {
    method: "PUT",
    headers: { "x-amz-copy-source": encodeURIComponent(source) },
  });
}

export async function createFolder(cwd: string) {
  try {
    const folderName = window.prompt("Folder name");
    if (!folderName) return;
    const uploadUrl = `/api/write/items/${cwd}${folderName}/_$folder$`;
    await fetch(uploadUrl, { method: "PUT" });
  } catch (error) {
    fetch("/api/write/")
      .then((value) => {
        if (value.redirected) window.location.href = value.url;
      })
      .catch(() => {});
    console.log(`Create folder failed`);
  }
}
