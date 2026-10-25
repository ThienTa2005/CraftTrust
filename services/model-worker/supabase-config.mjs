// supabase-js appends /rest/v1 itself. Accept copied API base URLs too.
export function normalizeSupabaseUrl(value) {
  if (!value?.trim()) return undefined;
  let url;
  try {
    url = new URL(value.trim());
  } catch {
    throw new Error("SUPABASE_URL must be the project URL, e.g. https://<project>.supabase.co");
  }
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password || url.search || url.hash) {
    throw new Error("SUPABASE_URL must be an HTTP(S) project URL without credentials, query parameters or fragments.");
  }
  const pathname = url.pathname.replace(/\/+$/, "");
  if (pathname && !/^\/(rest|auth|storage)\/v\d+$/i.test(pathname)) {
    throw new Error("SUPABASE_URL must be the project root URL, without a table, RPC or dashboard path.");
  }
  return url.origin;
}
