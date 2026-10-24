"use client";
import { useLanguage } from "@/lib/i18n/context";
export function PersonalizationSummary({ value }: { value: Record<string,unknown> | null | undefined }) {
 const {locale}=useLanguage(); if(!value)return null;
 return <div className="configuration-summary"><strong>{locale==="vi"?"Thiết kế khách đặt":"Requested design"}</strong><p>{String(value.text??"")}</p><p>{String(value.font??"")} · {String(value.fontSizeMm??"")} mm · {String(value.regionId??"")} · {String(value.finish??"")} · {String(value.align??"")} · {String(value.rotation??0)}°</p>{typeof value.previewDataUrl==="string"&&/^data:image\/png;base64,/.test(value.previewDataUrl)&&<img src={value.previewDataUrl} width={240} height={180} alt={locale==="vi"?"Bản render để nghệ nhân kiểm tra":"Preview for artisan review"}/>}<small>{locale==="vi"?"Bản xem trước để xác nhận chế tác; không phải file gia công.":"Preview for production review; not a manufacturing file."}</small></div>;
}
