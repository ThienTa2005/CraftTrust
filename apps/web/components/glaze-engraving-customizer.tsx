"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import type { ModelViewerElement } from "@google/model-viewer";
import { CraftModelViewer } from "./model-viewer";
import { useLanguage } from "@/lib/i18n/context";
import type { ProductCard } from "@/lib/demo-data";
import { addToDemoCart } from "@/lib/cart-store";
import type { Personalization } from "@/lib/model-config";
import { paintEngraving, prepareTextures, restoreTextures, type TextureSession } from "@/lib/engraving-texture";

const initial={text:"",font:"sans" as const,fontSizeMm:5,align:"center" as const,finish:"ink" as const,depth:.5,rotation:0};
type Design=Omit<Personalization,"schemaVersion"|"modelAssetId"|"previewDataUrl"|"regionId">;
export function GlazeEngravingCustomizer({product,isDemo=false}:{product:ProductCard;isDemo?:boolean}) {
 const {locale}=useLanguage();const vi=locale==="vi";
 const regions=product.modelConfig?.regions??[];
 const [regionId,setRegionId]=useState(regions[0]?.id??"");
 const region=regions.find(r=>r.id===regionId);
 const [design,setDesign]=useState<Design>({...initial,finish:region?.finishes[0]??"ink"});
 const [history,setHistory]=useState<Design[]>([]);
 const [session,setSession]=useState<TextureSession|null>(null);
 const [message,setMessage]=useState("");const [error,setError]=useState("");const [rendering,setRendering]=useState(false);const [busy,setBusy]=useState(false);
 const viewer=useRef<ModelViewerElement|null>(null);const revision=useRef(0);
 const ready=useCallback((element:ModelViewerElement)=>{viewer.current=element;void prepareTextures(element).then(setSession).catch(()=>setError("Không đọc được texture gốc. Chưa thể cá nhân hóa mô hình này."));},[]);
 function update(patch:Partial<Design>){setHistory(h=>[...h.slice(-19),design]);setDesign(d=>({...d,...patch}));setMessage("");}
 useEffect(()=>{
  if(!session||!region)return;const current=++revision.current;setError("");
  if(!design.text.trim()){restoreTextures(session);setRendering(false);return;}
  setRendering(true);
  const timer=window.setTimeout(()=>{
   void paintEngraving(session,region,{...design,regionId}).then(apply=>{if(current===revision.current){apply();setRendering(false);}}).catch(cause=>{if(current===revision.current){restoreTextures(session);setError(cause instanceof Error?cause.message:"Không tạo được bản xem trước.");setRendering(false);}});
  },180);
  return()=>{clearTimeout(timer);revision.current++;};
 },[session,region,regionId,design]);
 async function capture():Promise<Personalization>{
  if(!viewer.current||!product.modelAssetId||!region||error||rendering)throw new Error("Hãy đợi bản xem trước hợp lệ.");
  await new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve())));
  const image=new Image();image.src=viewer.current.toDataURL("image/png");await image.decode();
  const canvas=document.createElement("canvas");canvas.width=480;canvas.height=Math.round(image.height/image.width*480);canvas.getContext("2d")!.drawImage(image,0,0,canvas.width,canvas.height);
  const previewDataUrl=canvas.toDataURL("image/png");
  if(previewDataUrl.length>500000)throw new Error("Bản xem trước quá lớn. Hãy thu nhỏ khung nhìn rồi thử lại.");
  return {schemaVersion:1,modelAssetId:product.modelAssetId,regionId,...design,text:design.text.trim().normalize("NFC"),previewDataUrl};
 }
 async function save(add:boolean){setBusy(true);setMessage("");try{const personalization=await capture();if(add){
  if(isDemo)addToDemoCart({productId:product.id,name:product.name,image:product.image,priceVnd:product.priceVnd,quantity:1,village:product.village,personalization});
  else{const res=await fetch("/api/cart",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({productId:product.id,quantity:1,personalization})});const result=await res.json();if(!res.ok)throw new Error(result.error);}
  setMessage(vi?"Đã lưu thiết kế cùng sản phẩm vào giỏ hàng.":"Product and design added to cart.");window.dispatchEvent(new Event("hct_cart_updated"));
 }else{localStorage.setItem(`crafttrust-design-${product.id}`,JSON.stringify(personalization));setMessage(vi?"Đã lưu mẫu trên thiết bị này.":"Design saved on this device.");}}catch(cause){setMessage(cause instanceof Error?cause.message:"Không lưu được thiết kế.");}finally{setBusy(false);}}
 return <section className="customizer-card"><h2>{vi?"Studio cá nhân hóa":"Personalization studio"}</h2><div className="studio-layout"><CraftModelViewer src={product.modelUrl} poster={product.image} config={product.modelConfig} onReady={ready} customized={Boolean(design.text.trim())}/>
 {region?<div className="studio-controls"><label>{vi?"Nội dung tiếng Việt / nhiều dòng":"Text / multiple lines"}<textarea rows={3} maxLength={400} value={design.text} onChange={e=>update({text:e.target.value})}/></label>
 <label>{vi?"Vùng được phép khắc":"Approved engraving region"}<select value={regionId} onChange={e=>{setRegionId(e.target.value);const next=regions.find(r=>r.id===e.target.value);if(next)update({finish:next.finishes[0]!});}}>{regions.map(r=><option key={r.id} value={r.id}>{r.label} ({r.widthMm}×{r.heightMm} mm)</option>)}</select></label>
 <label>{vi?"Kiểu chữ":"Font"}<select value={design.font} onChange={e=>update({font:e.target.value as Design["font"]})}><option value="sans">Be Vietnam Pro</option><option value="serif">Fraunces</option></select></label>
 <label>{vi?"Cỡ chữ (mm)":"Font size (mm)"}<input type="number" min={2} max={30} step={.5} value={design.fontSizeMm} onChange={e=>update({fontSizeMm:Number(e.target.value)})}/></label>
 <label>{vi?"Căn lề":"Alignment"}<select value={design.align} onChange={e=>update({align:e.target.value as Design["align"]})}><option value="left">{vi?"Trái":"Left"}</option><option value="center">{vi?"Giữa":"Center"}</option><option value="right">{vi?"Phải":"Right"}</option></select></label>
 <label>{vi?"Hoàn thiện":"Finish"}<select value={design.finish} onChange={e=>update({finish:e.target.value as Design["finish"]})}>{region.finishes.map(f=><option key={f} value={f}>{{ink:"Chữ men / Ink",gold:"Chữ vàng / Gold",recessed:"Khắc chìm / Recessed",raised:"Khắc nổi / Raised"}[f]}</option>)}</select></label>
 {(design.finish==="raised"||design.finish==="recessed")&&<label>{vi?"Cường độ hiệu ứng độ sâu":"Relief preview intensity"}<input type="range" min={.1} max={2} step={.1} value={design.depth} onChange={e=>update({depth:Number(e.target.value)})}/></label>}
 <label>{vi?"Góc chữ":"Text angle"}: {design.rotation}°<input type="range" min={-30} max={30} value={design.rotation} onChange={e=>update({rotation:Number(e.target.value)})}/></label>
 <div className="studio-actions"><button className="button secondary" disabled={!history.length} onClick={()=>{const previous=history.at(-1);if(previous)setDesign(previous);setHistory(h=>h.slice(0,-1));}}>{vi?"Hoàn tác":"Undo"}</button><button className="button secondary" onClick={()=>update({...initial,finish:region.finishes[0]!})}>{vi?"Đặt lại":"Reset"}</button><button className="button secondary" onClick={()=>{if(viewer.current)viewer.current.cameraOrbit=region.cameraOrbit;}}>{vi?"Cận cảnh vùng khắc":"Focus region"}</button></div>
 <div className="studio-actions">{[0,90,180].map(angle=><button className="button secondary small" key={angle} onClick={()=>{if(viewer.current)viewer.current.cameraOrbit=`${angle}deg 75deg auto`;}}>{angle}°</button>)}</div>
 {error&&<p className="error-banner" role="alert">{error}</p>}{rendering&&<p role="status">{vi?"Đang cập nhật bề mặt…":"Updating surface…"}</p>}
 <button className="button secondary" disabled={busy||rendering||!!error||!session||!design.text.trim()} onClick={()=>void save(false)}>{vi?"Lưu mẫu":"Save design"}</button><button className="button" disabled={busy||rendering||!!error||!session||!design.text.trim()} onClick={()=>void save(true)}>{vi?"Thêm sản phẩm và thiết kế vào giỏ":"Add product and design to cart"}</button>
 <p className="studio-message">{vi?"Chữ được vẽ lên UV của mô hình; khắc chìm/nổi là hiệu ứng normal map, không thay đổi hình học chế tác. Nghệ nhân cần xác nhận thiết kế trước khi sản xuất.":"Text is applied to the model UVs. Relief uses normal mapping, not manufacturing geometry. The artisan must confirm the design before production."}</p>{message&&<p role="status">{message}</p>}
 </div>:<p className="studio-message">{vi?"Mô hình chưa được cấu hình vùng cá nhân hóa. Bạn có thể xem 3D và mua sản phẩm nguyên bản.":"No personalization regions have been configured. You can view the model and buy the original product."}</p>}</div></section>;
}
