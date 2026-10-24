import { describe, expect, it } from "vitest";
import type {
  Artisan,
  Cart,
  HeritageSource,
  PassportRecord,
  Product,
  Village,
} from "@craft-trust/contracts";
import {
  CraftTrustError,
  InMemoryCraftTrustClient,
  type InMemoryUser,
} from "../src";

const villageId = "00000000-0000-4000-8000-000000000101";
const artisanId = "00000000-0000-4000-8000-000000000102";
const sellerId = "00000000-0000-4000-8000-000000000103";
const customerId = "00000000-0000-4000-8000-000000000104";
const verifierId = "00000000-0000-4000-8000-000000000105";
const productId = "00000000-0000-4000-8000-000000000106";
const cartId = "00000000-0000-4000-8000-000000000107";
const passportId = "00000000-0000-4000-8000-000000000108";
const sourceId = "00000000-0000-4000-8000-000000000109";

const village: Village = {
  id: villageId,
  slug: "bat-trang",
  name: "Bát Tràng",
  district: "Gia Lâm",
  summary: "A ceramics village",
  story: "Documented local history",
  latitude: 20.975,
  longitude: 105.914,
  coverImageUrl: null,
  isPublished: true,
};
const artisan: Artisan = {
  id: artisanId,
  villageId,
  ownerId: sellerId,
  slug: "nghe-nhan-an",
  name: "Nghệ nhân An",
  bio: "Ceramic artisan",
  portraitUrl: null,
  yearsPracticing: 20,
  isPublished: true,
};
const product: Product = {
  id: productId,
  artisanId,
  slug: "binh-men-lam",
  name: "Bình men lam",
  description: "Handmade vase",
  priceVnd: 750000,
  stockQuantity: 3,
  status: "active",
  modelUrl: null,
  posterUrl: null,
  arUrl: null,
  createdAt: "2026-10-23T00:00:00.000Z",
  media: [],
};
const cart: Cart = {
  id: cartId,
  userId: customerId,
  status: "active",
  createdAt: "2026-10-23T00:00:00.000Z",
  updatedAt: "2026-10-23T00:00:00.000Z",
  items: [],
};
const passport: PassportRecord = {
  id: passportId,
  productId,
  publicId: "00000000-0000-4000-8000-000000000110",
  tier: "unverified",
  status: "draft",
  issuedAt: null,
  updatedAt: "2026-10-23T00:00:00.000Z",
};
const source: HeritageSource = {
  id: sourceId,
  villageId,
  title: "Bát Tràng archival record",
  publisher: "Hanoi Archive",
  sourceUrl: "https://example.org/archive/bat-trang",
  excerpt: "Approved heritage context",
  approvalStatus: "approved",
  approvedBy: verifierId,
  approvedAt: "2026-10-23T00:00:00.000Z",
};

function client(user: InMemoryUser = { id: customerId, roles: ["customer"] }) {
  return new InMemoryCraftTrustClient(
    {
      user,
      villages: [village],
      artisans: [artisan],
      products: [product],
      carts: [cart],
      passports: [passport],
      heritageSources: [source],
      qrTokens: { "secure-qr-token-value": passport.publicId },
      nfcTags: { "04-A1-B2-C3": passport.publicId },
    },
    { canonicalBaseUrl: "https://craft.example" },
  );
}

describe("InMemoryCraftTrustClient", () => {
  it("persists a cart and creates only an explicitly test-mode order", async () => {
    const api = client();
    const updated = await api.addToCart({ productId, quantity: 2 });
    expect(updated.items).toHaveLength(1);
    const order = await api.checkoutTest({
      idempotencyKey: "00000000-0000-4000-8000-000000000201",
      shippingAddress: {
        recipientName: "Lan",
        phone: "0900000000",
        addressLine: "1 Phố Huế, Hai Bà Trưng, Hà Nội",
      },
    });
    expect(order.paymentMode).toBe("test");
    expect(order.status).toBe("placed");
    expect(order.subtotalVnd).toBe(1_500_000);
    await expect(api.getCart()).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("enforces authentication and role authorization", async () => {
    const api = client();
    api.setUser(undefined);
    await expect(api.getCart()).rejects.toMatchObject({
      code: "AUTH_REQUIRED",
    });
    api.setUser({ id: customerId, roles: ["customer"] });
    await expect(api.getAdminDashboard()).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  it("derives gold tier only after all required evidence is approved", async () => {
    const api = client({ id: sellerId, roles: ["seller"] });
    const submitted = [];
    for (const evidenceType of [
      "identity",
      "origin",
      "material",
      "process",
      "heritage_source",
      "verifier_attestation",
    ] as const) {
      submitted.push(
        await api.submitEvidence({
          passportId,
          evidenceType,
          statement: `Documented ${evidenceType} evidence`,
          ...(evidenceType === "heritage_source"
            ? { sourceId }
            : { storagePath: `evidence/${evidenceType}.pdf` }),
        }),
      );
    }
    api.setUser({ id: verifierId, roles: ["verifier"] });
    for (const item of submitted) {
      await api.reviewEvidence({
        evidenceId: item.id,
        decision: "approved",
        notes: "Evidence checked against submitted records",
      });
    }
    const resolved = await api.resolveQr("secure-qr-token-value");
    expect(resolved.passport.tier).toBe("gold");
    expect(resolved.approvedEvidence).toHaveLength(6);

    const issued = await api.issueQrIdentifier(passportId);
    expect((await api.resolveQr(issued.token)).passport.publicId).toBe(
      passport.publicId,
    );
    await api.revokeQrIdentifier(issued.identifierId);
    await expect(api.resolveQr(issued.token)).rejects.toMatchObject({
      code: "NOT_FOUND",
    });

    const nfc = await api.mapNfcTag({
      passportId,
      rawUid: "04-FF-EE-DD",
      targetUrl: `https://craft.example/passport/${passport.publicId}`,
    });
    expect((await api.resolveNfc("04-FF-EE-DD")).passport.tier).toBe("gold");
    await api.revokeNfcMapping(nfc.mappingId);
    await expect(api.resolveNfc("04-FF-EE-DD")).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });

  it("never fabricates an assistant response when no provider is configured", async () => {
    const api = client();
    await expect(
      api.askAssistant({ question: "How is this ceramic made?" }),
    ).rejects.toEqual(
      expect.objectContaining<Partial<CraftTrustError>>({
        code: "UNAVAILABLE",
      }),
    );
  });

  it("does not expose a draft passport through public identifiers", async () => {
    const api = client();
    await expect(api.resolveNfc("04-A1-B2-C3")).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });
});
