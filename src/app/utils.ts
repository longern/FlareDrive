export function humanReadableSize(size: number) {
  const units = ["B", "KB", "MB", "GB", "TB"];
  let i = 0;
  while (size >= 1024) {
    size /= 1024;
    i++;
  }
  return `${size.toFixed(1)} ${units[i]}`;
}

// Encode each directory segment while preserving slash separators
function encodePathSegments(path: string) {
  return path.split("/").map(encodeURIComponent).join("/");
}

// Keep directory keys in the same shape used by WebDAV browsing state
function normalizeDirectoryPath(path: string) {
  const normalizedPath = path.replace(/^\/+/, "");
  if (!normalizedPath) return "";
  return normalizedPath.endsWith("/") ? normalizedPath : `${normalizedPath}/`;
}

// Convert a directory key into the app hash route
export function encodeDirectoryHash(cwd: string) {
  return `#/${encodePathSegments(normalizeDirectoryPath(cwd))}`;
}

// Convert the app hash route back into a directory key
export function decodeDirectoryHash(hash: string) {
  if (!hash || hash === "#" || !hash.startsWith("#/")) return "";

  try {
    return normalizeDirectoryPath(
      hash
        .slice(2)
        .split("/")
        .map((segment) => decodeURIComponent(segment))
        .join("/")
    );
  } catch {
    return "";
  }
}
