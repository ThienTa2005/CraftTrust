import type { ModelViewerElement } from "@google/model-viewer";
import type { Texture } from "@google/model-viewer/lib/features/scene-graph/texture.js";
import type { EngravingRegion, Personalization } from "./model-config";
type Material = NonNullable<ModelViewerElement["model"]>["materials"][number];
type Snapshot = { material:Material; base:Texture|null; normal:Texture|null; mr:Texture|null; metal:number; rough:number; images:(HTMLImageElement|null)[]; textures:Texture[] };
export type TextureSession = Snapshot[];
const SIZE=1024;
async function imageOf(texture:Texture|null):Promise<HTMLImageElement|null> {
 if(!texture)return null;
 const url=await texture.source.createThumbnail(SIZE,SIZE);
 try { const image=new Image(); image.src=url; await image.decode(); return image; }
 finally { URL.revokeObjectURL(url); }
}
export async function prepareTextures(viewer:ModelViewerElement):Promise<TextureSession> {
 return Promise.all((viewer.model?.materials??[]).map(async material=>{
  const pbr=material.pbrMetallicRoughness;
  const base=pbr.baseColorTexture.texture,normal=material.normalTexture.texture,mr=pbr.metallicRoughnessTexture.texture;
  return {material,base,normal,mr,metal:pbr.metallicFactor,rough:pbr.roughnessFactor,images:await Promise.all([base,normal,mr].map(imageOf)),textures:[viewer.createCanvasTexture(),viewer.createCanvasTexture(),viewer.createCanvasTexture()]};
 }));
}
export function restoreTextures(session:TextureSession) {
 for(const s of session){const p=s.material.pbrMetallicRoughness;p.baseColorTexture.setTexture(s.base);s.material.normalTexture.setTexture(s.normal);p.metallicRoughnessTexture.setTexture(s.mr);p.setMetallicFactor(s.metal);p.setRoughnessFactor(s.rough);}
}
export function layoutText(text:string,measure:(s:string)=>number,maxWidth:number):string[] {
 const lines:string[]=[];
 for(const paragraph of text.normalize("NFC").split("\n")) {
  let line="";
  for(const word of paragraph.split(/\s+/)) {
   if(measure(word)>maxWidth) throw new Error("Một từ quá dài cho vùng khắc. Hãy giảm cỡ chữ hoặc xuống dòng.");
   const next=line?`${line} ${word}`:word;
   if(measure(next)>maxWidth){lines.push(line);line=word;}else line=next;
  }
  lines.push(line);
 }
 return lines;
}
export async function paintEngraving(session:TextureSession,region:EngravingRegion,design:Omit<Personalization,"previewDataUrl"|"modelAssetId"|"schemaVersion">) {
 const s=session[region.materialIndex];if(!s)throw new Error("Vật liệu của vùng khắc không tồn tại.");
 const font=getComputedStyle(document.documentElement).getPropertyValue(design.font==="serif"?"--font-display":"--font-body").trim() || "sans-serif";
 await document.fonts.load(`16px ${font}`);
 const mask=document.createElement("canvas");mask.width=mask.height=SIZE;
 const ctx=mask.getContext("2d")!;
 const [u,v,w,h]=region.uv; const x=u*SIZE,y=v*SIZE,pw=w*SIZE,ph=h*SIZE;
 ctx.save();ctx.beginPath();ctx.rect(x,y,pw,ph);ctx.clip();ctx.translate(x+pw/2,y+ph/2);ctx.scale(pw/region.widthMm,ph/region.heightMm);
 ctx.font=`500 ${design.fontSizeMm}px ${font}`;
 const lines=layoutText(design.text,t=>ctx.measureText(t).width,region.widthMm*.9);
 const blockWidth=Math.max(...lines.map(l=>ctx.measureText(l).width));const blockHeight=lines.length*design.fontSizeMm*1.35;
 const radians=design.rotation*Math.PI/180;
 if(Math.abs(blockWidth*Math.cos(radians))+Math.abs(blockHeight*Math.sin(radians))>region.widthMm*.94 || Math.abs(blockHeight*Math.cos(radians))+Math.abs(blockWidth*Math.sin(radians))>region.heightMm*.94) throw new Error("Nội dung vượt vùng khắc. Hãy giảm cỡ chữ, góc xoay hoặc số dòng.");
 ctx.rotate(radians);ctx.fillStyle="#fff";ctx.textBaseline="middle";ctx.textAlign=design.align;
 const tx=design.align==="left"?-blockWidth/2:design.align==="right"?blockWidth/2:0;
 lines.forEach((line,index)=>ctx.fillText(line,tx,(index-(lines.length-1)/2)*design.fontSizeMm*1.35));ctx.restore();
 const canvases=s.textures.map(t=>t.source.element as HTMLCanvasElement);
 for(let i=0;i<3;i++){const canvas=canvases[i]!;canvas.width=canvas.height=SIZE;const c=canvas.getContext("2d")!;c.fillStyle=i===0?"#fff":i===1?"rgb(128,128,255)":"#fff";c.fillRect(0,0,SIZE,SIZE);if(s.images[i])c.drawImage(s.images[i]!,0,0,SIZE,SIZE);}
 const color=canvases[0]!.getContext("2d")!,normal=canvases[1]!.getContext("2d")!,mr=canvases[2]!.getContext("2d")!;
 const alpha=ctx.getImageData(0,0,SIZE,SIZE).data;
 const colors=color.getImageData(0,0,SIZE,SIZE),normals=normal.getImageData(0,0,SIZE,SIZE),metals=mr.getImageData(0,0,SIZE,SIZE);
 const ink=design.finish==="gold"?[198,155,83]:[35,54,67];
 const relief=design.finish==="raised"||design.finish==="recessed";
 for(let py=0;py<SIZE;py++)for(let px=0;px<SIZE;px++){
  const i=(py*SIZE+px)*4,a=alpha[i+3]!/255;
  for(let c=0;c<3;c++)colors.data[i+c]=Math.round(colors.data[i+c]!*(1-a*(relief?.12:1))+ink[c]!*a*(relief?.12:1));
  metals.data[i+1]=Math.round(metals.data[i+1]!*s.rough*(1-a)+(design.finish==="gold"?60:metals.data[i+1]!*s.rough)*a);
  metals.data[i+2]=Math.round(metals.data[i+2]!*s.metal*(1-a)+(design.finish==="gold"?255:metals.data[i+2]!*s.metal)*a);
  if(relief && px>0&&px<SIZE-1&&py>0&&py<SIZE-1){
   const sign=design.finish==="recessed"?-1:1;
   const dx=(alpha[i+7]!-alpha[i-1]!)/255*design.depth*sign;
   const dy=(alpha[i+SIZE*4+3]!-alpha[i-SIZE*4+3]!)/255*design.depth*sign;
   const nx=(normals.data[i]!/127.5-1)-dx,ny=(normals.data[i+1]!/127.5-1)+dy,nz=normals.data[i+2]!/127.5-1;
   const length=Math.hypot(nx,ny,nz)||1;normals.data[i]=Math.round((nx/length+1)*127.5);normals.data[i+1]=Math.round((ny/length+1)*127.5);normals.data[i+2]=Math.round((nz/length+1)*127.5);
  }
 }
 color.putImageData(colors,0,0);normal.putImageData(normals,0,0);mr.putImageData(metals,0,0);
 return ()=>{restoreTextures(session);s.material.pbrMetallicRoughness.baseColorTexture.setTexture(s.textures[0]!);s.material.normalTexture.setTexture(s.textures[1]!);s.material.pbrMetallicRoughness.metallicRoughnessTexture.setTexture(s.textures[2]!);s.material.pbrMetallicRoughness.setMetallicFactor(1);s.material.pbrMetallicRoughness.setRoughnessFactor(1);s.textures.forEach(t=>t.source.update());};
}
