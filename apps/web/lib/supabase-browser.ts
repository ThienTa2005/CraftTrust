import { createBrowserClient } from "@supabase/ssr";

export function createBrowserSupabase() {
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const anonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !anonKey)
    throw new Error("Supabase public environment variables are not configured.");
  return createBrowserClient(url, anonKey);
}
