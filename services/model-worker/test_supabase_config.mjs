import assert from "node:assert/strict";
import test from "node:test";
import { createClient } from "@supabase/supabase-js";
import { normalizeSupabaseUrl } from "./supabase-config.mjs";

test("missing configuration remains detectable", () => {
  assert.equal(normalizeSupabaseUrl(undefined), undefined);
  assert.equal(normalizeSupabaseUrl("  "), undefined);
});

test("project roots and copied service URLs yield the correct RPC path", async () => {
  for (const suffix of ["", "/", "/rest/v1", "/rest/v1/", "/auth/v1", "/storage/v1/"]) {
    let requested;
    const client = createClient(normalizeSupabaseUrl(`  https://example.supabase.co${suffix}\n`), "test-key", {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { fetch: async (input) => {
        requested = String(input);
        return new Response("null", { status: 200, headers: { "Content-Type": "application/json" } });
      } },
    });
    const { error } = await client.rpc("claim_model_job", { p_worker_id: "test-worker" }).maybeSingle();
    assert.equal(error, null);
    assert.equal(requested, "https://example.supabase.co/rest/v1/rpc/claim_model_job");
  }
});

test("local development URL retains its port", () => {
  assert.equal(normalizeSupabaseUrl("http://127.0.0.1:54321/"), "http://127.0.0.1:54321");
});

test("invalid configuration fails early without printing its value", () => {
  for (const value of ["bad-url", "https://example.com/rest/v1/products", "https://example.com/project/abc", "ftp://example.com", "https://user:secret@example.com", "https://example.com?key=secret", "https://example.com#secret"]) {
    assert.throws(() => normalizeSupabaseUrl(value), (error) => {
      assert.match(error.message, /SUPABASE_URL/);
      assert.ok(!error.message.includes(value));
      assert.ok(!error.message.includes("secret"));
      return true;
    });
  }
});
