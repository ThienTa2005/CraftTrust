// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AppRole } from "@/lib/authz";
import { makeGlb } from "./fixtures/glb";
import { validateExperienceGlb, MAX_EXPERIENCE_BYTES } from "@/lib/experiences";

const state = vi.hoisted(() => ({ roles: [] as AppRole[], signedIn: true, database: null as any }));
vi.mock("@/lib/authz", () => ({
  getAuthorizedUser: vi.fn(async (allowed: AppRole[]) => ({
    user: state.signedIn ? { id: "owner" } : null,
    roles: state.roles, supabase: state.database,
    reason: !state.signedIn ? "Sign in required" : state.roles.some((role) => allowed.includes(role)) ? null : "Access denied",
  })),
}));
import { GET, POST } from "@/app/api/admin/experiences/route";
import { PATCH } from "@/app/api/admin/experiences/[id]/route";
import { POST as createSellerProduct } from "@/app/api/seller/products/route";

const id = "11111111-1111-4111-8111-111111111111";
const context = { params: Promise.resolve({ id }) };
function uploadRequest() {
  const form = new FormData();
  form.set("title", "Gốm Việt");
  form.set("model", new File([makeGlb()], "pot.glb"));
  return new Request("http://localhost/api/admin/experiences", { method: "POST", body: form });
}

beforeEach(() => {
  state.roles = ["admin"];
  state.signedIn = true;
  const query: any = { data: { id }, error: null };
  for (const name of ["select", "eq", "order", "update"]) query[name] = vi.fn(() => query);
  query.maybeSingle = vi.fn(async () => ({ data: { id: "artisan-id" }, error: null }));
  query.insert = vi.fn(async () => ({ error: null }));
  const bucket = { upload: vi.fn(async () => ({ error: null })), remove: vi.fn(async () => ({ error: null })), getPublicUrl: vi.fn(() => ({ data: { publicUrl: "https://example.invalid/image.png" } })) };
  state.database = { from: vi.fn(() => query), storage: { from: vi.fn(() => bucket) } };
});

describe("GLB validation", () => {
  it("accepts a self-contained renderable triangle", () => expect(validateExperienceGlb(makeGlb())).toBeNull());
  it.each([
    ["truncated", () => makeGlb().slice(0, 30)],
    ["remote texture", () => makeGlb({ images: [{ uri: "https://example.com/image.png" }] })],
    ["relative resource", () => makeGlb({ buffers: [{ uri: "../secret", byteLength: 36 }] })],
    ["missing mesh", () => makeGlb({ meshes: [] })],
    ["oversized", () => new ArrayBuffer(MAX_EXPERIENCE_BYTES + 1)],
    ["missing binary data", () => makeGlb({ buffers: [{ byteLength: 400 }] })],
  ])("rejects %s", (_label, make) => expect(validateExperienceGlb(make())).not.toBeNull());
});

describe("admin-only experience management", () => {
  it.each<AppRole>(["customer", "artisan", "seller", "verifier"])("denies %s at every management endpoint", async (role) => {
    state.roles = [role];
    expect((await GET()).status).toBe(403);
    expect((await POST(uploadRequest())).status).toBe(403);
    expect((await PATCH(new Request("http://localhost", { method: "PATCH", body: JSON.stringify({ status: "published" }) }), context)).status).toBe(403);
    expect(state.database.from).not.toHaveBeenCalled();
    expect(state.database.storage.from).not.toHaveBeenCalled();
  });
  it("requires login", async () => {
    state.signedIn = false;
    expect((await POST(uploadRequest())).status).toBe(401);
  });
  it("saves admin uploads as separate drafts without touching products or jobs", async () => {
    expect((await POST(uploadRequest())).status).toBe(201);
    expect(state.database.from).toHaveBeenCalledExactlyOnceWith("experiences");
    expect(state.database.from().insert).toHaveBeenCalledWith(expect.objectContaining({ status: "draft", uploaded_by: "owner" }));
    expect(state.database.storage.from).toHaveBeenCalledExactlyOnceWith("experience-models");
  });
  it("removes the uploaded file if saving the draft fails", async () => {
    state.database.from().insert.mockResolvedValue({ error: new Error("DB error") });
    expect((await POST(uploadRequest())).status).toBe(500);
    expect(state.database.storage.from().remove).toHaveBeenCalledOnce();
  });
  it("allows admins to publish and hide entries", async () => {
    for (const status of ["published", "draft"]) {
      expect((await PATCH(new Request("http://localhost", { method: "PATCH", body: JSON.stringify({ status }) }), context)).status).toBe(200);
      expect(state.database.from().update).toHaveBeenLastCalledWith({ status });
    }
  });
  it("rejects arbitrary status transitions", async () => {
    expect((await PATCH(new Request("http://localhost", { method: "PATCH", body: JSON.stringify({ status: "ready" }) }), context)).status).toBe(400);
    expect(state.database.from).not.toHaveBeenCalled();
  });
});

it.each<AppRole>(["artisan", "seller"])("preserves %s photo uploads and product 3D jobs", async (role) => {
  state.roles = [role];
  const form = new FormData();
  Object.entries({ name: "Bình gốm Việt", description: "Bình gốm thủ công của nghệ nhân Bát Tràng", priceVnd: "100000", stockQuantity: "2", heightCm: "20", widthCm: "10", engine: "auto" }).forEach(([key, value]) => form.set(key, value));
  const png = new Uint8Array(256);
  png.set([0x89, 0x50, 0x4e, 0x47]);
  form.set("images", new File([png], "pot.png", { type: "image/png" }));
  expect((await createSellerProduct(new Request("http://localhost/api/seller/products", { method: "POST", body: form }))).status).toBe(201);
  expect(state.database.from).toHaveBeenCalledWith("model_jobs");
  expect(state.database.from().insert).toHaveBeenCalledWith(expect.objectContaining({ status: "queued", engine: "auto" }));
  expect(state.database.from).not.toHaveBeenCalledWith("experiences");
  expect(state.database.storage.from).toHaveBeenCalledWith("product-source");
});
