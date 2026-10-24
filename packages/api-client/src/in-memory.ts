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
  type AssistantRequest,
  type AssistantResponse,
  type Cart,
  type EvidenceSubmission,
  type HeritageSource,
  type KnowledgeChunk,
  type Order,
  type PassportRecord,
  type PassportResolution,
  type Product,
  type UserRole,
  type Village,
} from "@craft-trust/contracts";
import { CraftTrustError, normalizeCraftTrustError } from "./errors";
import type { CraftTrustClient, ListOptions } from "./types";

export interface InMemoryUser {
  readonly id: string;
  readonly roles: readonly UserRole[];
}

export interface InMemorySeed {
  readonly user?: InMemoryUser;
  readonly villages?: readonly Village[];
  readonly artisans?: readonly Artisan[];
  readonly products?: readonly Product[];
  readonly carts?: readonly Cart[];
  readonly orders?: readonly Order[];
  readonly passports?: readonly PassportRecord[];
  readonly evidence?: readonly EvidenceSubmission[];
  readonly heritageSources?: readonly HeritageSource[];
  readonly knowledgeChunks?: readonly KnowledgeChunk[];
  readonly qrTokens?: Readonly<Record<string, string>>;
  readonly nfcTags?: Readonly<Record<string, string>>;
}

export interface InMemoryOptions {
  readonly assistantResponder?: (
    request: AssistantRequest,
    approvedContext: readonly KnowledgeChunk[],
  ) => Promise<AssistantResponse>;
  readonly canonicalBaseUrl?: string;
}

function clone<T>(value: T): T {
  return structuredClone(value);
}

export class InMemoryCraftTrustClient implements CraftTrustClient {
  private readonly villages: Village[];
  private readonly artisans: Artisan[];
  private readonly products: Product[];
  private readonly carts: Cart[];
  private readonly orders: Order[];
  private readonly passports: PassportRecord[];
  private readonly evidence: EvidenceSubmission[];
  private readonly heritageSources: HeritageSource[];
  private readonly knowledgeChunks: KnowledgeChunk[];
  private readonly qrTokens: Map<string, string>;
  private readonly nfcTags: Map<string, string>;
  private readonly qrIdentifiers = new Map<string, string>();
  private readonly nfcMappings = new Map<string, string>();
  private counter = 1;
  private readonly clockStart = Date.parse("2026-10-23T00:00:00.000Z");

  constructor(
    seed: InMemorySeed = {},
    private readonly options: InMemoryOptions = {},
  ) {
    this.user = seed.user;
    this.villages = clone([...(seed.villages ?? [])]);
    this.artisans = clone([...(seed.artisans ?? [])]);
    this.products = clone([...(seed.products ?? [])]);
    this.carts = clone([...(seed.carts ?? [])]);
    this.orders = clone([...(seed.orders ?? [])]);
    this.passports = clone([...(seed.passports ?? [])]);
    this.evidence = clone([...(seed.evidence ?? [])]);
    this.heritageSources = clone([...(seed.heritageSources ?? [])]);
    this.knowledgeChunks = clone([...(seed.knowledgeChunks ?? [])]);
    this.qrTokens = new Map(Object.entries(seed.qrTokens ?? {}));
    this.nfcTags = new Map(Object.entries(seed.nfcTags ?? {}));
  }

  private user: InMemoryUser | undefined;

  setUser(user: InMemoryUser | undefined): void {
    this.user = user;
  }

  private authenticatedUser(): InMemoryUser {
    if (!this.user)
      throw new CraftTrustError("AUTH_REQUIRED", "Sign in to continue", {
        status: 401,
      });
    return this.user;
  }

  private requireRole(...roles: readonly UserRole[]): InMemoryUser {
    const user = this.authenticatedUser();
    if (!roles.some((role) => user.roles.includes(role))) {
      throw new CraftTrustError(
        "FORBIDDEN",
        "Your account is not authorized for this operation",
        { status: 403 },
      );
    }
    return user;
  }

  private id(): string {
    const suffix = String(this.counter++).padStart(12, "0");
    return `00000000-0000-4000-8000-${suffix}`;
  }

  private now(): string {
    return new Date(this.clockStart + this.counter * 1000).toISOString();
  }

  private guard<T>(operation: () => T | Promise<T>): Promise<T> {
    try {
      return Promise.resolve(operation()).catch((error: unknown) =>
        Promise.reject(normalizeCraftTrustError(error)),
      );
    } catch (error) {
      return Promise.reject(normalizeCraftTrustError(error));
    }
  }

  listVillages(options: ListOptions = {}): Promise<readonly Village[]> {
    return this.guard(() => {
      const { limit, offset } = paginationSchema.parse(options);
      return clone(
        this.villages
          .filter((item) => item.isPublished)
          .sort((a, b) => a.name.localeCompare(b.name))
          .slice(offset, offset + limit),
      );
    });
  }

  getVillageBySlug(slug: string): Promise<Village> {
    return this.guard(() =>
      clone(
        this.requireFound(
          this.villages.find((item) => item.slug === slug && item.isPublished),
          "Village not found",
        ),
      ),
    );
  }

  listArtisans(filters = {}): Promise<readonly Artisan[]> {
    return this.guard(() => {
      const parsed = artisanFiltersSchema.parse(filters);
      const needle = parsed.query?.toLocaleLowerCase();
      return clone(
        this.artisans
          .filter((item) => item.isPublished)
          .filter(
            (item) => !parsed.villageId || item.villageId === parsed.villageId,
          )
          .filter(
            (item) => !needle || item.name.toLocaleLowerCase().includes(needle),
          )
          .slice(parsed.offset, parsed.offset + parsed.limit),
      );
    });
  }

  getArtisanBySlug(slug: string): Promise<Artisan> {
    return this.guard(() =>
      clone(
        this.requireFound(
          this.artisans.find((item) => item.slug === slug && item.isPublished),
          "Artisan not found",
        ),
      ),
    );
  }

  listProducts(filters = {}): Promise<readonly Product[]> {
    return this.guard(() => {
      const parsed = productFiltersSchema.parse(filters);
      const villageArtisanIds = parsed.villageId
        ? new Set(
            this.artisans
              .filter(
                (item) =>
                  item.villageId === parsed.villageId && item.isPublished,
              )
              .map((item) => item.id),
          )
        : undefined;
      const needle = parsed.query?.toLocaleLowerCase();
      return clone(
        this.products
          .filter((item) => item.status === "active")
          .filter(
            (item) => !parsed.artisanId || item.artisanId === parsed.artisanId,
          )
          .filter(
            (item) =>
              !villageArtisanIds || villageArtisanIds.has(item.artisanId),
          )
          .filter(
            (item) => !needle || item.name.toLocaleLowerCase().includes(needle),
          )
          .slice(parsed.offset, parsed.offset + parsed.limit),
      );
    });
  }

  getProductBySlug(slug: string): Promise<Product> {
    return this.guard(() =>
      clone(
        this.requireFound(
          this.products.find(
            (item) => item.slug === slug && item.status === "active",
          ),
          "Product not found",
        ),
      ),
    );
  }

  getCart(): Promise<Cart> {
    return this.guard(() => {
      const user = this.authenticatedUser();
      return clone(
        this.requireFound(
          this.carts.find(
            (item) => item.userId === user.id && item.status === "active",
          ),
          "No active cart",
        ),
      );
    });
  }

  addToCart(
    input: Parameters<CraftTrustClient["addToCart"]>[0],
  ): Promise<Cart> {
    return this.guard(() => {
      const user = this.authenticatedUser();
      const parsed = addToCartInputSchema.parse(input);
      const product = this.requireFound(
        this.products.find(
          (item) => item.id === parsed.productId && item.status === "active",
        ),
        "Product not found",
      );
      if (product.stockQuantity < parsed.quantity)
        throw new CraftTrustError(
          "CONFLICT",
          "Requested quantity is not in stock",
          { status: 409 },
        );
      let cart = this.carts.find(
        (item) => item.userId === user.id && item.status === "active",
      );
      if (!cart) {
        const timestamp = this.now();
        cart = {
          id: this.id(),
          userId: user.id,
          status: "active",
          createdAt: timestamp,
          updatedAt: timestamp,
          items: [],
        };
        this.carts.push(cart);
      }
      const existing = cart.items.find((item) => item.productId === product.id);
      const nextQuantity = (existing?.quantity ?? 0) + parsed.quantity;
      if (nextQuantity > product.stockQuantity)
        throw new CraftTrustError(
          "CONFLICT",
          "Requested quantity is not in stock",
          { status: 409 },
        );
      const nextItems = existing
        ? cart.items.map((item) =>
            item.productId === product.id
              ? { ...item, quantity: nextQuantity }
              : item,
          )
        : [
            ...cart.items,
            {
              productId: product.id,
              quantity: parsed.quantity,
              unitPriceVnd: product.priceVnd,
              product: clone(product),
            },
          ];
      this.replaceCart(cart.id, {
        ...cart,
        items: nextItems,
        updatedAt: this.now(),
      });
      return clone(
        this.requireFound(
          this.carts.find((item) => item.id === cart?.id),
          "Cart not found",
        ),
      );
    });
  }

  updateCartItem(
    input: Parameters<CraftTrustClient["updateCartItem"]>[0],
  ): Promise<Cart> {
    return this.guard(() => {
      const parsed = updateCartItemInputSchema.parse(input);
      const user = this.authenticatedUser();
      const cart = this.requireFound(
        this.carts.find(
          (item) => item.userId === user.id && item.status === "active",
        ),
        "No active cart",
      );
      const item = this.requireFound(
        cart.items.find(
          (candidate) => candidate.productId === parsed.productId,
        ),
        "Cart item not found",
      );
      const product = this.requireFound(
        this.products.find((candidate) => candidate.id === item.productId),
        "Product not found",
      );
      if (parsed.quantity > product.stockQuantity)
        throw new CraftTrustError(
          "CONFLICT",
          "Requested quantity is not in stock",
          { status: 409 },
        );
      const next = {
        ...cart,
        updatedAt: this.now(),
        items: cart.items.map((candidate) =>
          candidate.productId === parsed.productId
            ? { ...candidate, quantity: parsed.quantity }
            : candidate,
        ),
      };
      this.replaceCart(cart.id, next);
      return clone(next);
    });
  }

  removeCartItem(productId: string): Promise<Cart> {
    return this.guard(() => {
      const id = uuidSchema.parse(productId);
      const user = this.authenticatedUser();
      const cart = this.requireFound(
        this.carts.find(
          (item) => item.userId === user.id && item.status === "active",
        ),
        "No active cart",
      );
      if (!cart.items.some((item) => item.productId === id))
        throw new CraftTrustError("NOT_FOUND", "Cart item not found", {
          status: 404,
        });
      const next = {
        ...cart,
        updatedAt: this.now(),
        items: cart.items.filter((item) => item.productId !== id),
      };
      this.replaceCart(cart.id, next);
      return clone(next);
    });
  }

  checkoutTest(
    input: Parameters<CraftTrustClient["checkoutTest"]>[0],
  ): Promise<Order> {
    return this.guard(() => {
      const parsed = checkoutTestInputSchema.parse(input);
      const user = this.authenticatedUser();
      const prior = this.orders.find(
        (order) =>
          (order as Order & { idempotencyKey?: string }).idempotencyKey ===
            parsed.idempotencyKey && order.userId === user.id,
      );
      if (prior) return clone(prior);
      const cart = this.requireFound(
        this.carts.find(
          (item) => item.userId === user.id && item.status === "active",
        ),
        "No active cart",
      );
      if (cart.items.length === 0)
        throw new CraftTrustError("CONFLICT", "The cart is empty", {
          status: 409,
        });
      for (const item of cart.items) {
        const product = this.requireFound(
          this.products.find((candidate) => candidate.id === item.productId),
          "Product not found",
        );
        if (
          product.status !== "active" ||
          item.quantity > product.stockQuantity
        )
          throw new CraftTrustError(
            "CONFLICT",
            `${product.name} is no longer available in the requested quantity`,
            { status: 409 },
          );
      }
      const orderId = this.id();
      const order: Order & { idempotencyKey: string } = {
        id: orderId,
        userId: user.id,
        status: "placed",
        subtotalVnd: cart.items.reduce(
          (total, item) => total + item.quantity * item.unitPriceVnd,
          0,
        ),
        paymentMode: "test",
        shippingAddress: parsed.shippingAddress,
        createdAt: this.now(),
        items: cart.items.map((item) => ({
          id: this.id(),
          orderId,
          productId: item.productId,
          productName: this.requireFound(
            this.products.find((candidate) => candidate.id === item.productId),
            "Product not found",
          ).name,
          quantity: item.quantity,
          unitPriceVnd: item.unitPriceVnd,
        })),
        idempotencyKey: parsed.idempotencyKey,
      };
      for (const item of cart.items) {
        const index = this.products.findIndex(
          (candidate) => candidate.id === item.productId,
        );
        const product = this.products[index];
        if (product)
          this.products[index] = {
            ...product,
            stockQuantity: product.stockQuantity - item.quantity,
          };
      }
      this.orders.push(order);
      this.replaceCart(cart.id, {
        ...cart,
        status: "converted",
        updatedAt: this.now(),
      });
      return clone(order);
    });
  }

  listOrders(): Promise<readonly Order[]> {
    return this.guard(() => {
      const user = this.authenticatedUser();
      return clone(
        this.orders
          .filter((item) => item.userId === user.id)
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
      );
    });
  }

  getOrder(orderId: string): Promise<Order> {
    return this.guard(() => {
      const user = this.authenticatedUser();
      const id = uuidSchema.parse(orderId);
      return clone(
        this.requireFound(
          this.orders.find((item) => item.id === id && item.userId === user.id),
          "Order not found",
        ),
      );
    });
  }

  getPassport(publicId: string): Promise<PassportResolution> {
    return this.guard(() => this.resolveByPublicId(publicId));
  }

  resolvePassport(publicId: string): Promise<PassportResolution> {
    return this.getPassport(publicId);
  }

  resolveQr(token: string): Promise<PassportResolution> {
    return this.guard(() => {
      const publicId = this.qrTokens.get(token);
      return this.resolveByPublicId(
        this.requireFound(publicId, "QR identifier not found or revoked"),
      );
    });
  }

  resolveNfc(tagUid: string): Promise<PassportResolution> {
    return this.guard(() => {
      const publicId = this.nfcTags.get(tagUid);
      return this.resolveByPublicId(
        this.requireFound(publicId, "NFC identifier not found or revoked"),
      );
    });
  }

  issueQrIdentifier(passportId: string) {
    return this.guard(() => {
      const passport = this.manageablePassport(uuidSchema.parse(passportId));
      if (passport.status !== "active")
        throw new CraftTrustError(
          "CONFLICT",
          "Only active passports can receive QR identifiers",
          { status: 409 },
        );
      const identifierId = this.id();
      const token = `00000000000000000000000000000000${String(this.counter).padStart(32, "0")}`;
      this.qrTokens.set(token, passport.publicId);
      this.qrIdentifiers.set(identifierId, token);
      return issueQrIdentifierResultSchema.parse({
        identifierId,
        token,
        resolverPath: `/passport/qr/${token}`,
      });
    });
  }

  mapNfcTag(input: Parameters<CraftTrustClient["mapNfcTag"]>[0]) {
    return this.guard(() => {
      const parsed = mapNfcTagInputSchema.parse(input);
      const passport = this.manageablePassport(parsed.passportId);
      if (passport.status !== "active")
        throw new CraftTrustError(
          "CONFLICT",
          "Only active passports can receive NFC mappings",
          { status: 409 },
        );
      if (
        !new URL(parsed.targetUrl).pathname
          .replace(/\/$/, "")
          .endsWith(`/passport/${passport.publicId}`)
      ) {
        throw new CraftTrustError(
          "VALIDATION_ERROR",
          "NFC target must be the canonical public passport URL",
          { status: 400 },
        );
      }
      const mappingId = this.id();
      this.nfcTags.set(parsed.rawUid, passport.publicId);
      this.nfcMappings.set(mappingId, parsed.rawUid);
      return mapNfcTagResultSchema.parse({
        mappingId,
        passportId: passport.id,
        targetUrl: parsed.targetUrl,
      });
    });
  }

  revokeQrIdentifier(identifierId: string) {
    return this.guard(() => {
      const id = uuidSchema.parse(identifierId);
      const token = this.requireFound(
        this.qrIdentifiers.get(id),
        "QR identifier not found",
      );
      const publicId = this.requireFound(
        this.qrTokens.get(token),
        "QR identifier not found",
      );
      this.manageablePassportByPublicId(publicId);
      this.qrTokens.delete(token);
      this.qrIdentifiers.delete(id);
      return revokeIdentifierResultSchema.parse({ id, status: "revoked" });
    });
  }

  revokeNfcMapping(mappingId: string) {
    return this.guard(() => {
      const id = uuidSchema.parse(mappingId);
      const rawUid = this.requireFound(
        this.nfcMappings.get(id),
        "NFC mapping not found",
      );
      const publicId = this.requireFound(
        this.nfcTags.get(rawUid),
        "NFC mapping not found",
      );
      this.manageablePassportByPublicId(publicId);
      this.nfcTags.delete(rawUid);
      this.nfcMappings.delete(id);
      return revokeIdentifierResultSchema.parse({ id, status: "revoked" });
    });
  }

  submitEvidence(
    input: Parameters<CraftTrustClient["submitEvidence"]>[0],
  ): Promise<EvidenceSubmission> {
    return this.guard(() => {
      const user = this.requireRole("artisan", "seller");
      const parsed = submitEvidenceInputSchema.parse(input);
      const passport = this.requireFound(
        this.passports.find((item) => item.id === parsed.passportId),
        "Passport not found",
      );
      const product = this.requireFound(
        this.products.find((item) => item.id === passport.productId),
        "Product not found",
      );
      const artisan = this.requireFound(
        this.artisans.find((item) => item.id === product.artisanId),
        "Artisan not found",
      );
      if (artisan.ownerId !== user.id && !user.roles.includes("admin"))
        throw new CraftTrustError(
          "FORBIDDEN",
          "You do not own this artisan record",
          { status: 403 },
        );
      const evidence: EvidenceSubmission = {
        id: this.id(),
        passportId: passport.id,
        evidenceType: parsed.evidenceType,
        sourceId: parsed.sourceId ?? null,
        storagePath: parsed.storagePath ?? null,
        statement: parsed.statement,
        status: "pending",
        submittedBy: user.id,
        reviewedBy: null,
        reviewNotes: null,
        reviewedAt: null,
        createdAt: this.now(),
      };
      this.evidence.push(evidence);
      return clone(evidence);
    });
  }

  listEvidence(passportId: string): Promise<readonly EvidenceSubmission[]> {
    return this.guard(() => {
      const id = uuidSchema.parse(passportId);
      const passport = this.requireFound(
        this.passports.find((item) => item.id === id),
        "Passport not found",
      );
      const user = this.authenticatedUser();
      const product = this.requireFound(
        this.products.find((item) => item.id === passport.productId),
        "Product not found",
      );
      const artisan = this.requireFound(
        this.artisans.find((item) => item.id === product.artisanId),
        "Artisan not found",
      );
      if (
        artisan.ownerId !== user.id &&
        !user.roles.some((role) => role === "verifier" || role === "admin")
      ) {
        throw new CraftTrustError(
          "FORBIDDEN",
          "You cannot view this evidence",
          { status: 403 },
        );
      }
      return clone(this.evidence.filter((item) => item.passportId === id));
    });
  }

  reviewEvidence(
    input: Parameters<CraftTrustClient["reviewEvidence"]>[0],
  ): Promise<EvidenceSubmission> {
    return this.guard(() => {
      const user = this.requireRole("verifier", "admin");
      const parsed = reviewEvidenceInputSchema.parse(input);
      const index = this.evidence.findIndex(
        (item) => item.id === parsed.evidenceId,
      );
      const prior = this.requireFound(
        this.evidence[index],
        "Evidence not found",
      );
      if (prior.status !== "pending")
        throw new CraftTrustError(
          "CONFLICT",
          "Evidence has already been reviewed",
          { status: 409 },
        );
      if (parsed.decision === "approved" && prior.sourceId) {
        const source = this.requireFound(
          this.heritageSources.find((item) => item.id === prior.sourceId),
          "Heritage source not found",
        );
        if (source.approvalStatus !== "approved")
          throw new CraftTrustError(
            "CONFLICT",
            "Evidence cannot rely on an unapproved heritage source",
            { status: 409 },
          );
      }
      const reviewed: EvidenceSubmission = {
        ...prior,
        status: parsed.decision,
        reviewedBy: user.id,
        reviewNotes: parsed.notes,
        reviewedAt: this.now(),
      };
      this.evidence[index] = reviewed;
      this.recompute(passportIdOf(reviewed));
      return clone(reviewed);
    });
  }

  recomputePassportTier(passportId: string): Promise<PassportRecord> {
    return this.guard(() => {
      this.requireRole("verifier", "admin");
      return clone(this.recompute(uuidSchema.parse(passportId)));
    });
  }

  getSellerDashboard() {
    return this.guard(() => {
      const user = this.requireRole("artisan", "seller", "admin");
      const artisanIds = new Set(
        this.artisans
          .filter((item) => item.ownerId === user.id)
          .map((item) => item.id),
      );
      const ownedProducts = this.products.filter((item) =>
        artisanIds.has(item.artisanId),
      );
      const productIds = new Set(ownedProducts.map((item) => item.id));
      const passportIds = new Set(
        this.passports
          .filter((item) => productIds.has(item.productId))
          .map((item) => item.id),
      );
      return sellerDashboardSchema.parse({
        artisanCount: artisanIds.size,
        activeProductCount: ownedProducts.filter(
          (item) => item.status === "active",
        ).length,
        draftProductCount: ownedProducts.filter(
          (item) => item.status === "draft",
        ).length,
        orderCount: this.orders.filter((order) =>
          order.items.some((item) => productIds.has(item.productId)),
        ).length,
        pendingEvidenceCount: this.evidence.filter(
          (item) =>
            passportIds.has(item.passportId) && item.status === "pending",
        ).length,
      });
    });
  }

  getAdminDashboard() {
    return this.guard(() => {
      this.requireRole("admin", "verifier");
      return adminDashboardSchema.parse({
        pendingEvidenceCount: this.evidence.filter(
          (item) => item.status === "pending",
        ).length,
        approvedEvidenceCount: this.evidence.filter(
          (item) => item.status === "approved",
        ).length,
        activePassportCount: this.passports.filter(
          (item) => item.status === "active",
        ).length,
        revokedPassportCount: this.passports.filter(
          (item) => item.status === "revoked",
        ).length,
        auditEventCount: 0,
      });
    });
  }

  searchApprovedHeritage(
    input: Parameters<CraftTrustClient["searchApprovedHeritage"]>[0],
  ): Promise<readonly KnowledgeChunk[]> {
    return this.guard(() => {
      const parsed = approvedKnowledgeSearchSchema.parse(input);
      const approvedSources = new Set(
        this.heritageSources
          .filter((source) => source.approvalStatus === "approved")
          .map((source) => source.id),
      );
      const terms = parsed.query
        .toLocaleLowerCase()
        .split(/\s+/)
        .filter((term) => term.length > 2);
      return clone(
        this.knowledgeChunks
          .filter((chunk) => approvedSources.has(chunk.sourceId))
          .map((chunk) => ({
            ...chunk,
            similarity:
              terms.length === 0
                ? 0
                : terms.filter((term) =>
                    chunk.content.toLocaleLowerCase().includes(term),
                  ).length / terms.length,
          }))
          .filter((chunk) => chunk.similarity > 0)
          .sort((a, b) => b.similarity - a.similarity)
          .slice(0, parsed.limit),
      );
    });
  }

  askAssistant(
    input: Parameters<CraftTrustClient["askAssistant"]>[0],
  ): Promise<AssistantResponse> {
    return this.guard(async () => {
      const parsed = assistantRequestSchema.parse(input);
      if (!this.options.assistantResponder)
        throw new CraftTrustError(
          "UNAVAILABLE",
          "No assistant provider is configured",
          { status: 503 },
        );
      const context = await this.searchApprovedHeritage({
        query: parsed.question,
      });
      const response = assistantResponseSchema.parse(
        await this.options.assistantResponder(parsed, context),
      );
      const approvedChunkIds = new Set(context.map((chunk) => chunk.id));
      if (
        response.grounded &&
        (response.citations.length === 0 ||
          response.citations.some(
            (citation) => !approvedChunkIds.has(citation.chunkId),
          ))
      ) {
        throw new CraftTrustError(
          "BACKEND_ERROR",
          "Assistant response cited content outside the approved retrieval context",
        );
      }
      return response;
    });
  }

  private replaceCart(id: string, cart: Cart): void {
    const index = this.carts.findIndex((item) => item.id === id);
    if (index < 0)
      throw new CraftTrustError("NOT_FOUND", "Cart not found", { status: 404 });
    this.carts[index] = cart;
  }

  private requireFound<T>(value: T | undefined, message: string): T {
    if (value === undefined)
      throw new CraftTrustError("NOT_FOUND", message, { status: 404 });
    return value;
  }

  private resolveByPublicId(publicId: string): PassportResolution {
    const passport = this.requireFound(
      this.passports.find(
        (item) => item.publicId === publicId && item.status === "active",
      ),
      "Passport not found or not public",
    );
    const product = this.requireFound(
      this.products.find(
        (item) => item.id === passport.productId && item.status === "active",
      ),
      "Passport product not found",
    );
    const artisan = this.requireFound(
      this.artisans.find(
        (item) => item.id === product.artisanId && item.isPublished,
      ),
      "Passport artisan not found",
    );
    const village = this.requireFound(
      this.villages.find(
        (item) => item.id === artisan.villageId && item.isPublished,
      ),
      "Passport village not found",
    );
    const base = (
      this.options.canonicalBaseUrl ?? "https://example.invalid"
    ).replace(/\/$/, "");
    return clone({
      passport,
      product,
      artisan,
      village,
      approvedEvidence: this.evidence.filter(
        (item) => item.passportId === passport.id && item.status === "approved",
      ),
      canonicalUrl: `${base}/passport/${encodeURIComponent(passport.publicId)}`,
    });
  }

  private manageablePassport(passportId: string): PassportRecord {
    const user = this.requireRole("artisan", "seller", "verifier", "admin");
    const passport = this.requireFound(
      this.passports.find((item) => item.id === passportId),
      "Passport not found",
    );
    if (!user.roles.some((role) => role === "verifier" || role === "admin")) {
      const product = this.requireFound(
        this.products.find((item) => item.id === passport.productId),
        "Product not found",
      );
      const artisan = this.requireFound(
        this.artisans.find((item) => item.id === product.artisanId),
        "Artisan not found",
      );
      if (artisan.ownerId !== user.id)
        throw new CraftTrustError(
          "FORBIDDEN",
          "You cannot manage this passport",
          { status: 403 },
        );
    }
    return passport;
  }

  private manageablePassportByPublicId(publicId: string): PassportRecord {
    return this.manageablePassport(
      this.requireFound(
        this.passports.find((item) => item.publicId === publicId),
        "Passport not found",
      ).id,
    );
  }

  private recompute(passportId: string): PassportRecord {
    const index = this.passports.findIndex((item) => item.id === passportId);
    const passport = this.requireFound(
      this.passports[index],
      "Passport not found",
    );
    const types = new Set(
      this.evidence
        .filter(
          (item) =>
            item.passportId === passportId && item.status === "approved",
        )
        .map((item) => item.evidenceType),
    );
    const bronze = types.has("identity") && types.has("origin");
    const silver = bronze && types.has("material") && types.has("process");
    const gold =
      silver &&
      types.has("heritage_source") &&
      types.has("verifier_attestation");
    const updated: PassportRecord = {
      ...passport,
      tier: gold
        ? "gold"
        : silver
          ? "silver"
          : bronze
            ? "bronze"
            : "unverified",
      status: bronze ? "active" : "draft",
      issuedAt: bronze ? (passport.issuedAt ?? this.now()) : null,
      updatedAt: this.now(),
    };
    this.passports[index] = updated;
    return updated;
  }
}

function passportIdOf(evidence: EvidenceSubmission): string {
  return evidence.passportId;
}
