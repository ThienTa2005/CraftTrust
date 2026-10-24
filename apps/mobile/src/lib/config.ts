export interface PublicConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
  passportBaseUrl: string;
}

export function readPublicConfig(): { config: PublicConfig | null; missing: string[] } {
  const values = {
    supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL?.trim() ?? "",
    supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY?.trim() ?? "",
    passportBaseUrl: process.env.EXPO_PUBLIC_PASSPORT_BASE_URL?.trim() ?? "",
  };
  const missing = Object.entries(values)
    .filter(([, value]) => !value)
    .map(([key]) => key);
  return { config: missing.length === 0 ? values : null, missing };
}
