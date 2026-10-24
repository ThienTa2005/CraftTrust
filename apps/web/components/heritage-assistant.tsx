"use client";

import { useEffect, useRef, useState } from "react";
import {
  BookOpen,
  Send,
  Sparkles,
  Volume2,
  VolumeX,
  Compass,
  CheckCircle2
} from "lucide-react";
import { useLanguage } from "@/lib/i18n/context";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  citations?: Array<{ title: string; url?: string }>;
};

const PROMPT_SUGGESTIONS_VI = [
  "Cách phân biệt gốm Bát Tràng thủ công thật với hàng in công nghiệp?",
  "Men hỏa biến 1280°C được tạo ra như thế nào?",
  "Lụa Vạn Phúc có đặc trưng gì khiến mùa đông ấm, mùa hè mát?",
  "Kỹ thuật mộng gỗ Chàng Sơn không dùng đinh là gì?",
  "Gợi ý 3 tuyến tour khám phá làng nghề Hà Nội trong ngày?"
];

const PROMPT_SUGGESTIONS_EN = [
  "How to identify authentic hand-thrown Bat Trang pottery?",
  "How is 1280°C flambé reactive glaze produced?",
  "What makes Van Phuc natural silk cool in summer and warm in winter?",
  "What is the nail-free mortise joinery of Chang Son woodcraft?",
  "Suggest three curated day tours to Hanoi craft villages?"
];

export function HeritageAssistant() {
  const { locale } = useLanguage();
  const [messages, setMessages] = useState<Message[]>([]);
  const [question, setQuestion] = useState("");
  const [busy, setBusy] = useState(false);
  const [speakingMsgId, setSpeakingMsgId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMessages([
      {
        id: "msg-welcome",
        role: "assistant",
        content:
          locale === "vi"
            ? "Xin kính chào Quý khách! Tôi là Thuyết minh viên Di sản Thủ công Hà Nội. Tôi có thể giải đáp tường tận về lịch sử làng nghề, bí quyết các dòng men gốm, kỹ nghệ dệt lụa tơ tằm, cách phân biệt sản phẩm thủ công thật và gợi ý các tour trải nghiệm cùng nghệ nhân. Mọi câu trả lời đều được bảo chứng từ tư liệu di sản chuẩn."
            : "Welcome! I am your Hanoi Heritage Craft Docent. I can answer questions about village histories, secret ceramic glazes, silk weaving techniques, authentic craft appraisal, and curated artisan tour itineraries.",
        timestamp: new Date().toLocaleTimeString(locale === "vi" ? "vi-VN" : "en-US", {
          hour: "2-digit",
          minute: "2-digit"
        })
      }
    ]);
  }, [locale]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, busy]);

  // Voice synthesis: Text-to-speech for heritage narration
  const handleSpeak = (msgId: string, text: string) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      alert(locale === "vi" ? "Trình duyệt không hỗ trợ phát âm thanh." : "Speech synthesis not supported.");
      return;
    }

    if (speakingMsgId === msgId) {
      window.speechSynthesis.cancel();
      setSpeakingMsgId(null);
      return;
    }

    window.speechSynthesis.cancel();
    const cleanText = text.replace(/[*#✦]/g, "");
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = locale === "vi" ? "vi-VN" : "en-US";
    utterance.rate = 0.95; // Gentle docent pacing

    utterance.onend = () => setSpeakingMsgId(null);
    utterance.onerror = () => setSpeakingMsgId(null);

    setSpeakingMsgId(msgId);
    window.speechSynthesis.speak(utterance);
  };

  async function submit(event?: React.FormEvent, customQuestion?: string) {
    if (event) event.preventDefault();
    const q = (customQuestion ?? question).trim();
    if (!q || busy) return;

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      content: q,
      timestamp: new Date().toLocaleTimeString(locale === "vi" ? "vi-VN" : "en-US", {
        hour: "2-digit",
        minute: "2-digit"
      })
    };

    setQuestion("");
    setMessages((old) => [...old, userMsg]);
    setBusy(true);

    try {
      const response = await fetch("/api/assistant", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ question: q, locale })
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Assistant unavailable");

      const assistantMsg: Message = {
        id: `asst-${Date.now()}`,
        role: "assistant",
        content: body.answer,
        citations: body.citations,
        timestamp: new Date().toLocaleTimeString(locale === "vi" ? "vi-VN" : "en-US", {
          hour: "2-digit",
          minute: "2-digit"
        })
      };

      setMessages((old) => [...old, assistantMsg]);
    } catch (error) {
      setMessages((old) => [
        ...old,
        {
          id: `err-${Date.now()}`,
          role: "assistant",
          content:
            error instanceof Error
              ? error.message
              : locale === "vi"
              ? "Trợ lý di sản hiện chưa thể kết nối. Vui lòng thử lại sau ít phút."
              : "The heritage assistant is currently unavailable.",
          timestamp: new Date().toLocaleTimeString(locale === "vi" ? "vi-VN" : "en-US", {
            hour: "2-digit",
            minute: "2-digit"
          })
        }
      ]);
    } finally {
      setBusy(false);
    }
  }

  const suggestions = locale === "vi" ? PROMPT_SUGGESTIONS_VI : PROMPT_SUGGESTIONS_EN;

  return (
    <div className="shell assistant-layout" style={{ margin: "32px auto 80px" }}>
      {/* Left Sidebar: Knowledge Scope & Suggested Prompts */}
      <div className="sidebar" style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        <div
          style={{
            padding: 22,
            background: "var(--surface)",
            borderRadius: 18,
            border: "1px solid var(--line)"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <Compass size={20} style={{ color: "var(--leaf)" }} />
            <strong style={{ fontSize: "1.05rem", fontFamily: "Fraunces" }}>
              {locale === "vi" ? "Thuyết minh viên Di sản" : "Heritage Docent"}
            </strong>
          </div>
          <p style={{ margin: 0, fontSize: "0.82rem", color: "var(--muted)", lineHeight: 1.5 }}>
            {locale === "vi"
              ? "Được đào tạo trên kho dữ liệu thẩm định của Liên minh Làng nghề truyền thống Hà Nội và các văn kiện OCOP chính thống."
              : "Grounded in audited provenance archives from the Hanoi Traditional Craft Alliance and certified OCOP dossiers."}
          </p>

          <div
            style={{
              marginTop: 14,
              paddingTop: 12,
              borderTop: "1px dashed var(--line)",
              fontSize: "0.78rem",
              color: "var(--ink)",
              display: "grid",
              gap: 6
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <CheckCircle2 size={14} style={{ color: "var(--leaf)" }} />
              <span>{locale === "vi" ? "Kiểm tra xuất xứ & chất liệu gốm, lụa" : "Origin & materials verification"}</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <CheckCircle2 size={14} style={{ color: "var(--leaf)" }} />
              <span>{locale === "vi" ? "Hỗ trợ đọc thuyết minh bằng giọng nói" : "Voice narration support (TTS)"}</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <CheckCircle2 size={14} style={{ color: "var(--leaf)" }} />
              <span>{locale === "vi" ? "Trích dẫn nguồn tư liệu có kiểm chứng" : "Citations to verified dossiers"}</span>
            </div>
          </div>
        </div>

        {/* Quick Suggestion Chips */}
        <div
          style={{
            padding: 20,
            background: "var(--surface)",
            borderRadius: 18,
            border: "1px solid var(--line)"
          }}
        >
          <strong style={{ display: "block", fontSize: "0.85rem", marginBottom: 12, color: "var(--ink)" }}>
            <Sparkles size={16} style={{ display: "inline", verticalAlign: "middle", marginRight: 6, color: "var(--gold)" }} />
            {locale === "vi" ? "Câu hỏi gợi ý thường gặp" : "Popular questions"}
          </strong>

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {suggestions.map((promptText, index) => (
              <button
                key={index}
                type="button"
                onClick={() => submit(undefined, promptText)}
                disabled={busy}
                style={{
                  textAlign: "left",
                  padding: "9px 12px",
                  borderRadius: 10,
                  border: "1px solid var(--line)",
                  background: "#fff",
                  fontSize: "0.8rem",
                  color: "var(--ink)",
                  lineHeight: 1.35,
                  cursor: "pointer",
                  transition: "all .2s ease"
                }}
              >
                {promptText}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Right Column: Chat Stream */}
      <div
        className="chat"
        style={{
          background: "var(--surface)",
          border: "1px solid var(--line)",
          borderRadius: 22,
          padding: 24,
          display: "flex",
          flexDirection: "column",
          minHeight: 560
        }}
      >
        <div className="messages" style={{ flex: 1, overflowY: "auto", display: "grid", gap: 16 }}>
          {messages.map((item) => {
            const isUser = item.role === "user";
            const isSpeaking = speakingMsgId === item.id;

            return (
              <div
                key={item.id}
                style={{
                  alignSelf: isUser ? "flex-end" : "flex-start",
                  maxWidth: "86%",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: isUser ? "flex-end" : "flex-start"
                }}
              >
                <div
                  style={{
                    padding: "14px 18px",
                    borderRadius: 18,
                    background: isUser ? "var(--leaf)" : "#fff",
                    color: isUser ? "#fff" : "var(--ink)",
                    border: isUser ? "none" : "1px solid var(--line)",
                    boxShadow: isUser ? "0 4px 14px rgba(35, 92, 67, 0.2)" : "0 2px 8px rgba(0,0,0,0.04)",
                    lineHeight: 1.6,
                    fontSize: "0.92rem",
                    whiteSpace: "pre-wrap"
                  }}
                >
                  {item.content}

                  {/* Citations block */}
                  {item.citations && item.citations.length > 0 && (
                    <div
                      style={{
                        marginTop: 12,
                        paddingTop: 10,
                        borderTop: "1px dashed rgba(0,0,0,0.12)",
                        fontSize: "0.78rem"
                      }}
                    >
                      <strong style={{ color: "var(--leaf)" }}>
                        <BookOpen size={13} style={{ display: "inline", verticalAlign: "middle", marginRight: 4 }} />
                        {locale === "vi" ? "Tư liệu di sản bảo chứng:" : "Verified Heritage Sources:"}
                      </strong>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 4 }}>
                        {item.citations.map((c, i) => (
                          <span
                            key={i}
                            style={{
                              padding: "2px 8px",
                              borderRadius: 6,
                              background: "rgba(35, 92, 67, 0.08)",
                              color: "var(--leaf-dark)",
                              fontWeight: 500
                            }}
                          >
                            {c.title}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Sub row with timestamp and Voice Readout Button */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    marginTop: 4,
                    padding: "0 4px",
                    fontSize: "0.72rem",
                    color: "var(--muted)"
                  }}
                >
                  <span>{item.timestamp}</span>
                  {!isUser && (
                    <button
                      type="button"
                      onClick={() => handleSpeak(item.id, item.content)}
                      aria-label="Read aloud"
                      style={{
                        background: isSpeaking ? "rgba(198, 94, 61, 0.1)" : "none",
                        border: isSpeaking ? "1px solid rgba(198, 94, 61, 0.25)" : "none",
                        borderRadius: 999,
                        color: isSpeaking ? "var(--terracotta)" : "var(--muted)",
                        cursor: "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                        padding: isSpeaking ? "3px 8px" : "2px 4px",
                        transition: "all var(--dur-fast) ease"
                      }}
                    >
                      {isSpeaking ? (
                        <>
                          <VolumeX size={14} />
                          <div className="audio-visualizer" aria-hidden="true">
                            <span className="audio-bar" />
                            <span className="audio-bar" />
                            <span className="audio-bar" />
                            <span className="audio-bar" />
                          </div>
                        </>
                      ) : (
                        <Volume2 size={14} />
                      )}
                      <span style={{ fontWeight: isSpeaking ? 600 : 400 }}>
                        {isSpeaking
                          ? locale === "vi"
                            ? "Dừng đọc"
                            : "Stop"
                          : locale === "vi"
                            ? "Nghe thuyết minh"
                            : "Listen"}
                      </span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}

          {busy && (
            <div
              style={{
                alignSelf: "flex-start",
                padding: "12px 18px",
                borderRadius: 18,
                background: "#fff",
                border: "1px solid var(--line)",
                fontSize: "0.85rem",
                color: "var(--muted)",
                display: "inline-flex",
                alignItems: "center",
                gap: 10,
                boxShadow: "var(--shadow-sm)",
                animation: "fade-slide-up 0.25s var(--ease-out-expo)"
              }}
            >
              <div style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                <span
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: "50%",
                    background: "var(--leaf)",
                    display: "inline-block",
                    animation: "pulse-soft 1s ease-in-out infinite"
                  }}
                />
                <span
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: "50%",
                    background: "var(--leaf)",
                    display: "inline-block",
                    animation: "pulse-soft 1s ease-in-out infinite 0.2s"
                  }}
                />
                <span
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: "50%",
                    background: "var(--leaf)",
                    display: "inline-block",
                    animation: "pulse-soft 1s ease-in-out infinite 0.4s"
                  }}
                />
              </div>
              <span>{locale === "vi" ? "Thuyết minh viên đang tra cứu kho tư liệu di sản..." : "Consulting heritage archives..."}</span>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Question Form */}
        <form onSubmit={submit} className="chat-form" style={{ marginTop: 20 }}>
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder={
              locale === "vi"
                ? "Hỏi về bí quyết men gốm, cách phân biệt thật giả, làng nghề..."
                : "Ask about glaze secrets, authenticity checks, craft villages..."
            }
            disabled={busy}
            style={{
              flex: 1,
              padding: "12px 18px",
              borderRadius: 999,
              border: "1px solid var(--line)",
              fontSize: "0.9rem",
              background: "#fff"
            }}
          />
          <button
            type="submit"
            className="button"
            disabled={busy || !question.trim()}
            style={{
              padding: "12px 22px",
              display: "inline-flex",
              alignItems: "center",
              gap: 6
            }}
          >
            <Send size={16} />
            <span>{locale === "vi" ? "Gửi" : "Send"}</span>
          </button>
        </form>
      </div>
    </div>
  );
}
