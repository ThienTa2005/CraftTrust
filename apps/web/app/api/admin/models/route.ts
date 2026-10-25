import { NextResponse } from "next/server";
import { getAuthorizedUser } from "@/lib/authz";
import { validateExperienceGlb } from "@/lib/experiences";
import { modelConfigSchema } from "@/lib/model-config";
export async function GET(request:Request) {
 const auth=await getAuthorizedUser(["admin"]);
 if(auth.reason || !auth.supabase) return NextResponse.json({error:auth.reason},{status:auth.user?403:401});
 const productId=new URL(request.url).searchParams.get("productId");
 let query=auth.supabase.from("product_model_assets").select("*").order("created_at",{ascending:false});
 if(productId) query=query.eq("product_id",productId);
 const {data,error}=await query.limit(200);
 return NextResponse.json({ assets: data ?? [] }, { status: 200 });
}
export async function POST(request:Request) {
 const auth=await getAuthorizedUser(["admin"]);
 if(auth.reason || !auth.supabase || !auth.user) return NextResponse.json({error:auth.reason},{status:auth.user?403:401});
 const form=await request.formData().catch(()=>null);
 const file=form?.get("model"); const productId=String(form?.get("productId")??"");
 if(!(file instanceof File) || file.size>4_000_000 || !/^[0-9a-f-]{36}$/i.test(productId)) return NextResponse.json({error:"Chọn sản phẩm và GLB tối đa 4 MB."},{status:400});
 const buffer=await file.arrayBuffer(); const invalid=validateExperienceGlb(buffer);
 if(invalid) return NextResponse.json({error:invalid},{status:400});
 const {data:product}=await auth.supabase.from("products").select("id").eq("id",productId).maybeSingle();
 if(!product) return NextResponse.json({error:"Không tìm thấy sản phẩm."},{status:404});
 const id=crypto.randomUUID(); const path=`${productId}/${id}.glb`;
 const storage=auth.supabase.storage.from("product-models");
 const {error:uploadError}=await storage.upload(path,buffer,{contentType:"model/gltf-binary",upsert:false});
 if(uploadError) return NextResponse.json({error:uploadError.message},{status:500});
 const {error}=await auth.supabase.from("product_model_assets").insert({id,product_id:productId,storage_path:path,original_filename:file.name,file_size:file.size,uploaded_by:auth.user.id,settings:modelConfigSchema.parse({})});
 if(error) { await storage.remove([path]); return NextResponse.json({error:error.message},{status:500}); }
 return NextResponse.json({id},{status:201});
}
export async function PATCH(request:Request) {
 const auth=await getAuthorizedUser(["admin"]);
 if(auth.reason || !auth.supabase) return NextResponse.json({error:auth.reason},{status:auth.user?403:401});
 const body=await request.json().catch(()=>null);
 if(!body || !/^[0-9a-f-]{36}$/i.test(body.id) || !["configure","publish","archive","reject"].includes(body.action)) return NextResponse.json({error:"Invalid model operation"},{status:400});
 const settings=body.action==="configure"?modelConfigSchema.safeParse(body.settings):null;
 if(settings && !settings.success) return NextResponse.json({error:settings.error.issues.map(e=>e.message).join("; ")},{status:400});
 const {data,error}=await auth.supabase.rpc("manage_product_model",{p_id:body.id,p_action:body.action,p_settings:settings?.success?settings.data:null});
 return NextResponse.json(error?{error:error.message}:data,{status:error?400:200});
}
