"use client";

import { QRCodeSVG } from "qrcode.react";

export function PassportQr({ value, label }: { value: string; label: string }) {
  return <div aria-label={`QR identifier for ${label}`} style={{background:"white",padding:12,borderRadius:12,width:"fit-content"}}><QRCodeSVG value={value} size={124} level="H" marginSize={1}/></div>;
}
