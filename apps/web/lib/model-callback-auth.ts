import { createHmac, timingSafeEqual } from "node:crypto";

const MAX_CLOCK_SKEW_SECONDS = 300;

export function signModelMessage(
  secret: string,
  timestamp: string,
  nonce: string,
  body: string,
) {
  return createHmac("sha256", secret)
    .update(`${timestamp}.${nonce}.${body}`)
    .digest("hex");
}

export function verifyModelMessage(input: {
  secret: string;
  timestamp: string | null;
  nonce: string | null;
  signature: string | null;
  body: string;
  nowSeconds?: number;
}) {
  const { secret, timestamp, nonce, signature, body } = input;
  if (!secret || !timestamp || !nonce || !signature) return false;
  if (!/^\d{10}$/.test(timestamp) || !/^[0-9a-f-]{16,64}$/i.test(nonce))
    return false;
  const now = input.nowSeconds ?? Math.floor(Date.now() / 1000);
  if (Math.abs(now - Number(timestamp)) > MAX_CLOCK_SKEW_SECONDS) return false;
  const expected = signModelMessage(secret, timestamp, nonce, body);
  if (!/^[0-9a-f]{64}$/i.test(signature)) return false;
  return timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(signature, "hex"));
}
