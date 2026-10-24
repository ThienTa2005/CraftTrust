import { NextResponse } from "next/server";
import { createRequestSupabase } from "@/lib/supabase";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const requestedNext = url.searchParams.get("next");
  const next =
    requestedNext?.startsWith("/") && !requestedNext.startsWith("//")
      ? requestedNext
      : "/marketplace";
  if (code) {
    const supabase = await createRequestSupabase();
    await supabase?.auth.exchangeCodeForSession(code);
  }
  return NextResponse.redirect(new URL(next, url.origin));
}
