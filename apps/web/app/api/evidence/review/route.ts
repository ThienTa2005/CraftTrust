import { NextResponse } from "next/server";
import { z } from "zod";
import { createRequestSupabase } from "@/lib/supabase";

const schema = z.object({ evidenceId:z.string().uuid(), decision:z.enum(["approved","rejected"]), notes:z.string().min(3).max(1000) });
export async function POST(request:Request) {
  const input=schema.safeParse(await request.json().catch(()=>null));
  if(!input.success) return NextResponse.json({error:"Invalid review input",issues:input.error.flatten()},{status:400});
  const supabase=await createRequestSupabase();
  if(!supabase) return NextResponse.json({error:"Supabase is not configured."},{status:503});
  const {data:auth}=await supabase.auth.getUser();
  if(!auth.user) return NextResponse.json({error:"Sign in required."},{status:401});
  const {data,error}=await supabase.rpc("review_evidence",{p_evidence_id:input.data.evidenceId,p_decision:input.data.decision,p_notes:input.data.notes});
  if(error) return NextResponse.json({error:error.message},{status:error.code === "42501" ? 403 : 400});
  return NextResponse.json({review:data});
}
