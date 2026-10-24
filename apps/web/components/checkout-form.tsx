"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { getDemoCart, saveDemoOrder } from "@/lib/cart-store";
import { useLanguage } from "@/lib/i18n/context";

export function CheckoutForm() {
  const { t } = useLanguage();
  const [status, setStatus] = useState("");
  const [createdOrderId, setCreatedOrderId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [idempotencyKey] = useState(() => crypto.randomUUID());

  async function submit(formData: FormData) {
    setBusy(true);
    setStatus("");

    const recipient = String(formData.get("recipient") || "").trim();
    const phone = String(formData.get("phone") || "").trim();
    const address = String(formData.get("address") || "").trim();
    const city = String(formData.get("city") || "").trim();

    const payload = { recipient, phone, address, city, idempotencyKey };

    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        const body = await response.json();
        setCreatedOrderId(body.orderId);
        setStatus(`${t.checkout.orderSuccess} ${t.checkout.orderSuccessDetail} #${body.orderId}`);
      } else {
        // Fallback for demo mode
        const demoCart = getDemoCart();
        const demoOrderId = `HCT-${Date.now().toString().slice(-6)}`;
        saveDemoOrder({
          id: demoOrderId,
          createdAt: new Date().toISOString(),
          recipient,
          phone,
          address,
          city,
          items: demoCart,
          subtotalVnd: demoCart.reduce((sum, item) => sum + item.quantity * item.priceVnd, 0),
          status: "test_submitted"
        });
        setCreatedOrderId(demoOrderId);
        setStatus(`${t.checkout.orderSuccess} ${t.checkout.orderSuccessDetail} #${demoOrderId}`);
      }
    } catch {
      // Local demo order creation
      const demoCart = getDemoCart();
      const demoOrderId = `HCT-${Date.now().toString().slice(-6)}`;
      saveDemoOrder({
        id: demoOrderId,
        createdAt: new Date().toISOString(),
        recipient,
        phone,
        address,
        city,
        items: demoCart,
        subtotalVnd: demoCart.reduce((sum, item) => sum + item.quantity * item.priceVnd, 0),
        status: "test_submitted"
      });
      setCreatedOrderId(demoOrderId);
      setStatus(`${t.checkout.orderSuccess} ${t.checkout.orderSuccessDetail} #${demoOrderId}`);
    } finally {
      setBusy(false);
    }
  }

  if (createdOrderId) {
    return (
      <div className="panel" style={{ textAlign: "center", padding: "40px 24px" }}>
        <CheckCircle2 size={56} style={{ color: "var(--leaf)", margin: "0 auto 16px" }} />
        <h2>{t.checkout.orderSuccess}</h2>
        <p style={{ fontSize: "1.1rem", marginTop: 8 }}>
          {t.checkout.orderSuccessDetail} <strong>#{createdOrderId}</strong>
        </p>
        <p style={{ color: "var(--muted)", maxWidth: 500, margin: "12px auto 24px" }}>
          {t.checkout.testModeDesc}
        </p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          <Link href="/orders" className="button">
            {t.checkout.viewOrders} →
          </Link>
          <Link href="/marketplace" className="button secondary">
            {t.nav.marketplace}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form className="panel form-stack" action={submit}>

      <div className="field">
        <label htmlFor="recipient">{t.checkout.recipient}</label>
        <input
          id="recipient"
          name="recipient"
          minLength={2}
          placeholder={t.checkout.recipientPlaceholder}
          required
        />
      </div>

      <div className="field">
        <label htmlFor="phone">{t.checkout.phone}</label>
        <input
          id="phone"
          name="phone"
          inputMode="tel"
          placeholder={t.checkout.phonePlaceholder}
          required
        />
      </div>

      <div className="field">
        <label htmlFor="address">{t.checkout.address}</label>
        <textarea
          id="address"
          name="address"
          required
          rows={3}
          placeholder={t.checkout.addressPlaceholder}
        />
      </div>

      <div className="field">
        <label htmlFor="city">{t.checkout.city}</label>
        <input
          id="city"
          name="city"
          defaultValue={t.checkout.cityDefault}
          required
        />
      </div>

      <button className="button terracotta" disabled={busy} style={{ marginTop: 12 }}>
        {busy ? t.checkout.placingOrder : t.checkout.placeOrder}
      </button>

      {status ? <p role="status" style={{ marginTop: 14, fontWeight: 600 }}>{status}</p> : null}
    </form>
  );
}
