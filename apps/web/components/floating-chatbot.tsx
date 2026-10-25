"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bot,
  ExternalLink,
  Maximize2,
  MessageSquare,
  Minus,
  RotateCcw,
  Send,
  Sparkles,
  X,
} from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";

interface ChatMessage {
  id: string;
  sender: "user" | "assistant";
  text: string;
  timestamp: string;
  citations?: Array<{ title: string; url?: string }>;
}

export function FloatingChatbot() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [hasUnreadNotice, setHasUnreadNotice] = useState(true);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome-1",
      sender: "assistant",
      text: "Xin chào! Tôi là Trợ lý Di sản Số của Hanoi CraftTrust. Tôi có thể giúp bạn giải đáp về chất liệu tác phẩm, quy trình vuốt nung thủ công, tra cứu mã Hộ chiếu di sản hoặc hướng dẫn quan sát tem QR đáy 3D.",
      timestamp: "Vừa xong",
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Extract context from current path
  const isProductPage = pathname?.startsWith("/products/");
  const productIdMatch = pathname?.match(/\/products\/([a-f0-9-]{36})/i);
  const currentProductId = productIdMatch ? productIdMatch[1] : undefined;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isOpen]);

  const handleSend = async (questionText?: string) => {
    const q = (questionText || inputValue).trim();
    if (!q || loading) return;

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      sender: "user",
      text: q,
      timestamp: new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputValue("");
    setLoading(true);

    try {
      const res = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: q,
          locale: "vi",
          productId: currentProductId,
          pathname,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Không thể nhận phản hồi.");

      const botMsg: ChatMessage = {
        id: `b-${Date.now()}`,
        sender: "assistant",
        text: data.answer,
        timestamp: new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }),
        citations: data.citations,
      };

      setMessages((prev) => [...prev, botMsg]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          sender: "assistant",
          text: `Rất tiếc, đã có sự cố kết nối: ${err.message || "Vui lòng thử lại sau ít phút."}`,
          timestamp: new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const productSuggestions = [
    "Chiếc bình này làm từ chất liệu gì?",
    "Sản phẩm có chứng nhận OCOP không?",
    "Xem Hộ chiếu di sản số & Tem QR",
    "Kỹ thuật nung củi 1280°C có gì đặc biệt?",
  ];

  const generalSuggestions = [
    "Giới thiệu làng gốm Bát Tràng",
    "Cách kiểm tra mã QR tem đáy 3D",
    "Gợi ý quà tặng làng nghề cao cấp",
    "Chính sách bảo chứng di sản CraftTrust",
  ];

  const activeSuggestions = isProductPage ? productSuggestions : generalSuggestions;

  return (
    <div
      style={{
        position: "fixed",
        bottom: 24,
        right: 24,
        zIndex: 999,
        fontFamily: "var(--font-sans, system-ui, sans-serif)",
      }}
    >
      {/* Floating Button / Toggle */}
      {!isOpen && (
        <div style={{ position: "relative" }}>
          {hasUnreadNotice && (
            <div
              style={{
                position: "absolute",
                bottom: 68,
                right: 0,
                background: "#10223b",
                color: "#fff",
                padding: "8px 14px",
                borderRadius: 14,
                boxShadow: "0 10px 25px rgba(0,0,0,0.2)",
                fontSize: "0.82rem",
                whiteSpace: "nowrap",
                display: "flex",
                alignItems: "center",
                gap: 8,
                border: "1px solid #c89d43",
                animation: "fade-up 0.3s ease",
              }}
            >
              <Sparkles size={14} color="#efb083" />
              <span>Hỏi Trợ lý Di sản CraftTrust</span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setHasUnreadNotice(false);
                }}
                style={{
                  background: "none",
                  border: "none",
                  color: "#9ca3af",
                  cursor: "pointer",
                  padding: 2,
                  marginLeft: 4,
                }}
              >
                <X size={12} />
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={() => {
              setIsOpen(true);
              setHasUnreadNotice(false);
            }}
            aria-label="Mở Trợ lý Di sản AI"
            style={{
              width: 58,
              height: 58,
              borderRadius: "50%",
              background: "linear-gradient(135deg, #10223b 0%, #1e3a5f 100%)",
              border: "2px solid #c89d43",
              color: "#fff",
              display: "grid",
              placeItems: "center",
              boxShadow: "0 8px 24px rgba(16, 34, 59, 0.35)",
              cursor: "pointer",
              transition: "transform 0.2s ease, box-shadow 0.2s ease",
              position: "relative",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.08)")}
            onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
          >
            <div
              style={{
                position: "relative",
                width: 32,
                height: 32,
              }}
            >
              <Image
                src="/brand/icon-192.png"
                alt="CraftTrust AI"
                fill
                style={{ objectFit: "contain" }}
              />
            </div>
            <span
              style={{
                position: "absolute",
                top: 0,
                right: 0,
                width: 14,
                height: 14,
                borderRadius: "50%",
                background: "#10b981",
                border: "2px solid #fff",
              }}
            />
          </button>
        </div>
      )}

      {/* Floating Chat Window */}
      {isOpen && (
        <div
          style={{
            width: "clamp(340px, 90vw, 400px)",
            height: "clamp(480px, 75vh, 600px)",
            background: "#fff",
            borderRadius: 20,
            boxShadow: "0 20px 48px rgba(16, 34, 59, 0.28)",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            border: "1px solid #ebd39b",
            animation: "fade-up 0.25s ease",
          }}
        >
          {/* Header */}
          <div
            style={{
              background: "#10223b",
              color: "#fff",
              padding: "12px 16px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              borderBottom: "2px solid #c89d43",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div
                style={{
                  position: "relative",
                  width: 30,
                  height: 30,
                  borderRadius: "50%",
                  overflow: "hidden",
                  border: "1px solid #c89d43",
                  background: "#fff",
                  flexShrink: 0,
                }}
              >
                <Image
                  src="/brand/icon-192.png"
                  alt="CraftTrust Emblem"
                  fill
                  style={{ objectFit: "contain" }}
                />
              </div>
              <div>
                <strong style={{ fontSize: "0.92rem", display: "block", color: "#fff" }}>
                  Trợ lý Di sản CraftTrust
                </strong>
                <span style={{ fontSize: "0.72rem", color: "#efb083" }}>
                  Tư vấn di sản & Hộ chiếu số 24/7
                </span>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <Link
                href="/assistant"
                title="Mở toàn màn hình"
                style={{
                  color: "#e2e8f0",
                  padding: 4,
                  display: "grid",
                  placeItems: "center",
                  borderRadius: 6,
                }}
              >
                <Maximize2 size={15} />
              </Link>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                aria-label="Thu nhỏ chat"
                style={{
                  background: "none",
                  border: "none",
                  color: "#e2e8f0",
                  cursor: "pointer",
                  padding: 4,
                  display: "grid",
                  placeItems: "center",
                }}
              >
                <Minus size={18} />
              </button>
            </div>
          </div>

          {/* Context Notice if on Product Page */}
          {isProductPage && (
            <div
              style={{
                background: "rgba(182, 95, 61, 0.08)",
                padding: "6px 14px",
                fontSize: "0.74rem",
                color: "#b65f3d",
                display: "flex",
                alignItems: "center",
                gap: 6,
                borderBottom: "1px dashed #ebd39b",
              }}
            >
              <Sparkles size={12} />
              <span>Đang hỗ trợ tư vấn trực tiếp tác phẩm bạn đang xem</span>
            </div>
          )}

          {/* Messages Stream */}
          <div
            style={{
              flex: 1,
              overflowY: "auto",
              padding: 14,
              display: "flex",
              flexDirection: "column",
              gap: 12,
              background: "#faf9f6",
            }}
          >
            {messages.map((m) => (
              <div
                key={m.id}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: m.sender === "user" ? "flex-end" : "flex-start",
                }}
              >
                <div
                  style={{
                    maxWidth: "84%",
                    padding: "10px 14px",
                    borderRadius: m.sender === "user" ? "16px 16px 2px 16px" : "16px 16px 16px 2px",
                    background: m.sender === "user" ? "#10223b" : "#fff",
                    color: m.sender === "user" ? "#fff" : "#1f2937",
                    fontSize: "0.85rem",
                    lineHeight: 1.5,
                    boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
                    border: m.sender === "user" ? "none" : "1px solid #e5e1d8",
                    whiteSpace: "pre-line",
                  }}
                >
                  {m.text}

                  {m.citations && m.citations.length > 0 && (
                    <div
                      style={{
                        marginTop: 8,
                        paddingTop: 6,
                        borderTop: "1px dashed #e5e1d8",
                        fontSize: "0.74rem",
                        color: "var(--muted)",
                      }}
                    >
                      <strong style={{ display: "block", marginBottom: 2 }}>Nguồn tư liệu:</strong>
                      {m.citations.map((c, i) => (
                        <div key={i} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                          <span>• {c.title}</span>
                          {c.url && (
                            <a href={c.url} target="_blank" rel="noreferrer" style={{ color: "var(--leaf)" }}>
                              <ExternalLink size={10} />
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <span
                  style={{
                    fontSize: "0.68rem",
                    color: "#9ca3af",
                    marginTop: 3,
                    padding: "0 4px",
                  }}
                >
                  {m.timestamp}
                </span>
              </div>
            ))}

            {loading && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--muted)", fontSize: "0.78rem" }}>
                <div
                  style={{
                    width: 14,
                    height: 14,
                    border: "2px solid #b65f3d",
                    borderTopColor: "transparent",
                    borderRadius: "50%",
                    animation: "spin 0.8s linear infinite",
                  }}
                />
                <span>Trợ lý đang tra cứu tư liệu di sản...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Suggestions Chips */}
          <div
            style={{
              padding: "8px 12px",
              background: "#fff",
              borderTop: "1px solid #f0ede6",
              display: "flex",
              gap: 6,
              overflowX: "auto",
              whiteSpace: "nowrap",
            }}
          >
            {activeSuggestions.map((s, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSend(s)}
                disabled={loading}
                style={{
                  fontSize: "0.74rem",
                  padding: "4px 10px",
                  borderRadius: 999,
                  background: "#f7f5f0",
                  border: "1px solid #e5e0d4",
                  color: "#10223b",
                  cursor: "pointer",
                  flexShrink: 0,
                  transition: "background 0.15s ease",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "#ebe6db")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "#f7f5f0")}
              >
                {s}
              </button>
            ))}
          </div>

          {/* Input Footer */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void handleSend();
            }}
            style={{
              padding: "10px 12px",
              background: "#fff",
              borderTop: "1px solid #ebd39b",
              display: "flex",
              gap: 8,
              alignItems: "center",
            }}
          >
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Hỏi về chất liệu, OCOP, mã QR..."
              style={{
                flex: 1,
                border: "1px solid #dcd7cc",
                borderRadius: 12,
                padding: "8px 12px",
                fontSize: "0.85rem",
                outline: "none",
              }}
            />
            <button
              type="submit"
              disabled={loading || !inputValue.trim()}
              aria-label="Gửi câu hỏi"
              style={{
                background: "#10223b",
                color: "#fff",
                border: "none",
                borderRadius: 12,
                width: 38,
                height: 38,
                display: "grid",
                placeItems: "center",
                cursor: loading || !inputValue.trim() ? "not-allowed" : "pointer",
                opacity: loading || !inputValue.trim() ? 0.5 : 1,
              }}
            >
              <Send size={16} />
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
