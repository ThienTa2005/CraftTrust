import { createBrowserClient } from "@supabase/ssr";

function sanitizeSupabaseUrl(rawUrl: string | undefined): string | undefined {
  if (!rawUrl) return undefined;
  let cleaned = rawUrl.trim();
  cleaned = cleaned.replace(/\/(rest|auth|storage)\/v\d+\/?$/i, "");
  cleaned = cleaned.replace(/\/+$/, "");
  return cleaned;
}

export function createBrowserSupabase() {
  const rawUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const url = sanitizeSupabaseUrl(rawUrl);
  const anonKey = (
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    ""
  ).trim();
  if (!url || !anonKey)
    throw new Error("Supabase public environment variables are not configured.");
  return createBrowserClient(url, anonKey);
}
