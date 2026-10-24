"use client";
import { createElement, useEffect, useRef, useState } from "react";
import type { ModelViewerElement } from "@google/model-viewer";
import { Maximize2, RotateCcw, Smartphone } from "lucide-react";
import { useLanguage } from "@/lib/i18n/context";
import type { ModelConfig } from "@/lib/model-config";

export function CraftModelViewer({ src, poster, arUrl, dimensions, config, onReady, customized = false }: {
 src?:string|undefined; poster:string; arUrl?:string|undefined; referencePhotoUrl?:string|undefined;
 modelReport?:Record<string,unknown>|null|undefined; dimensions?:{heightCm?:number|null;widthCm?:number|null}|undefined;
 config?:ModelConfig|undefined; onReady?:(viewer:ModelViewerElement)=>void; customized?:boolean;
}) {
 const viewer=useRef<ModelViewerElement>(null); const stage=useRef<HTMLDivElement>(null);
 const {locale}=useLanguage(); const vi=locale==="vi";
 const [status,setStatus]=useState<"loading"|"ready"|"error">("loading");
 const [canAR,setCanAR]=useState(false); const [photo,setPhoto]=useState(false);
 const [attempt,setAttempt]=useState(0);
 useEffect(()=>{
  if(!src) return;
  const element=viewer.current; let live=true;
  setStatus("loading");setCanAR(false);
  const timeout=window.setTimeout(()=>{if(live)setStatus("error");},45000);
  const load=()=>{clearTimeout(timeout);setStatus("ready");setCanAR(Boolean(element?.canActivateAR)); if(element)onReady?.(element);};
  const error=()=>{clearTimeout(timeout);setStatus("error");};
  element?.addEventListener("load",load);element?.addEventListener("error",error);
  import("@google/model-viewer").catch(()=>{if(live)error();});
  return()=>{live=false;clearTimeout(timeout);element?.removeEventListener("load",load);element?.removeEventListener("error",error);};
 },[src,onReady,attempt]);
 if(!src) return <div className="studio-message"><p>{vi?"Sản phẩm hiện chưa có mô hình 3D/AR. Bạn vẫn có thể xem hình ảnh thực tế và thông tin chi tiết của tác phẩm.":"This product has no published 3D/AR model. You can still view its photos and details."}</p></div>;
 return <div className="model-stage" ref={stage}>
   <div className="studio-actions"><button type="button" className="button secondary small" onClick={()=>{if(viewer.current){viewer.current.cameraOrbit=config?.cameraOrbit??"0deg 75deg auto";viewer.current.jumpCameraToGoal();}}}><RotateCcw size={16}/>{vi?"Đặt lại góc nhìn":"Reset view"}</button><button type="button" className="button secondary small" onClick={()=>setPhoto(!photo)}>{photo?(vi?"Xem 3D":"View 3D"):(vi?"Ảnh thật":"Photo")}</button><button type="button" className="button secondary small" aria-label={vi?"Toàn màn hình":"Fullscreen"} onClick={()=>{void stage.current?.requestFullscreen?.().catch(()=>{});}}><Maximize2 size={16}/></button></div>
   {photo && <img src={poster} alt={vi?"Ảnh sản phẩm":"Product photo"} style={{width:"100%",maxHeight:500,objectFit:"contain"}} />}
   <div hidden={photo}>{createElement("model-viewer",{key:`${src}-${attempt}`,ref:viewer,src,poster,alt:vi?"Mô hình của sản phẩm":"Product model","camera-controls":true,"touch-action":"pan-y","camera-orbit":config?.cameraOrbit??"0deg 75deg auto",orientation:config?.orientation.map(v=>`${v}deg`).join(" "),scale:config?`${config.scale} ${config.scale} ${config.scale}`:undefined,"shadow-intensity":"1","environment-image":"neutral",exposure:"1",ar:config?.arEnabled&&!customized,"ar-modes":"webxr scene-viewer quick-look","ar-scale":"fixed","ios-src":arUrl?.endsWith(".usdz")?arUrl:undefined})}</div>
   {status!=="ready"&&<p role="status" className="studio-message">{status==="loading"?(vi?"Đang tải mô hình…":"Loading model…"):(vi?"Không tải được mô hình. Kiểm tra kết nối rồi thử lại.":"Could not load the model. Check your connection and retry.")}{status==="error"&&<button className="button secondary small" onClick={()=>setAttempt(a=>a+1)}>{vi?"Thử lại":"Retry"}</button>}</p>}
   {(config||dimensions)&&<p className="studio-message">{vi?"Kích thước khai báo":"Declared dimensions"}: {config?.heightCm??dimensions?.heightCm} × {config?.widthCm??dimensions?.widthCm} cm</p>}
   {config?.arEnabled&&canAR&&!customized&&<button className="button" onClick={()=>{void viewer.current?.activateAR().catch(()=>setCanAR(false));}}><Smartphone size={18}/>{vi?"Xem trong không gian của bạn":"View in your space"}</button>}
   <p className="studio-message">{customized?(vi?"Bản xem trước cá nhân hóa; AR tạm tắt để tránh hiển thị mô hình gốc thay bản đã khắc.":"Personalization preview; AR is disabled to avoid displaying the unmodified model."):(vi?"Kéo để xoay, cuộn hoặc chụm hai ngón để thu phóng. AR chỉ hiện trên thiết bị hỗ trợ và khi đã được cấu hình.":"Drag to rotate, scroll or pinch to zoom. AR is available only when configured and supported by your device.")}</p>
 </div>;
}
