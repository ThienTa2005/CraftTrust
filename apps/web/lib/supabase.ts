import "server-only";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

const url = () => process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = () => process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

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
