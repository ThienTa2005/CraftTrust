import { NextResponse } from "next/server";
import { createRequestSupabase } from "@/lib/supabase";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const requestedNext = url.searchParams.get("next");
  const isSafeNext = Boolean(requestedNext && requestedNext.startsWith("/") && !requestedNext.startsWith("//"));

  let destination: string = isSafeNext && requestedNext ? requestedNext : "/marketplace";

  if (code) {
    const supabase = await createRequestSupabase();
    if (supabase) {
      const { data: authData } = await supabase.auth.exchangeCodeForSession(code);
      if (authData?.user) {
        const { data: roleRows } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", authData.user.id);
        const roles = (roleRows ?? []).map((r) => r.role);
        const isAdmin = roles.includes("admin") || roles.includes("verifier");
        const isSeller = roles.includes("seller") || roles.includes("artisan");

        if (isAdmin) {
          destination = isSafeNext && requestedNext && requestedNext.startsWith("/admin") ? requestedNext : "/admin";
        } else if (isSeller) {
          destination = isSafeNext && requestedNext && requestedNext.startsWith("/seller") ? requestedNext : "/seller";
        } else {
          destination = isSafeNext && requestedNext && !requestedNext.startsWith("/admin") && !requestedNext.startsWith("/seller")
            ? requestedNext
            : "/marketplace";
        }
      }
    }
  }

  return NextResponse.redirect(new URL(destination, url.origin));
}
