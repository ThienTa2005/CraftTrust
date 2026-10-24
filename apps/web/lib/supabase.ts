import "server-only";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

function sanitizeSupabaseUrl(rawUrl: string | undefined): string | null {
  if (!rawUrl) return null;
  let cleaned = rawUrl.trim();
  cleaned = cleaned.replace(/\/(rest|auth|storage)\/v\d+\/?$/i, "");
  cleaned = cleaned.replace(/\/+$/, "");
  return cleaned;
}

const url = () =>
  sanitizeSupabaseUrl(
    process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL,
  );
const anonKey = () =>
  (
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    ""
  ).trim();

export function createPublicSupabase() {
  if (!url() || !anonKey()) return null;
  return createClient(url()!, anonKey()!, { auth: { persistSession: false } });
}

export async function createRequestSupabase() {
  if (!url() || !anonKey()) return null;
  const store = await cookies();
  return createServerClient(url()!, anonKey()!, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (updates) => {
        try {
          updates.forEach(({ name, value, options }) => store.set(name, value, options));
        } catch {
          // Server Components cannot mutate cookies. Route handlers and actions can.
        }
      }
    }
  });
}
