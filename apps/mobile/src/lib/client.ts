import "react-native-url-polyfill/auto";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createSupabaseCraftTrustClient, type CraftTrustClient } from "@craft-trust/api-client";
import type { Database } from "@craft-trust/contracts";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { PublicConfig } from "./config";

export interface ClientBundle {
  supabase: SupabaseClient;
  api: CraftTrustClient;
}

export function createClientBundle(config: PublicConfig): ClientBundle {
  const supabase = createClient<Database>(config.supabaseUrl, config.supabaseAnonKey, {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  });
  return { supabase, api: createSupabaseCraftTrustClient(supabase) };
}
