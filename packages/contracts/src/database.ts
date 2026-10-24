import type { Json } from "./common";

type Table<Row, Insert = Partial<Row>, Update = Partial<Insert>> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};

type Timestamped = { created_at: string };

export interface Database {
  public: {
    Tables: {
      profiles: Table<{
        id: string;
        display_name: string;
        avatar_url: string | null;
        village_id: string | null;
        created_at: string;
      }>;
      user_roles: Table<{
        user_id: string;
        role: "customer" | "artisan" | "seller" | "verifier" | "admin";
      }>;
      villages: Table<{
        id: string;
        slug: string;
        name: string;
        district: string;
        summary: string;
        story: string;
        coordinates: Json | null;
        cover_image_url: string | null;
        is_published: boolean;
        created_at: string;
        updated_at: string;
      }>;
      artisans: Table<{
        id: string;
        village_id: string;
        owner_id: string | null;
        slug: string;
        name: string;
        bio: string;
        portrait_url: string | null;
        years_practicing: number;
        is_published: boolean;
        created_at: string;
        updated_at: string;
      }>;
      products: Table<{
        id: string;
        artisan_id: string;
        slug: string;
        name: string;
        description: string;
        price_vnd: number;
        stock_quantity: number;
        status: "draft" | "active" | "archived";
        model_url: string | null;
        poster_url: string | null;
        ar_url: string | null;
        created_at: string;
        updated_at: string;
      }>;
      product_media: Table<{
        id: string;
        product_id: string;
        kind: "image" | "video" | "model" | "ar_asset";
        url: string;
        alt: string;
        sort_order: number;
        created_at: string;
      }>;
      carts: Table<{
        id: string;
        user_id: string;
        status: "active" | "converted" | "abandoned";
        created_at: string;
        updated_at: string;
      }>;
      cart_items: Table<{
        cart_id: string;
        product_id: string;
        quantity: number;
        unit_price_vnd: number;
      }>;
      orders: Table<{
        id: string;
        user_id: string;
        status: "placed" | "processing" | "fulfilled" | "cancelled";
        subtotal_vnd: number;
        payment_mode: "test";
        shipping_address: Json;
        idempotency_key: string;
        created_at: string;
        updated_at: string;
      }>;
      order_items: Table<{
        id: string;
        order_id: string;
        product_id: string;
        product_name: string;
        quantity: number;
        unit_price_vnd: number;
      }>;
      payment_attempts: Table<
        Timestamped & {
          id: string;
          order_id: string;
          provider: string;
          mode: "test";
          status: "test_succeeded" | "test_failed";
          external_reference: string | null;
        }
      >;
      heritage_sources: Table<{
        id: string;
        village_id: string;
        title: string;
        publisher: string;
        source_url: string;
        excerpt: string;
        approval_status: "pending" | "approved" | "rejected";
        approved_by: string | null;
        approved_at: string | null;
        created_at: string;
        updated_at: string;
      }>;
      passport_records: Table<{
        id: string;
        product_id: string;
        public_id: string;
        tier: "unverified" | "bronze" | "silver" | "gold";
        status: "draft" | "active" | "revoked";
        issued_at: string | null;
        updated_at: string;
        created_at: string;
      }>;
      evidence_submissions: Table<
        Timestamped & {
          id: string;
          passport_id: string;
          evidence_type:
            | "identity"
            | "origin"
            | "material"
            | "process"
            | "heritage_source"
            | "verifier_attestation";
          source_id: string | null;
          storage_path: string | null;
          statement: string;
          status: "pending" | "approved" | "rejected";
          submitted_by: string;
          reviewed_by: string | null;
          review_notes: string | null;
          reviewed_at: string | null;
        }
      >;
      verification_reviews: Table<
        Timestamped & {
          id: string;
          evidence_id: string;
          decision: "approved" | "rejected";
          notes: string;
          reviewer_id: string;
        }
      >;
      qr_identifiers: Table<{
        id: string;
        passport_id: string;
        token_hash: string;
        status: "active" | "revoked";
        issued_at: string;
        revoked_at: string | null;
      }>;
      nfc_mappings: Table<
        Timestamped & {
          id: string;
          passport_id: string;
          tag_uid_hash: string;
          target_url: string;
          status: "active" | "revoked";
        }
      >;
      knowledge_chunks: Table<
        Timestamped & {
          id: string;
          source_id: string;
          content: string;
          embedding: string | null;
          approval_status: "pending" | "approved" | "rejected";
        }
      >;
      assistant_conversations: Table<
        Timestamped & { id: string; user_id: string | null }
      >;
      assistant_messages: Table<
        Timestamped & {
          id: string;
          conversation_id: string;
          role: "user" | "assistant";
          content: string;
          citations: Json;
        }
      >;
      audit_events: Table<
        Timestamped & {
          id: string;
          actor_id: string | null;
          action: string;
          entity_type: string;
          entity_id: string;
          before_data: Json | null;
          after_data: Json | null;
        }
      >;
    };
    Views: Record<string, never>;
    Functions: {
      add_to_cart: {
        Args: { p_product_id: string; p_quantity?: number };
        Returns: Json;
      };
      checkout_test_cart: {
        Args: { p_shipping_address: Json; p_idempotency_key: string };
        Returns: Json;
      };
      review_evidence: {
        Args: {
          p_evidence_id: string;
          p_decision: "pending" | "approved" | "rejected";
          p_notes: string;
        };
        Returns: Json;
      };
      recompute_passport_tier: {
        Args: { p_passport_id: string };
        Returns: Json;
      };
      resolve_qr_identifier: { Args: { p_token: string }; Returns: Json };
      resolve_nfc_tag: { Args: { p_raw_uid: string }; Returns: Json };
      issue_qr_identifier: { Args: { p_passport_id: string }; Returns: Json };
      map_nfc_tag: {
        Args: {
          p_passport_id: string;
          p_raw_uid: string;
          p_target_url: string;
        };
        Returns: Json;
      };
      revoke_qr_identifier: {
        Args: { p_identifier_id: string };
        Returns: Json;
      };
      revoke_nfc_mapping: { Args: { p_mapping_id: string }; Returns: Json };
      search_approved_heritage: {
        Args: { p_query: string; p_limit?: number };
        Returns: {
          chunk_id: string;
          content: string;
          source_id: string;
          source_title: string;
          publisher: string;
          source_url: string;
          rank: number;
        }[];
      };
    };
    Enums: {
      user_role: "customer" | "artisan" | "seller" | "verifier" | "admin";
      passport_tier: "unverified" | "bronze" | "silver" | "gold";
    };
    CompositeTypes: Record<string, never>;
  };
}
