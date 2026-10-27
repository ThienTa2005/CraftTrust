import { describe, expect, it, vi, beforeEach } from "vitest";

// Mock Supabase
const mockSignedUrl = vi.fn();
const mockFrom = vi.fn();

vi.mock("@/lib/supabase", () => ({
  createRequestSupabase: vi.fn(),
  createServiceSupabase: vi.fn(),
}));

import { GET } from "@/app/api/models/[id]/route";
import { createRequestSupabase, createServiceSupabase } from "@/lib/supabase";

describe("GET /api/models/[id] Regression Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 404 with JSON error on invalid UUID format", async () => {
    const res = await GET(new Request("http://localhost/api/models/invalid-uuid"), {
      params: Promise.resolve({ id: "invalid-uuid" }),
    });
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe("Model unavailable");
  });

  it("returns 404 when model is not found", async () => {
    vi.mocked(createServiceSupabase).mockReturnValue({
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
          }),
        }),
      }),
      storage: { from: vi.fn() },
    } as any);

    const res = await GET(new Request("http://localhost/api/models/106e45ac-a9e9-49bb-bf98-f33518f3bdf8"), {
      params: Promise.resolve({ id: "106e45ac-a9e9-49bb-bf98-f33518f3bdf8" }),
    });
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe("Model unavailable");
  });

  it("redirects with status 307 to absolute signed URL when published model exists", async () => {
    vi.mocked(createServiceSupabase).mockReturnValue({
      from: vi.fn((table: string) => {
        if (table === "product_model_assets") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: {
                    storage_path: "seller/prod/job/pixal3d.glb",
                    status: "published",
                    product_id: "047a1c40-4bb6-4718-9397-3e0a9130df53",
                  },
                  error: null,
                }),
              }),
            }),
          };
        }
        return { select: vi.fn().mockReturnThis() };
      }),
      storage: {
        from: vi.fn().mockReturnValue({
          createSignedUrl: vi.fn().mockResolvedValue({
            data: { signedUrl: "/object/sign/product-models/seller/prod/job/pixal3d.glb?token=xyz" },
            error: null,
          }),
        }),
      },
    } as any);

    const res = await GET(new Request("http://localhost/api/models/106e45ac-a9e9-49bb-bf98-f33518f3bdf8"), {
      params: Promise.resolve({ id: "106e45ac-a9e9-49bb-bf98-f33518f3bdf8" }),
    });
    expect(res.status).toBe(307);
    const location = res.headers.get("location");
    expect(location).toContain("https://");
    expect(location).toContain("/storage/v1/object/sign/product-models");
  });
});
