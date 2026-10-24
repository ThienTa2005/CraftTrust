import { describe, expect, it } from "vitest";
import { extractPassportId, toPassportView } from "./adapters";

describe("mobile adapters", () => {
  it("extracts the final passport or QR token from a resolver URL", () => {
    expect(extractPassportId("https://craft.example/passport/qr-token-1")).toBe("qr-token-1");
    expect(extractPassportId("PUBLIC-123")).toBe("PUBLIC-123");
  });

  it("does not invent a verified tier for malformed responses", () => {
    expect(toPassportView({ status: "pending", tier: "platinum" }, "P-1")).toMatchObject({ publicId: "P-1", tier: "unverified", status: "pending" });
  });
});
