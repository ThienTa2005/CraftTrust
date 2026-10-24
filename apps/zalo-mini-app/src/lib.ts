import { createSupabaseCraftTrustClient, type CraftTrustClient } from "@craft-trust/api-client";
import type { Database } from "@craft-trust/contracts";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export interface PublicConfig { supabaseUrl: string; supabaseAnonKey: string; passportBaseUrl: string; zaloAppId: string }
export interface Bundle { supabase: SupabaseClient; api: CraftTrustClient }

export function readConfig(env: ImportMetaEnv = import.meta.env): { config: PublicConfig | null; missing: string[] } {
  const values = { supabaseUrl: env.VITE_SUPABASE_URL?.trim() ?? "", supabaseAnonKey: env.VITE_SUPABASE_ANON_KEY?.trim() ?? "", passportBaseUrl: env.VITE_PASSPORT_BASE_URL?.trim() ?? "", zaloAppId: env.VITE_ZALO_APP_ID?.trim() ?? "" };
  const required = ["supabaseUrl", "supabaseAnonKey", "passportBaseUrl"] as const;
  const missing = required.filter((key) => !values[key]);
  return { config: missing.length ? null : values, missing };
}

export function createBundle(config: PublicConfig): Bundle {
  const supabase = createClient<Database>(config.supabaseUrl, config.supabaseAnonKey, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false } });
  return { supabase, api: createSupabaseCraftTrustClient(supabase) };
}

export const record = (value: unknown): Record<string, unknown> => value !== null && typeof value === "object" ? value as Record<string, unknown> : {};
export const rows = (value: unknown): unknown[] => Array.isArray(value) ? value : Array.isArray(record(value).data) ? record(value).data as unknown[] : [];
export const text = (value: unknown, fallback = ""): string => typeof value === "string" ? value : fallback;
export const number = (value: unknown): number => typeof value === "number" && Number.isFinite(value) ? value : 0;
export const money = (value: number) => new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(value);
export function identifier(raw: string) { const input = raw.trim(); try { return new URL(input).pathname.split("/").filter(Boolean).at(-1) ?? ""; } catch { return input; } }
