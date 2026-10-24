import { NextResponse } from "next/server";
import { createPublicSupabase } from "@/lib/supabase";
export async function GET(_request:Request,context:{params:Promise<{path:string[]}>}) {
 const {path}=await context.params;
 const [bucket,...parts]=path;
 if(bucket!=="product-assets" || parts.some(p=>p===".." || p===".") || !/\.(png|jpe?g|webp)$/i.test(parts.join("/"))) return new NextResponse(null,{status:404});
 const db=createPublicSupabase();
 const result=await db?.storage.from(bucket).createSignedUrl(parts.join("/"),300);
 if(!result?.data) return new NextResponse(null,{status:404});
 return NextResponse.redirect(result.data.signedUrl,{status:307,headers:{"Cache-Control":"private, no-store"}});
}
