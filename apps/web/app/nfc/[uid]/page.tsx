import { notFound, redirect } from "next/navigation";
import { createPublicSupabase } from "@/lib/supabase";

export default async function NfcResolver({ params }: { params:Promise<{uid:string}> }) {
  const { uid } = await params;
  const supabase = createPublicSupabase();
  if (!supabase) notFound();
  const { data, error } = await supabase.rpc("resolve_nfc_tag", { p_raw_uid:uid });
  if (error || !data) notFound();
  const row:any = Array.isArray(data) ? data[0] : data;
  if (row?.target_url) redirect(row.target_url);
  if (row?.public_id) redirect(`/passport/${encodeURIComponent(row.public_id)}`);
  notFound();
}
