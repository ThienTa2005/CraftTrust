"use client";

import { useRef, useState } from "react";
import { QRCodeSVG, QRCodeCanvas } from "qrcode.react";
import { Download, Copy, Check, X, Printer, ShieldCheck } from "lucide-react";

export function QrPrintModal({
  publicCode,
  traceUrl,
  productName,
  isOpen,
  onClose,
}: {
  publicCode: string;
  traceUrl: string;
  productName: string;
  isOpen: boolean;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const canvasRef = useRef<HTMLDivElement>(null);

  if (!isOpen) return null;

  const handleCopyLink = () => {
    void navigator.clipboard.writeText(traceUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadPng = () => {
    const canvasElement = canvasRef.current?.querySelector("canvas");
    if (!canvasElement) return;

    // Create printable canvas with border and text below
    const padding = 32;
    const textHeight = 90;
    const printCanvas = document.createElement("canvas");
    printCanvas.width = canvasElement.width + padding * 2;
    printCanvas.height = canvasElement.height + padding * 2 + textHeight;
    const ctx = printCanvas.getContext("2d");
    if (!ctx) return;

    // Background
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, printCanvas.width, printCanvas.height);

    // Border
    ctx.strokeStyle = "#c89d43";
    ctx.lineWidth = 4;
    ctx.strokeRect(8, 8, printCanvas.width - 16, printCanvas.height - 16);

    // Inner thin border
    ctx.strokeStyle = "#e0d9cc";
    ctx.lineWidth = 1;
    ctx.strokeRect(14, 14, printCanvas.width - 28, printCanvas.height - 28);

    // Draw QR
    ctx.drawImage(canvasElement, padding, padding);

    // Brand and Code Text
    ctx.fillStyle = "#10223b";
    ctx.font = "bold 18px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("HANOI CRAFTTRUST", printCanvas.width / 2, canvasElement.height + padding + 30);

    ctx.fillStyle = "#b65f3d";
    ctx.font = "bold 16px monospace";
    ctx.fillText(publicCode, printCanvas.width / 2, canvasElement.height + padding + 54);

    ctx.fillStyle = "#666666";
    ctx.font = "12px sans-serif";
    ctx.fillText("HỘ CHIẾU DI SẢN SỐ · TRUY XUẤT NGUỒN GỐC", printCanvas.width / 2, canvasElement.height + padding + 74);

    const a = document.createElement("a");
    a.download = `TEM-QR-${publicCode}.png`;
    a.href = printCanvas.toDataURL("image/png");
    a.click();
  };

  const handleDownloadSvg = () => {
    const svgElement = canvasRef.current?.querySelector("svg");
    if (!svgElement) return;
    const svgData = new XMLSerializer().serializeToString(svgElement);
    const blob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.download = `TEM-QR-${publicCode}.svg`;
    a.href = url;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        background: "rgba(16, 34, 59, 0.65)",
        backdropFilter: "blur(4px)",
        display: "grid",
        placeItems: "center",
        padding: 16,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "#fff",
          borderRadius: 20,
          maxWidth: 440,
          width: "100%",
          padding: 24,
          boxShadow: "0 20px 40px rgba(0,0,0,0.25)",
          position: "relative",
          border: "1px solid #ebd39b",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          style={{
            position: "absolute",
            top: 16,
            right: 16,
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "var(--muted)",
          }}
        >
          <X size={20} />
        </button>

        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
          <ShieldCheck size={20} color="#b65f3d" />
          <h3 style={{ margin: 0, fontSize: "1.2rem", color: "#10223b" }}>
            Tem QR Di Sản Số Vật Lý
          </h3>
        </div>

        <p style={{ margin: "0 0 16px", fontSize: "0.86rem", color: "var(--muted)" }}>
          Tem định danh gắn dưới đáy hoặc kèm theo hiện vật <strong>{productName}</strong>. Khách hàng dùng camera điện thoại quét để mở ngay Hộ chiếu di sản số.
        </p>

        {/* QR Visual Card */}
        <div
          ref={canvasRef}
          style={{
            background: "linear-gradient(135deg, #fffbf5 0%, #fff 100%)",
            border: "2px dashed #c89d43",
            borderRadius: 16,
            padding: 20,
            textAlign: "center",
            marginBottom: 20,
          }}
        >
          <div style={{ display: "inline-block", background: "#fff", padding: 12, borderRadius: 12, boxShadow: "0 4px 12px rgba(0,0,0,0.06)" }}>
            <QRCodeCanvas value={traceUrl} size={180} level="H" marginSize={1} />
            <div style={{ display: "none" }}>
              <QRCodeSVG value={traceUrl} size={300} level="H" marginSize={1} />
            </div>
          </div>
          <div style={{ marginTop: 12 }}>
            <strong style={{ display: "block", fontSize: "0.82rem", color: "#10223b", letterSpacing: 1 }}>
              HANOI CRAFTTRUST
            </strong>
            <span
              style={{
                display: "inline-block",
                marginTop: 4,
                fontFamily: "monospace",
                fontSize: "0.95rem",
                fontWeight: 700,
                color: "#b65f3d",
                background: "rgba(182, 95, 61, 0.1)",
                padding: "3px 10px",
                borderRadius: 6,
              }}
            >
              {publicCode}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: "grid", gap: 10 }}>
          <button
            type="button"
            className="button"
            style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, width: "100%" }}
            onClick={handleDownloadPng}
          >
            <Download size={16} />
            Tải ảnh tem in ấn độ nét cao (PNG)
          </button>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <button
              type="button"
              className="button secondary"
              style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
              onClick={handleDownloadSvg}
            >
              <Printer size={16} />
              Tải Vector (SVG)
            </button>
            <button
              type="button"
              className="button secondary"
              style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
              onClick={handleCopyLink}
            >
              {copied ? <Check size={16} color="#1b633f" /> : <Copy size={16} />}
              {copied ? "Đã chép link!" : "Chép link"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
