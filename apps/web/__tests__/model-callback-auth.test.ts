// @vitest-environment node
import { describe, expect, it } from "vitest";
import { signModelMessage, verifyModelMessage } from "@/lib/model-callback-auth";
import { POST as callback } from "@/app/api/internal/3d-callback/route";

describe("Pixal3D webhook authentication", () => {
  it("accepts a current authentic message and rejects tampering", () => {
    const timestamp = "1793000000";
    const nonce = "11111111-1111-4111-8111-111111111111";
    const body = '{"outcome":"completed"}';
    const signature = signModelMessage("test-secret", timestamp, nonce, body);
    expect(verifyModelMessage({ secret: "test-secret", timestamp, nonce, body, signature, nowSeconds: 1793000000 })).toBe(true);
    expect(verifyModelMessage({ secret: "test-secret", timestamp, nonce, body: `${body} `, signature, nowSeconds: 1793000000 })).toBe(false);
  });

  it("rejects expired, malformed, and missing signatures", () => {
    const body = "{}";
    const nonce = "11111111-1111-4111-8111-111111111111";
    const timestamp = "1792999000";
    const signature = signModelMessage("test-secret", timestamp, nonce, body);
    expect(verifyModelMessage({ secret: "test-secret", timestamp, nonce, body, signature, nowSeconds: 1793000000 })).toBe(false);
    expect(verifyModelMessage({ secret: "", timestamp, nonce, body, signature, nowSeconds: 1793000000 })).toBe(false);
  });
});

it("rejects an oversized callback before authentication or database access", async () => {
  const response = await callback(new Request("http://localhost/api/internal/3d-callback", {
    method: "POST",
    body: "x".repeat(64 * 1024 + 1),
  }));
  expect(response.status).toBe(413);
});
