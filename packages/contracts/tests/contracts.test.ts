import { describe, expect, it } from "vitest";
import {
  assistantResponseSchema,
  checkoutTestInputSchema,
  passportRecordSchema,
  submitEvidenceInputSchema,
} from "../src";

describe("shared contracts", () => {
  it("requires an idempotency key for test checkout", () => {
    expect(() =>
      checkoutTestInputSchema.parse({ shippingAddress: {} }),
    ).toThrow();
  });

  it("does not allow evidence without a source or artifact", () => {
    expect(() =>
      submitEvidenceInputSchema.parse({
        passportId: "00000000-0000-4000-8000-000000000001",
        evidenceType: "origin",
        statement: "This statement is long enough.",
      }),
    ).toThrow(/approved source or an uploaded artifact/);
  });

  it("accepts all three evidence-derived passport tiers", () => {
    const base = {
      id: "00000000-0000-4000-8000-000000000001",
      productId: "00000000-0000-4000-8000-000000000002",
      publicId: "00000000-0000-4000-8000-000000000003",
      status: "active" as const,
      issuedAt: "2026-10-23T12:00:00.000Z",
      updatedAt: "2026-10-23T12:00:00.000Z",
    };
    for (const tier of ["unverified", "bronze", "silver", "gold"] as const) {
      expect(passportRecordSchema.parse({ ...base, tier }).tier).toBe(tier);
    }
  });

  it("requires assistant responses to state whether they are grounded", () => {
    expect(() =>
      assistantResponseSchema.parse({
        conversationId: crypto.randomUUID(),
        answer: "Unknown",
        citations: [],
      }),
    ).toThrow();
  });
});
