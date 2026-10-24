import { NextResponse } from "next/server";
import { createRequestSupabase } from "@/lib/supabase";
export async function GET(_request: Request, context: { params: Promise<{id:string}> }) {
 const { id }=await context.params;
 const db=await createRequestSupabase();
 const headers={"Cache-Control":"private, no-store"};
 if(!db || !/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({error:"Model unavailable"},{status:404,headers});
 const {data}=await db.from("product_model_assets").select("storage_path").eq("id",id).maybeSingle();
 if(!data) return NextResponse.json({error:"Model unavailable"},{status:404,headers});
 const {data:asset}=await db.storage.from("product-models").createSignedUrl(data.storage_path,60);
 if(!asset) return NextResponse.json({error:"Model unavailable"},{status:404,headers});
 return NextResponse.redirect(asset.signedUrl,{status:307,headers});
}
