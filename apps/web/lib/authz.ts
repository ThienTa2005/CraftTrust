import { createRequestSupabase } from "./supabase";

export type AppRole = "customer"|"artisan"|"seller"|"verifier"|"admin";

export async function getAuthorizedUser(allowed: AppRole[]) {
  const supabase = await createRequestSupabase();
  if (!supabase) return { supabase:null, user:null, roles:[] as AppRole[], reason:"Supabase is not configured." };
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { supabase, user:null, roles:[] as AppRole[], reason:"Sign in is required." };
  const { data, error } = await supabase.from("user_roles").select("role").eq("user_id", auth.user.id);
  if (error) return { supabase, user:auth.user, roles:[] as AppRole[], reason:error.message };
  const roles = (data ?? []).map((row) => row.role as AppRole);
  if (!roles.some((role) => allowed.includes(role))) return { supabase, user:auth.user, roles, reason:"Your account does not have access to this workspace." };
  return { supabase, user:auth.user, roles, reason:null };
}
