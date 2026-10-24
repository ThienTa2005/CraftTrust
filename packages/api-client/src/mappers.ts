import {
  artisanSchema,
  cartSchema,
  evidenceSubmissionSchema,
  heritageSourceSchema,
  knowledgeChunkSchema,
  orderSchema,
  passportRecordSchema,
  passportResolutionSchema,
  productMediaSchema,
  productSchema,
  shippingAddressSchema,
  villageSchema,
  type Artisan,
  type Cart,
  type EvidenceSubmission,
  type HeritageSource,
  type KnowledgeChunk,
  type Order,
  type PassportRecord,
  type PassportResolution,
  type Product,
  type ProductMedia,
  type Village,
} from "@craft-trust/contracts";

type Row = Record<string, unknown>;

function row(value: unknown): Row {
  if (typeof value !== "object" || value === null)
    throw new TypeError("Expected a database row");
  return value as Row;
}

function records(value: unknown): readonly unknown[] {
  return Array.isArray(value) ? value : [];
}

export function mapVillage(value: unknown): Village {
  const r = row(value);
  const coordinates =
    typeof r.coordinates === "object" && r.coordinates !== null
      ? (r.coordinates as Row)
      : {};
  return villageSchema.parse({
    id: r.id,
    slug: r.slug,
    name: r.name,
    district: r.district,
    summary: r.summary,
    story: r.story,
    latitude: coordinates.latitude ?? null,
    longitude: coordinates.longitude ?? null,
    coverImageUrl: r.cover_image_url ?? null,
    isPublished: r.is_published,
  });
}

export function mapArtisan(value: unknown): Artisan {
  const r = row(value);
  return artisanSchema.parse({
    id: r.id,
    villageId: r.village_id,
    ownerId: r.owner_id ?? null,
    slug: r.slug,
    name: r.name,
    bio: r.bio,
    portraitUrl: r.portrait_url ?? null,
    yearsPracticing: r.years_practicing,
    isPublished: r.is_published,
  });
}

export function mapProductMedia(value: unknown): ProductMedia {
  const r = row(value);
  return productMediaSchema.parse({
    id: r.id,
    productId: r.product_id,
    kind: r.kind,
    url: r.url,
    alt: r.alt,
    sortOrder: r.sort_order,
  });
}

export function mapProduct(value: unknown): Product {
  const r = row(value);
  return productSchema.parse({
    id: r.id,
    artisanId: r.artisan_id,
    slug: r.slug,
    name: r.name,
    description: r.description,
    priceVnd: r.price_vnd,
    stockQuantity: r.stock_quantity,
    status: r.status,
    modelUrl: r.model_url ?? null,
    posterUrl: r.poster_url ?? null,
    arUrl: r.ar_url ?? null,
    createdAt: r.created_at,
    media: records(r.product_media ?? r.media).map(mapProductMedia),
  });
}

export function mapCart(value: unknown): Cart {
  const r = row(value);
  return cartSchema.parse({
    id: r.id,
    userId: r.user_id,
    status: r.status,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    items: records(r.cart_items ?? r.items).map((item) => {
      const i = row(item);
      const nestedProduct = i.products ?? i.product;
      return {
        productId: i.product_id,
        quantity: i.quantity,
        unitPriceVnd: i.unit_price_vnd,
        ...(nestedProduct == null
          ? {}
          : { product: mapProduct(nestedProduct) }),
      };
    }),
  });
}

export function mapOrder(value: unknown): Order {
  const r = row(value);
  return orderSchema.parse({
    id: r.id,
    userId: r.user_id,
    status: r.status,
    subtotalVnd: r.subtotal_vnd,
    paymentMode: r.payment_mode,
    shippingAddress: shippingAddressSchema.parse(r.shipping_address),
    createdAt: r.created_at,
    items: records(r.order_items ?? r.items).map((item) => {
      const i = row(item);
      return {
        id: i.id,
        orderId: i.order_id,
        productId: i.product_id,
        productName: i.product_name,
        quantity: i.quantity,
        unitPriceVnd: i.unit_price_vnd,
      };
    }),
  });
}

export function mapPassportRecord(value: unknown): PassportRecord {
  const r = row(value);
  return passportRecordSchema.parse({
    id: r.id,
    productId: r.product_id,
    publicId: r.public_id,
    tier: r.tier,
    status: r.status,
    issuedAt: r.issued_at ?? null,
    updatedAt: r.updated_at,
  });
}

export function mapHeritageSource(value: unknown): HeritageSource {
  const r = row(value);
  return heritageSourceSchema.parse({
    id: r.id,
    villageId: r.village_id,
    title: r.title,
    publisher: r.publisher,
    sourceUrl: r.source_url,
    excerpt: r.excerpt,
    approvalStatus: r.approval_status,
    approvedBy: r.approved_by ?? null,
    approvedAt: r.approved_at ?? null,
  });
}

export function mapEvidence(value: unknown): EvidenceSubmission {
  const r = row(value);
  return evidenceSubmissionSchema.parse({
    id: r.id,
    passportId: r.passport_id,
    evidenceType: r.evidence_type,
    sourceId: r.source_id ?? null,
    storagePath: r.storage_path ?? null,
    statement: r.statement,
    status: r.status,
    submittedBy: r.submitted_by,
    reviewedBy: r.reviewed_by ?? null,
    reviewNotes: r.review_notes ?? null,
    reviewedAt: r.reviewed_at ?? null,
    createdAt: r.created_at,
  });
}

export function mapPassportResolution(value: unknown): PassportResolution {
  const r = row(value);
  return passportResolutionSchema.parse({
    passport: mapPassportRecord(r.passport),
    product: mapProduct(r.product),
    artisan: mapArtisan(r.artisan),
    village: mapVillage(r.village),
    approvedEvidence: records(r.approved_evidence ?? r.approvedEvidence).map(
      mapEvidence,
    ),
    canonicalUrl: r.canonical_url ?? r.canonicalUrl,
  });
}

export function mapKnowledgeChunk(value: unknown): KnowledgeChunk {
  const r = row(value);
  return knowledgeChunkSchema.parse({
    id: r.chunk_id ?? r.id,
    sourceId: r.source_id,
    content: r.content,
    similarity: r.rank ?? r.similarity,
    source: r.source ?? {
      id: r.source_id,
      title: r.source_title,
      publisher: r.publisher,
      sourceUrl: r.source_url,
    },
  });
}
