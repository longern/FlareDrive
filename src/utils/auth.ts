export const AUTH_KEY = "flaredrive_auth";

// btoa fails on characters outside Latin-1 (e.g. non-ASCII passwords).
// Round-trip through TextEncoder so any Unicode credential encodes safely.
export function b64EncodeUnicode(s: string): string {
  const bytes = new TextEncoder().encode(s);
  let bin = "";
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin);
}

export function readCredential(): string | null {
  return localStorage.getItem(AUTH_KEY);
}

export function writeCredential(username: string, password: string): string {
  const basic = b64EncodeUnicode(`${username}:${password}`);
  localStorage.setItem(AUTH_KEY, basic);
  return basic;
}

export function clearCredential() {
  localStorage.removeItem(AUTH_KEY);
}

export function getAuthHeaders(): Record<string, string> {
  const credential = readCredential();
  return credential ? { Authorization: `Basic ${credential}` } : {};
}
