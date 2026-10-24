import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  addToCartInputSchema,
  adminDashboardSchema,
  approvedKnowledgeSearchSchema,
  artisanFiltersSchema,
  assistantRequestSchema,
  assistantResponseSchema,
  checkoutTestInputSchema,
  issueQrIdentifierResultSchema,
  mapNfcTagInputSchema,
  mapNfcTagResultSchema,
  paginationSchema,
  productFiltersSchema,
  reviewEvidenceInputSchema,
  revokeIdentifierResultSchema,
  sellerDashboardSchema,
  submitEvidenceInputSchema,
  updateCartItemInputSchema,
  uuidSchema,
  type Artisan,
  type AssistantResponse,
  type Cart,
  type Database,
  type EvidenceSubmission,
  type Json,
  type KnowledgeChunk,
  type Order,
  type PassportRecord,
  type PassportResolution,
  type Product,
  type Village,
} from "@craft-trust/contracts";
import {
  assertPresent,
  CraftTrustError,
  normalizeCraftTrustError,
} from "./errors";
import {
  mapArtisan,
  mapCart,
  mapEvidence,
  mapKnowledgeChunk,
  mapOrder,
  mapPassportRecord,
  mapProduct,
  mapVillage,
} from "./mappers";
import type {
  CraftTrustClient,
  CraftTrustClientOptions,
  ListOptions,
  ServerClientOptions,
} from "./types";

const PRODUCT_SELECT = "*, product_media(*)";
const CART_SELECT = "*, cart_items(*, products(*, product_media(*)))";
const ORDER_SELECT = "*, order_items(*)";

export class SupabaseCraftTrustClient implements CraftTrustClient {
  constructor(
    private readonly supabase: SupabaseClient<Database>,
    private readonly options: CraftTrustClientOptions = {},
  ) {}

  private async run<T>(operation: () => Promise<T>): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      throw normalizeCraftTrustError(error);
    }
  }

  private async userId(): Promise<string> {
    const { data, error } = await this.supabase.auth.getUser();
    if (error) throw error;
    if (!data.user)
      throw new CraftTrustError("AUTH_REQUIRED", "Sign in to continue", {
        status: 401,
      });
    return data.user.id;
  }

  async listVillages(options: ListOptions = {}): Promise<readonly Village[]> {
    return this.run(async () => {
      const { limit, offset } = paginationSchema.parse(options);
      const { data, error } = await this.supabase
        .from("villages")
        .select("*")
        .eq("is_published", true)
        .order("name")
        .range(offset, offset + limit - 1);
      if (error) throw error;
      return (data ?? []).map(mapVillage);
    });
  }

  async getVillageBySlug(slug: string): Promise<Village> {
    return this.run(async () => {
      const { data, error } = await this.supabase
        .from("villages")
        .select("*")
        .eq("slug", slug)
        .eq("is_published", true)
        .maybeSingle();
      if (error) throw error;
      return mapVillage(assertPresent(data, "Village not found"));
    });
  }

  async listArtisans(filters = {}): Promise<readonly Artisan[]> {
    return this.run(async () => {
      const parsed = artisanFiltersSchema.parse(filters);
      let query = this.supabase
        .from("artisans")
        .select("*")
        .eq("is_published", true)
        .order("name");
      if (parsed.villageId) query = query.eq("village_id", parsed.villageId);
      if (parsed.query) query = query.ilike("name", `%${parsed.query}%`);
      const { data, error } = await query.range(
        parsed.offset,
        parsed.offset + parsed.limit - 1,
      );
      if (error) throw error;
      return (data ?? []).map(mapArtisan);
    });
  }

  async getArtisanBySlug(slug: string): Promise<Artisan> {
    return this.run(async () => {
      const { data, error } = await this.supabase
        .from("artisans")
        .select("*")
        .eq("slug", slug)
        .eq("is_published", true)
        .maybeSingle();
      if (error) throw error;
      return mapArtisan(assertPresent(data, "Artisan not found"));
    });
  }

  async listProducts(filters = {}): Promise<readonly Product[]> {
    return this.run(async () => {
      const parsed = productFiltersSchema.parse(filters);
      let artisanIds: readonly string[] | undefined;
      if (parsed.villageId) {
        const { data, error } = await this.supabase
          .from("artisans")
          .select("id")
          .eq("village_id", parsed.villageId)
          .eq("is_published", true);
        if (error) throw error;
        artisanIds = (data ?? []).map((item) => item.id);
        if (artisanIds.length === 0) return [];
      }
      let query = this.supabase
        .from("products")
        .select(PRODUCT_SELECT)
        .eq("status", "active")
        .order("created_at", { ascending: false });
      if (parsed.artisanId) query = query.eq("artisan_id", parsed.artisanId);
      if (artisanIds) query = query.in("artisan_id", [...artisanIds]);
      if (parsed.query) query = query.ilike("name", `%${parsed.query}%`);
      const { data, error } = await query.range(
        parsed.offset,
        parsed.offset + parsed.limit - 1,
      );
      if (error) throw error;
      return (data ?? []).map(mapProduct);
    });
  }

  async getProductBySlug(slug: string): Promise<Product> {
    return this.run(async () => {
      const { data, error } = await this.supabase
        .from("products")
        .select(PRODUCT_SELECT)
        .eq("slug", slug)
        .eq("status", "active")
        .maybeSingle();
      if (error) throw error;
      return mapProduct(assertPresent(data, "Product not found"));
    });
  }

  private async productById(productId: string): Promise<Product> {
    const { data, error } = await this.supabase
      .from("products")
      .select(PRODUCT_SELECT)
      .eq("id", productId)
      .maybeSingle();
    if (error) throw error;
    return mapProduct(assertPresent(data, "Product not found"));
  }

  async getCart(): Promise<Cart> {
    return this.run(async () => {
      const userId = await this.userId();
      const { data, error } = await this.supabase
        .from("carts")
        .select(CART_SELECT)
        .eq("user_id", userId)
        .eq("status", "active")
        .maybeSingle();
      if (error) throw error;
      return mapCart(assertPresent(data, "No active cart"));
    });
  }

  async addToCart(
    input: Parameters<CraftTrustClient["addToCart"]>[0],
  ): Promise<Cart> {
    return this.run(async () => {
      const parsed = addToCartInputSchema.parse(input);
      const { error } = await this.supabase.rpc("add_to_cart", {
        p_product_id: parsed.productId,
        p_quantity: parsed.quantity,
      });
      if (error) throw error;
      return this.getCart();
    });
  }

  async updateCartItem(
    input: Parameters<CraftTrustClient["updateCartItem"]>[0],
  ): Promise<Cart> {
    return this.run(async () => {
      const parsed = updateCartItemInputSchema.parse(input);
      const cart = await this.getCart();
      const { error } = await this.supabase
        .from("cart_items")
        .update({ quantity: parsed.quantity })
        .eq("cart_id", cart.id)
        .eq("product_id", parsed.productId);
      if (error) throw error;
      return this.getCart();
    });
  }

  async removeCartItem(productId: string): Promise<Cart> {
    return this.run(async () => {
      const id = uuidSchema.parse(productId);
      const cart = await this.getCart();
      const { error } = await this.supabase
        .from("cart_items")
        .delete()
        .eq("cart_id", cart.id)
        .eq("product_id", id);
      if (error) throw error;
      return this.getCart();
    });
  }

  async checkoutTest(
    input: Parameters<CraftTrustClient["checkoutTest"]>[0],
  ): Promise<Order> {
    return this.run(async () => {
      const parsed = checkoutTestInputSchema.parse(input);
      const { data, error } = await this.supabase.rpc("checkout_test_cart", {
        p_shipping_address: {
          recipient_name: parsed.shippingAddress.recipientName,
          phone: parsed.shippingAddress.phone,
          address_line: parsed.shippingAddress.addressLine,
          ...(parsed.shippingAddress.notes
            ? { notes: parsed.shippingAddress.notes }
            : {}),
        } as Json,
        p_idempotency_key: parsed.idempotencyKey,
      });
      if (error) throw error;
      const result = data as { order_id?: unknown } | null;
      if (!result || typeof result.order_id !== "string")
        throw new CraftTrustError(
          "BACKEND_ERROR",
          "Checkout returned an invalid order reference",
        );
      return this.getOrder(result.order_id);
    });
  }

  async listOrders(): Promise<readonly Order[]> {
    return this.run(async () => {
      const userId = await this.userId();
      const { data, error } = await this.supabase
        .from("orders")
        .select(ORDER_SELECT)
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map(mapOrder);
    });
  }

  async getOrder(orderId: string): Promise<Order> {
    return this.run(async () => {
      const id = uuidSchema.parse(orderId);
      const { data, error } = await this.supabase
        .from("orders")
        .select(ORDER_SELECT)
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return mapOrder(assertPresent(data, "Order not found"));
    });
  }

  async getPassport(publicId: string): Promise<PassportResolution> {
    return this.run(async () => {
      const parsedPublicId = uuidSchema.parse(publicId);
      const { data: passportData, error: passportError } = await this.supabase
        .from("passport_records")
        .select("*")
        .eq("public_id", parsedPublicId)
        .eq("status", "active")
        .maybeSingle();
      if (passportError) throw passportError;
      const passport = mapPassportRecord(
        assertPresent(passportData, "Passport not found"),
      );
      const product = await this.productById(passport.productId);
      const { data: artisanData, error: artisanError } = await this.supabase
        .from("artisans")
        .select("*")
        .eq("id", product.artisanId)
        .maybeSingle();
      if (artisanError) throw artisanError;
      const artisan = mapArtisan(
        assertPresent(artisanData, "Passport artisan not found"),
      );
      const { data: villageData, error: villageError } = await this.supabase
        .from("villages")
        .select("*")
        .eq("id", artisan.villageId)
        .maybeSingle();
      if (villageError) throw villageError;
      const village = mapVillage(
        assertPresent(villageData, "Passport village not found"),
      );
      const { data: evidenceData, error: evidenceError } = await this.supabase
        .from("evidence_submissions")
        .select("*")
        .eq("passport_id", passport.id)
        .eq("status", "approved")
        .order("created_at");
      if (evidenceError) throw evidenceError;
      return {
        passport,
        product,
        artisan,
        village,
        approvedEvidence: (evidenceData ?? []).map(mapEvidence),
        canonicalUrl: `/passport/${encodeURIComponent(passport.publicId)}`,
      } as PassportResolution;
    });
  }

  resolvePassport(publicId: string): Promise<PassportResolution> {
    return this.getPassport(publicId);
  }

  async resolveQr(token: string): Promise<PassportResolution> {
    return this.run(async () => {
      if (token.length < 16)
        throw new CraftTrustError("VALIDATION_ERROR", "Invalid QR token", {
          status: 400,
        });
      const { data, error } = await this.supabase.rpc("resolve_qr_identifier", {
        p_token: token,
      });
      if (error) throw error;
      const result = data as { public_id?: unknown } | null;
      if (!result || typeof result.public_id !== "string")
        throw new CraftTrustError(
          "NOT_FOUND",
          "QR identifier not found or revoked",
          { status: 404 },
        );
      return this.getPassport(result.public_id);
    });
  }

  async resolveNfc(tagUid: string): Promise<PassportResolution> {
    return this.run(async () => {
      if (tagUid.trim().length < 4)
        throw new CraftTrustError(
          "VALIDATION_ERROR",
          "Invalid NFC tag identifier",
          { status: 400 },
        );
      const { data, error } = await this.supabase.rpc("resolve_nfc_tag", {
        p_raw_uid: tagUid,
      });
      if (error) throw error;
      const result = data as { public_id?: unknown } | null;
      if (!result || typeof result.public_id !== "string")
        throw new CraftTrustError(
          "NOT_FOUND",
          "NFC identifier not found or revoked",
          { status: 404 },
        );
      return this.getPassport(result.public_id);
    });
  }

  async issueQrIdentifier(passportId: string) {
    return this.run(async () => {
      const id = uuidSchema.parse(passportId);
      const { data, error } = await this.supabase.rpc("issue_qr_identifier", {
        p_passport_id: id,
      });
      if (error) throw error;
      const result = data as Record<string, unknown> | null;
      return issueQrIdentifierResultSchema.parse({
        identifierId: result?.identifier_id,
        token: result?.token,
        resolverPath: result?.resolver_path,
      });
    });
  }

  async mapNfcTag(input: Parameters<CraftTrustClient["mapNfcTag"]>[0]) {
    return this.run(async () => {
      const parsed = mapNfcTagInputSchema.parse(input);
      const { data, error } = await this.supabase.rpc("map_nfc_tag", {
        p_passport_id: parsed.passportId,
        p_raw_uid: parsed.rawUid,
        p_target_url: parsed.targetUrl,
      });
      if (error) throw error;
      const result = data as Record<string, unknown> | null;
      return mapNfcTagResultSchema.parse({
        mappingId: result?.mapping_id,
        passportId: result?.passport_id,
        targetUrl: result?.target_url,
      });
    });
  }

  async revokeQrIdentifier(identifierId: string) {
    return this.run(async () => {
      const id = uuidSchema.parse(identifierId);
      const { data, error } = await this.supabase.rpc("revoke_qr_identifier", {
        p_identifier_id: id,
      });
      if (error) throw error;
      const result = data as Record<string, unknown> | null;
      return revokeIdentifierResultSchema.parse({
        id: result?.identifier_id,
        status: result?.status,
      });
    });
  }

  async revokeNfcMapping(mappingId: string) {
    return this.run(async () => {
      const id = uuidSchema.parse(mappingId);
      const { data, error } = await this.supabase.rpc("revoke_nfc_mapping", {
        p_mapping_id: id,
      });
      if (error) throw error;
      const result = data as Record<string, unknown> | null;
      return revokeIdentifierResultSchema.parse({
        id: result?.mapping_id,
        status: result?.status,
      });
    });
  }

  async submitEvidence(
    input: Parameters<CraftTrustClient["submitEvidence"]>[0],
  ): Promise<EvidenceSubmission> {
    return this.run(async () => {
      const parsed = submitEvidenceInputSchema.parse(input);
      const userId = await this.userId();
      const { data, error } = await this.supabase
        .from("evidence_submissions")
        .insert({
          passport_id: parsed.passportId,
          evidence_type: parsed.evidenceType,
          source_id: parsed.sourceId ?? null,
          storage_path: parsed.storagePath ?? null,
          statement: parsed.statement,
          submitted_by: userId,
          status: "pending",
        })
        .select("*")
        .single();
      if (error) throw error;
      return mapEvidence(data);
    });
  }

  async listEvidence(
    passportId: string,
  ): Promise<readonly EvidenceSubmission[]> {
    return this.run(async () => {
      const id = uuidSchema.parse(passportId);
      const { data, error } = await this.supabase
        .from("evidence_submissions")
        .select("*")
        .eq("passport_id", id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map(mapEvidence);
    });
  }

  async reviewEvidence(
    input: Parameters<CraftTrustClient["reviewEvidence"]>[0],
  ): Promise<EvidenceSubmission> {
    return this.run(async () => {
      const parsed = reviewEvidenceInputSchema.parse(input);
      const { data, error } = await this.supabase.rpc("review_evidence", {
        p_evidence_id: parsed.evidenceId,
        p_decision: parsed.decision,
        p_notes: parsed.notes,
      });
      if (error) throw error;
      const { data: evidence, error: readError } = await this.supabase
        .from("evidence_submissions")
        .select("*")
        .eq("id", parsed.evidenceId)
        .single();
      if (readError) throw readError;
      return mapEvidence(evidence);
    });
  }

  async recomputePassportTier(passportId: string): Promise<PassportRecord> {
    return this.run(async () => {
      const id = uuidSchema.parse(passportId);
      const { error } = await this.supabase.rpc("recompute_passport_tier", {
        p_passport_id: id,
      });
      if (error) throw error;
      const { data, error: readError } = await this.supabase
        .from("passport_records")
        .select("*")
        .eq("id", id)
        .single();
      if (readError) throw readError;
      return mapPassportRecord(data);
    });
  }

  async getSellerDashboard() {
    return this.run(async () => {
      const userId = await this.userId();
      const { data: artisans, error: artisanError } = await this.supabase
        .from("artisans")
        .select("id")
        .eq("owner_id", userId);
      if (artisanError) throw artisanError;
      const artisanIds = (artisans ?? []).map((item) => item.id);
      if (artisanIds.length === 0)
        return sellerDashboardSchema.parse({
          artisanCount: 0,
          activeProductCount: 0,
          draftProductCount: 0,
          orderCount: 0,
          pendingEvidenceCount: 0,
        });
      const { data: products, error: productError } = await this.supabase
        .from("products")
        .select("id,status")
        .in("artisan_id", artisanIds);
      if (productError) throw productError;
      const productIds = (products ?? []).map((item) => item.id);
      let orderCount = 0;
      let pendingEvidenceCount = 0;
      if (productIds.length > 0) {
        const [
          { data: orderItems, error: orderError },
          { data: passports, error: passportError },
        ] = await Promise.all([
          this.supabase
            .from("order_items")
            .select("order_id")
            .in("product_id", productIds),
          this.supabase
            .from("passport_records")
            .select("id")
            .in("product_id", productIds),
        ]);
        if (orderError) throw orderError;
        if (passportError) throw passportError;
        orderCount = new Set((orderItems ?? []).map((item) => item.order_id))
          .size;
        const passportIds = (passports ?? []).map((item) => item.id);
        if (passportIds.length > 0) {
          const { count, error } = await this.supabase
            .from("evidence_submissions")
            .select("id", { count: "exact", head: true })
            .in("passport_id", passportIds)
            .eq("status", "pending");
          if (error) throw error;
          pendingEvidenceCount = count ?? 0;
        }
      }
      return sellerDashboardSchema.parse({
        artisanCount: artisanIds.length,
        activeProductCount: (products ?? []).filter(
          (product) => product.status === "active",
        ).length,
        draftProductCount: (products ?? []).filter(
          (product) => product.status === "draft",
        ).length,
        orderCount,
        pendingEvidenceCount,
      });
    });
  }

  async getAdminDashboard() {
    return this.run(async () => {
      const countWithStatus = async (
        table: "evidence_submissions" | "passport_records",
        status:
          "draft" | "active" | "revoked" | "pending" | "approved" | "rejected",
      ) => {
        const query = this.supabase
          .from(table)
          .select("id", { count: "exact", head: true })
          .eq("status", status);
        const result = await query;
        if (result.error) throw result.error;
        return result.count ?? 0;
      };
      const countAuditEvents = async () => {
        const result = await this.supabase
          .from("audit_events")
          .select("id", { count: "exact", head: true });
        if (result.error) throw result.error;
        return result.count ?? 0;
      };
      const [
        pendingEvidenceCount,
        approvedEvidenceCount,
        activePassportCount,
        revokedPassportCount,
        auditEventCount,
      ] = await Promise.all([
        countWithStatus("evidence_submissions", "pending"),
        countWithStatus("evidence_submissions", "approved"),
        countWithStatus("passport_records", "active"),
        countWithStatus("passport_records", "revoked"),
        countAuditEvents(),
      ]);
      return adminDashboardSchema.parse({
        pendingEvidenceCount,
        approvedEvidenceCount,
        activePassportCount,
        revokedPassportCount,
        auditEventCount,
      });
    });
  }

  async searchApprovedHeritage(
    input: Parameters<CraftTrustClient["searchApprovedHeritage"]>[0],
  ): Promise<readonly KnowledgeChunk[]> {
    return this.run(async () => {
      const parsed = approvedKnowledgeSearchSchema.parse(input);
      const args: Database["public"]["Functions"]["search_approved_heritage"]["Args"] =
        { p_query: parsed.query, p_limit: parsed.limit };
      const { data, error } = await this.supabase.rpc(
        "search_approved_heritage",
        args,
      );
      if (error) throw error;
      if (!Array.isArray(data))
        throw new CraftTrustError(
          "BACKEND_ERROR",
          "Knowledge search returned an invalid response",
        );
      return data.map(mapKnowledgeChunk);
    });
  }

  async askAssistant(
    input: Parameters<CraftTrustClient["askAssistant"]>[0],
  ): Promise<AssistantResponse> {
    return this.run(async () => {
      const parsed = assistantRequestSchema.parse(input);
      const { data, error } = await this.supabase.functions.invoke(
        this.options.assistantFunctionName ?? "heritage-assistant",
        { body: parsed },
      );
      if (error)
        throw new CraftTrustError(
          "UNAVAILABLE",
          "The heritage assistant is currently unavailable",
          { status: 503, cause: error },
        );
      return assistantResponseSchema.parse(data);
    });
  }
}

export function createSupabaseCraftTrustClient(
  supabase: SupabaseClient<Database>,
  options?: CraftTrustClientOptions,
): CraftTrustClient {
  return new SupabaseCraftTrustClient(supabase, options);
}

export function createBrowserCraftTrustClient(
  url: string,
  publicKey: string,
  options?: CraftTrustClientOptions,
): CraftTrustClient {
  return createSupabaseCraftTrustClient(
    createClient<Database>(url, publicKey),
    options,
  );
}

export function createServerCraftTrustClient(
  url: string,
  publicKey: string,
  options: ServerClientOptions = {},
): CraftTrustClient {
  const headers = options.accessToken
    ? { Authorization: `Bearer ${options.accessToken}` }
    : undefined;
  const supabase = createClient<Database>(url, publicKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
    ...(headers || options.fetch
      ? {
          global: {
            ...(headers ? { headers } : {}),
            ...(options.fetch ? { fetch: options.fetch } : {}),
          },
        }
      : {}),
  });
  return createSupabaseCraftTrustClient(supabase, options);
}
