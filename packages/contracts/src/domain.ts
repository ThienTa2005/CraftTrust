import { z } from "zod";
import {
  isoDateSchema,
  nonNegativeIntegerSchema,
  positiveIntegerSchema,
  slugSchema,
  urlSchema,
  uuidSchema,
  vndSchema,
} from "./common";

export const USER_ROLES = [
  "customer",
  "artisan",
  "seller",
  "verifier",
  "admin",
] as const;
export const userRoleSchema = z.enum(USER_ROLES);
export type UserRole = z.infer<typeof userRoleSchema>;

export const PRODUCT_STATUSES = ["draft", "active", "archived"] as const;
export const productStatusSchema = z.enum(PRODUCT_STATUSES);
export type ProductStatus = z.infer<typeof productStatusSchema>;

export const CART_STATUSES = ["active", "converted", "abandoned"] as const;
export const cartStatusSchema = z.enum(CART_STATUSES);
export type CartStatus = z.infer<typeof cartStatusSchema>;

export const ORDER_STATUSES = [
  "placed",
  "processing",
  "fulfilled",
  "cancelled",
] as const;
export const orderStatusSchema = z.enum(ORDER_STATUSES);
export type OrderStatus = z.infer<typeof orderStatusSchema>;

export const PAYMENT_STATUSES = ["test_succeeded", "test_failed"] as const;
export const paymentStatusSchema = z.enum(PAYMENT_STATUSES);
export type PaymentStatus = z.infer<typeof paymentStatusSchema>;

export const PASSPORT_TIERS = [
  "unverified",
  "bronze",
  "silver",
  "gold",
] as const;
export const passportTierSchema = z.enum(PASSPORT_TIERS);
export type PassportTier = z.infer<typeof passportTierSchema>;

export const PASSPORT_STATUSES = ["draft", "active", "revoked"] as const;
export const passportStatusSchema = z.enum(PASSPORT_STATUSES);
export type PassportStatus = z.infer<typeof passportStatusSchema>;

export const EVIDENCE_TYPES = [
  "identity",
  "origin",
  "material",
  "process",
  "heritage_source",
  "verifier_attestation",
] as const;
export const evidenceTypeSchema = z.enum(EVIDENCE_TYPES);
export type EvidenceType = z.infer<typeof evidenceTypeSchema>;

export const REVIEW_STATUSES = ["pending", "approved", "rejected"] as const;
export const reviewStatusSchema = z.enum(REVIEW_STATUSES);
export type ReviewStatus = z.infer<typeof reviewStatusSchema>;

export const IDENTIFIER_STATUSES = ["active", "revoked"] as const;
export const identifierStatusSchema = z.enum(IDENTIFIER_STATUSES);
export type IdentifierStatus = z.infer<typeof identifierStatusSchema>;

const nullableUrlSchema = urlSchema.nullable();

export const villageSchema = z.object({
  id: uuidSchema,
  slug: slugSchema,
  name: z.string().min(1).max(160),
  district: z.string().min(1).max(160),
  summary: z.string().min(1),
  story: z.string(),
  latitude: z.number().min(-90).max(90).nullable(),
  longitude: z.number().min(-180).max(180).nullable(),
  coverImageUrl: nullableUrlSchema,
  isPublished: z.boolean(),
});
export type Village = z.infer<typeof villageSchema>;

export const artisanSchema = z.object({
  id: uuidSchema,
  villageId: uuidSchema,
  ownerId: uuidSchema.nullable(),
  slug: slugSchema,
  name: z.string().min(1).max(160),
  bio: z.string(),
  portraitUrl: nullableUrlSchema,
  yearsPracticing: nonNegativeIntegerSchema,
  isPublished: z.boolean(),
});
export type Artisan = z.infer<typeof artisanSchema>;

export const productMediaSchema = z.object({
  id: uuidSchema,
  productId: uuidSchema,
  kind: z.enum(["image", "video", "model", "ar_asset"]),
  url: urlSchema,
  alt: z.string(),
  sortOrder: nonNegativeIntegerSchema,
});
export type ProductMedia = z.infer<typeof productMediaSchema>;

export const productSchema = z.object({
  id: uuidSchema,
  artisanId: uuidSchema,
  slug: slugSchema,
  name: z.string().min(1).max(200),
  description: z.string(),
  priceVnd: vndSchema,
  stockQuantity: nonNegativeIntegerSchema,
  status: productStatusSchema,
  modelUrl: nullableUrlSchema,
  posterUrl: nullableUrlSchema,
  arUrl: nullableUrlSchema,
  createdAt: isoDateSchema,
  media: z.array(productMediaSchema).default([]),
});
export type Product = z.infer<typeof productSchema>;

export const cartItemSchema = z.object({
  productId: uuidSchema,
  quantity: positiveIntegerSchema,
  unitPriceVnd: vndSchema,
  product: productSchema.optional(),
});
export type CartItem = z.infer<typeof cartItemSchema>;

export const cartSchema = z.object({
  id: uuidSchema,
  userId: uuidSchema,
  status: cartStatusSchema,
  createdAt: isoDateSchema,
  updatedAt: isoDateSchema,
  items: z.array(cartItemSchema),
});
export type Cart = z.infer<typeof cartSchema>;

export const shippingAddressSchema = z.object({
  recipientName: z.string().min(1).max(160),
  phone: z.string().min(8).max(30),
  addressLine: z.string().min(1).max(500),
  notes: z.string().max(1000).optional(),
});
export type ShippingAddress = z.infer<typeof shippingAddressSchema>;

export const orderItemSchema = z.object({
  id: uuidSchema,
  orderId: uuidSchema,
  productId: uuidSchema,
  productName: z.string().min(1),
  quantity: positiveIntegerSchema,
  unitPriceVnd: vndSchema,
});
export type OrderItem = z.infer<typeof orderItemSchema>;

export const orderSchema = z.object({
  id: uuidSchema,
  userId: uuidSchema,
  status: orderStatusSchema,
  subtotalVnd: vndSchema,
  paymentMode: z.literal("test"),
  shippingAddress: shippingAddressSchema,
  createdAt: isoDateSchema,
  items: z.array(orderItemSchema),
});
export type Order = z.infer<typeof orderSchema>;

export const passportRecordSchema = z.object({
  id: uuidSchema,
  productId: uuidSchema,
  publicId: uuidSchema,
  tier: passportTierSchema,
  status: passportStatusSchema,
  issuedAt: isoDateSchema.nullable(),
  updatedAt: isoDateSchema,
});
export type PassportRecord = z.infer<typeof passportRecordSchema>;

export const heritageSourceSchema = z.object({
  id: uuidSchema,
  villageId: uuidSchema,
  title: z.string().min(1),
  publisher: z.string().min(1),
  sourceUrl: urlSchema,
  excerpt: z.string(),
  approvalStatus: reviewStatusSchema,
  approvedBy: uuidSchema.nullable(),
  approvedAt: isoDateSchema.nullable(),
});
export type HeritageSource = z.infer<typeof heritageSourceSchema>;

export const evidenceSubmissionSchema = z.object({
  id: uuidSchema,
  passportId: uuidSchema,
  evidenceType: evidenceTypeSchema,
  sourceId: uuidSchema.nullable(),
  storagePath: z.string().min(1).nullable(),
  statement: z.string().min(1),
  status: reviewStatusSchema,
  submittedBy: uuidSchema,
  reviewedBy: uuidSchema.nullable(),
  reviewNotes: z.string().nullable(),
  reviewedAt: isoDateSchema.nullable(),
  createdAt: isoDateSchema,
});
export type EvidenceSubmission = z.infer<typeof evidenceSubmissionSchema>;

export const verificationReviewSchema = z.object({
  id: uuidSchema,
  evidenceId: uuidSchema,
  decision: z.enum(["approved", "rejected"]),
  notes: z.string(),
  reviewerId: uuidSchema,
  createdAt: isoDateSchema,
});
export type VerificationReview = z.infer<typeof verificationReviewSchema>;

export const passportResolutionSchema = z.object({
  passport: passportRecordSchema,
  product: productSchema,
  artisan: artisanSchema,
  village: villageSchema,
  approvedEvidence: z.array(evidenceSubmissionSchema),
  canonicalUrl: z.union([
    urlSchema,
    z.string().regex(/^\/passport\/[0-9a-f-]+$/i),
  ]),
});
export type PassportResolution = z.infer<typeof passportResolutionSchema>;

export const addToCartInputSchema = z.object({
  productId: uuidSchema,
  quantity: positiveIntegerSchema.max(99),
});
export type AddToCartInput = z.infer<typeof addToCartInputSchema>;

export const updateCartItemInputSchema = z.object({
  productId: uuidSchema,
  quantity: positiveIntegerSchema.max(99),
});
export type UpdateCartItemInput = z.infer<typeof updateCartItemInputSchema>;

export const checkoutTestInputSchema = z.object({
  shippingAddress: shippingAddressSchema,
  idempotencyKey: z.string().uuid(),
});
export type CheckoutTestInput = z.infer<typeof checkoutTestInputSchema>;

export const submitEvidenceInputSchema = z
  .object({
    passportId: uuidSchema,
    evidenceType: evidenceTypeSchema,
    sourceId: uuidSchema.nullable().optional(),
    storagePath: z.string().min(1).nullable().optional(),
    statement: z.string().min(10).max(5000),
  })
  .refine((value) => value.sourceId != null || value.storagePath != null, {
    message: "Evidence requires an approved source or an uploaded artifact",
  });
export type SubmitEvidenceInput = z.infer<typeof submitEvidenceInputSchema>;

export const reviewEvidenceInputSchema = z.object({
  evidenceId: uuidSchema,
  decision: z.enum(["approved", "rejected"]),
  notes: z.string().min(3).max(5000),
});
export type ReviewEvidenceInput = z.infer<typeof reviewEvidenceInputSchema>;

export const productFiltersSchema = z.object({
  villageId: uuidSchema.optional(),
  artisanId: uuidSchema.optional(),
  query: z.string().trim().min(1).max(120).optional(),
  limit: z.number().int().min(1).max(100).default(20),
  offset: z.number().int().nonnegative().default(0),
});
export type ProductFilters = z.input<typeof productFiltersSchema>;

export const artisanFiltersSchema = z.object({
  villageId: uuidSchema.optional(),
  query: z.string().trim().min(1).max(120).optional(),
  limit: z.number().int().min(1).max(100).default(20),
  offset: z.number().int().nonnegative().default(0),
});
export type ArtisanFilters = z.input<typeof artisanFiltersSchema>;

export const knowledgeSourceSchema = z.object({
  id: uuidSchema,
  title: z.string().min(1),
  publisher: z.string().min(1),
  sourceUrl: urlSchema,
});
export type KnowledgeSource = z.infer<typeof knowledgeSourceSchema>;

export const knowledgeChunkSchema = z.object({
  id: uuidSchema,
  sourceId: uuidSchema,
  content: z.string().min(1),
  source: knowledgeSourceSchema,
  similarity: z.number().min(0).max(1),
});
export type KnowledgeChunk = z.infer<typeof knowledgeChunkSchema>;

export const approvedKnowledgeSearchSchema = z.object({
  query: z.string().trim().min(3).max(1000),
  limit: z.number().int().min(1).max(20).default(5),
});
export type ApprovedKnowledgeSearch = z.input<
  typeof approvedKnowledgeSearchSchema
>;

export const assistantCitationSchema = z.object({
  sourceId: uuidSchema,
  title: z.string().min(1),
  sourceUrl: urlSchema,
  chunkId: uuidSchema,
});
export type AssistantCitation = z.infer<typeof assistantCitationSchema>;

export const assistantRequestSchema = z.object({
  question: z.string().trim().min(3).max(2000),
  conversationId: uuidSchema.optional(),
  villageId: uuidSchema.optional(),
});
export type AssistantRequest = z.input<typeof assistantRequestSchema>;

export const assistantResponseSchema = z.object({
  conversationId: uuidSchema,
  answer: z.string().min(1),
  citations: z.array(assistantCitationSchema),
  grounded: z.boolean(),
  unavailableReason: z.string().optional(),
});
export type AssistantResponse = z.infer<typeof assistantResponseSchema>;

export const sellerDashboardSchema = z.object({
  artisanCount: nonNegativeIntegerSchema,
  activeProductCount: nonNegativeIntegerSchema,
  draftProductCount: nonNegativeIntegerSchema,
  orderCount: nonNegativeIntegerSchema,
  pendingEvidenceCount: nonNegativeIntegerSchema,
});
export type SellerDashboard = z.infer<typeof sellerDashboardSchema>;

export const adminDashboardSchema = z.object({
  pendingEvidenceCount: nonNegativeIntegerSchema,
  approvedEvidenceCount: nonNegativeIntegerSchema,
  activePassportCount: nonNegativeIntegerSchema,
  revokedPassportCount: nonNegativeIntegerSchema,
  auditEventCount: nonNegativeIntegerSchema,
});
export type AdminDashboard = z.infer<typeof adminDashboardSchema>;

export const qrIdentifierSchema = z.object({
  id: uuidSchema,
  passportId: uuidSchema,
  status: identifierStatusSchema,
  issuedAt: isoDateSchema,
  revokedAt: isoDateSchema.nullable(),
});
export type QrIdentifier = z.infer<typeof qrIdentifierSchema>;

export const nfcMappingSchema = z.object({
  id: uuidSchema,
  passportId: uuidSchema,
  targetUrl: urlSchema,
  status: identifierStatusSchema,
  createdAt: isoDateSchema,
});
export type NfcMapping = z.infer<typeof nfcMappingSchema>;

export const issueQrIdentifierResultSchema = z.object({
  identifierId: uuidSchema,
  token: z.string().min(32),
  resolverPath: z.string().regex(/^\/passport\/qr\//),
});
export type IssueQrIdentifierResult = z.infer<
  typeof issueQrIdentifierResultSchema
>;

export const mapNfcTagInputSchema = z.object({
  passportId: uuidSchema,
  rawUid: z.string().trim().min(4).max(256),
  targetUrl: z
    .string()
    .url()
    .refine((url) => url.startsWith("https://"), "NFC target must use HTTPS"),
});
export type MapNfcTagInput = z.infer<typeof mapNfcTagInputSchema>;

export const mapNfcTagResultSchema = z.object({
  mappingId: uuidSchema,
  passportId: uuidSchema,
  targetUrl: urlSchema,
});
export type MapNfcTagResult = z.infer<typeof mapNfcTagResultSchema>;

export const revokeIdentifierResultSchema = z.object({
  id: uuidSchema,
  status: z.literal("revoked"),
});
export type RevokeIdentifierResult = z.infer<
  typeof revokeIdentifierResultSchema
>;

// --- Advanced Feature 1 & 4: 3D Glazes, Materials & Engraving ---
export const GLAZE_TYPES = ["hoa-bien", "ran-co", "men-lam", "men-ngoc"] as const;
export const glazeTypeSchema = z.enum(GLAZE_TYPES);
export type GlazeType = z.infer<typeof glazeTypeSchema>;

export const glazeOptionSchema = z.object({
  id: glazeTypeSchema,
  nameVi: z.string().min(1),
  nameEn: z.string().min(1),
  descriptionVi: z.string().min(1),
  descriptionEn: z.string().min(1),
  baseColor: z.string(), // Hex color
  roughness: z.number().min(0).max(1),
  metallic: z.number().min(0).max(1),
  historyVi: z.string().min(1),
  historyEn: z.string().min(1),
});
export type GlazeOption = z.infer<typeof glazeOptionSchema>;

export const engravingConfigSchema = z.object({
  text: z.string().max(80),
  fontStyle: z.enum(["calligraphy", "serif", "modern"]),
  placement: z.enum(["front", "neck", "base"]),
  finishStyle: z.enum(["engraved-clay", "gilded-gold", "cobalt-brush"]),
  customNote: z.string().max(200).optional(),
});
export type EngravingConfig = z.infer<typeof engravingConfigSchema>;

export const roomComboItemSchema = z.object({
  id: z.string(),
  nameVi: z.string(),
  nameEn: z.string(),
  craft: z.string(),
  village: z.string(),
  priceVnd: vndSchema,
  scaleLabel: z.string(),
  image: z.string(),
  modelUrl: z.string().optional(),
});
export type RoomComboItem = z.infer<typeof roomComboItemSchema>;

export const roomComboSchema = z.object({
  id: z.string(),
  titleVi: z.string(),
  titleEn: z.string(),
  descriptionVi: z.string(),
  descriptionEn: z.string(),
  items: z.array(roomComboItemSchema),
  totalDiscountPercent: z.number().min(0).max(50),
});
export type RoomCombo = z.infer<typeof roomComboSchema>;

// --- Advanced Feature 2: Timeline & OCOP Passport Details ---
export const passportTimelineStepSchema = z.object({
  stepNumber: z.number().int().positive(),
  titleVi: z.string(),
  titleEn: z.string(),
  stageNameVi: z.string(),
  stageNameEn: z.string(),
  descriptionVi: z.string(),
  descriptionEn: z.string(),
  timestampLabelVi: z.string(),
  timestampLabelEn: z.string(),
  artisanNoteVi: z.string().optional(),
  artisanNoteEn: z.string().optional(),
  imageUrl: z.string().optional(),
});
export type PassportTimelineStep = z.infer<typeof passportTimelineStepSchema>;

export const ocopCertificateInfoSchema = z.object({
  stars: z.number().min(3).max(5),
  certificateNumber: z.string(),
  issueDate: z.string(),
  authorityVi: z.string(),
  authorityEn: z.string(),
  productCategoryVi: z.string(),
  productCategoryEn: z.string(),
  validUntil: z.string(),
});
export type OcopCertificateInfo = z.infer<typeof ocopCertificateInfoSchema>;

// --- Advanced Feature 5: Loyalty Points & Rewards ---
export const MEMBER_TIERS = ["apprentice", "enthusiast", "connoisseur", "ambassador"] as const;
export const memberTierSchema = z.enum(MEMBER_TIERS);
export type MemberTier = z.infer<typeof memberTierSchema>;

export const rewardItemSchema = z.object({
  id: z.string(),
  type: z.enum(["discount_voucher", "workshop_ticket", "masterclass", "vip_tour"]),
  titleVi: z.string(),
  titleEn: z.string(),
  descriptionVi: z.string(),
  descriptionEn: z.string(),
  pointsRequired: z.number().int().positive(),
  discountVnd: vndSchema.optional(),
  village: z.string().optional(),
  badgeVi: z.string(),
  badgeEn: z.string(),
  image: z.string(),
});
export type RewardItem = z.infer<typeof rewardItemSchema>;

export const redeemedVoucherSchema = z.object({
  id: z.string(),
  rewardId: z.string(),
  titleVi: z.string(),
  titleEn: z.string(),
  code: z.string(),
  qrCodeUrl: z.string(),
  redeemedAt: z.string(),
  status: z.enum(["active", "used", "expired"]),
  discountVnd: vndSchema.optional(),
  village: z.string().optional(),
});
export type RedeemedVoucher = z.infer<typeof redeemedVoucherSchema>;

// --- Advanced Feature 6: Craft Map & Tourism ---
export const craftMapLocationSchema = z.object({
  id: z.string(),
  slug: z.string(),
  nameVi: z.string(),
  nameEn: z.string(),
  type: z.enum(["craft_village", "tourism_attraction", "artisan_workshop"]),
  categoryVi: z.string(),
  categoryEn: z.string(),
  district: z.string(),
  coordinates: z.object({
    lat: z.number(),
    lng: z.number(),
  }),
  distanceKmFromCenter: z.number(),
  travelTimeMins: z.number(),
  summaryVi: z.string(),
  summaryEn: z.string(),
  highlightsVi: z.array(z.string()),
  highlightsEn: z.array(z.string()),
  openingHoursVi: z.string(),
  openingHoursEn: z.string(),
  contactHotline: z.string().optional(),
  imageUrl: z.string(),
  villageSlug: z.string().optional(),
});
export type CraftMapLocation = z.infer<typeof craftMapLocationSchema>;

export const tourItinerarySchema = z.object({
  id: z.string(),
  titleVi: z.string(),
  titleEn: z.string(),
  subtitleVi: z.string(),
  subtitleEn: z.string(),
  durationLabelVi: z.string(),
  durationLabelEn: z.string(),
  locationIds: z.array(z.string()),
  recommendedTransportVi: z.string(),
  recommendedTransportEn: z.string(),
  descriptionVi: z.string(),
  descriptionEn: z.string(),
});
export type TourItinerary = z.infer<typeof tourItinerarySchema>;
