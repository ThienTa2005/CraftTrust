import { notFound, redirect } from "next/navigation";
import { createPublicSupabase } from "@/lib/supabase";

export default async function QrResolver({ params }: { params:Promise<{token:string}> }) {
  const { token } = await params;
  const supabase = createPublicSupabase();
  if (!supabase) notFound();
  const { data, error } = await supabase.rpc("resolve_qr_identifier", { p_token:token });
  if (error || !data) notFound();
  const row:any = Array.isArray(data) ? data[0] : data;
  if (!row?.public_id) notFound();
  redirect(`/passport/${encodeURIComponent(row.public_id)}`);
}
