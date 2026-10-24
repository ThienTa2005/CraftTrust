import { NextResponse } from "next/server";
import { createRequestSupabase } from "@/lib/supabase";

export async function GET(request:Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  if (code) {
    const supabase = await createRequestSupabase();
    await supabase?.auth.exchangeCodeForSession(code);
  }
  return NextResponse.redirect(new URL("/marketplace",url.origin));
}
