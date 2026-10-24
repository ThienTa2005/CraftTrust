import type {
  AddToCartInput,
  AdminDashboard,
  ApprovedKnowledgeSearch,
  Artisan,
  ArtisanFilters,
  AssistantRequest,
  AssistantResponse,
  Cart,
  CheckoutTestInput,
  EvidenceSubmission,
  KnowledgeChunk,
  IssueQrIdentifierResult,
  MapNfcTagInput,
  MapNfcTagResult,
  Order,
  PassportRecord,
  PassportResolution,
  Product,
  ProductFilters,
  ReviewEvidenceInput,
  SellerDashboard,
  SubmitEvidenceInput,
  UpdateCartItemInput,
  RevokeIdentifierResult,
  Village,
} from "@craft-trust/contracts";

export interface ListOptions {
  readonly limit?: number;
  readonly offset?: number;
}

export interface CraftTrustClient {
  listVillages(options?: ListOptions): Promise<readonly Village[]>;
  getVillageBySlug(slug: string): Promise<Village>;
  listArtisans(filters?: ArtisanFilters): Promise<readonly Artisan[]>;
  getArtisanBySlug(slug: string): Promise<Artisan>;
  listProducts(filters?: ProductFilters): Promise<readonly Product[]>;
  getProductBySlug(slug: string): Promise<Product>;

  getCart(): Promise<Cart>;
  addToCart(input: AddToCartInput): Promise<Cart>;
  updateCartItem(input: UpdateCartItemInput): Promise<Cart>;
  removeCartItem(productId: string): Promise<Cart>;
  checkoutTest(input: CheckoutTestInput): Promise<Order>;
  listOrders(): Promise<readonly Order[]>;
  getOrder(orderId: string): Promise<Order>;

  getPassport(publicId: string): Promise<PassportResolution>;
  resolvePassport(publicId: string): Promise<PassportResolution>;
  resolveQr(token: string): Promise<PassportResolution>;
  resolveNfc(tagUid: string): Promise<PassportResolution>;
  issueQrIdentifier(passportId: string): Promise<IssueQrIdentifierResult>;
  mapNfcTag(input: MapNfcTagInput): Promise<MapNfcTagResult>;
  revokeQrIdentifier(identifierId: string): Promise<RevokeIdentifierResult>;
  revokeNfcMapping(mappingId: string): Promise<RevokeIdentifierResult>;
  submitEvidence(input: SubmitEvidenceInput): Promise<EvidenceSubmission>;
  listEvidence(passportId: string): Promise<readonly EvidenceSubmission[]>;
  reviewEvidence(input: ReviewEvidenceInput): Promise<EvidenceSubmission>;
  recomputePassportTier(passportId: string): Promise<PassportRecord>;

  getSellerDashboard(): Promise<SellerDashboard>;
  getAdminDashboard(): Promise<AdminDashboard>;
  searchApprovedHeritage(
    input: ApprovedKnowledgeSearch,
  ): Promise<readonly KnowledgeChunk[]>;
  askAssistant(input: AssistantRequest): Promise<AssistantResponse>;
}

export interface CraftTrustClientOptions {
  readonly assistantFunctionName?: string;
}

export interface ServerClientOptions extends CraftTrustClientOptions {
  readonly accessToken?: string;
  readonly fetch?: typeof globalThis.fetch;
}
