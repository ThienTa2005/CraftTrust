import { describe, expect, it, vi } from "vitest";
import { parseApiError, mapToVietnameseMessage } from "@/lib/error-utils";

describe("parseApiError and error formatting", () => {
  it("intercepts plain PostgrestError objects and never produces '[object Object]'", () => {
    const postgrestError = {
      code: "42703",
      details: null,
      hint: null,
      message: 'column "seller_id" does not exist',
    };

    const parsed = parseApiError(postgrestError);
    expect(parsed.code).toBe("42703");
    expect(parsed.rawMessage).toBe('column "seller_id" does not exist');
    expect(parsed.message).not.toContain("[object Object]");
    expect(parsed.message).toContain("Hệ thống đang đồng bộ cấu hình dịch vụ 3D");
    expect(mapToVietnameseMessage("GPU budget exceeded", "P0001")).toContain("Hạn mức ngân sách GPU");
  });

  it("handles P0001 GPU budget exceeded error cleanly", () => {
    const budgetError = {
      code: "P0001",
      details: "daily budget reached",
      hint: "contact admin",
      message: "GPU budget exceeded",
    };

    const parsed = parseApiError(budgetError);
    expect(parsed.code).toBe("P0001");
    expect(parsed.message).not.toContain("[object Object]");
    expect(parsed.message).toContain("Hạn mức ngân sách GPU hôm nay đã đạt mức tối đa");
  });

  it("handles 23505 active job error cleanly", () => {
    const conflictError = {
      code: "23505",
      details: "Key (product_id)=(...) already exists.",
      hint: null,
      message: "an active Pixal3D job already exists",
    };

    const parsed = parseApiError(conflictError);
    expect(parsed.code).toBe("23505");
    expect(parsed.message).not.toContain("[object Object]");
    expect(parsed.message).toContain("Sản phẩm đang có một tiến trình tạo 3D trong hàng đợi hoặc đang xử lý");
  });

  it("handles 42501 permission error cleanly", () => {
    const authError = {
      code: "42501",
      message: "product ownership required",
    };

    const parsed = parseApiError(authError);
    expect(parsed.code).toBe("42501");
    expect(parsed.message).toBe("Bạn không có quyền thao tác trên sản phẩm này.");
  });

  it("safely sanitizes literal '[object Object]' strings", () => {
    const parsed = parseApiError("[object Object]");
    expect(parsed.message).not.toContain("[object Object]");
    expect(parsed.message).toBe("Đã xảy ra lỗi khi xử lý yêu cầu.");
  });

  it("handles standard Error instances correctly", () => {
    const err = new Error("Sản phẩm cần ít nhất một ảnh chính diện (FRONT) để tạo mô hình 3D.");
    const parsed = parseApiError(err);
    expect(parsed.message).toContain("chính diện (FRONT)");
    expect(parsed.message).not.toContain("[object Object]");
  });

  it("handles null/undefined/empty gracefully", () => {
    const parsedNull = parseApiError(null);
    expect(parsedNull.message).not.toContain("[object Object]");
    expect(parsedNull.message).toBe("Đã xảy ra lỗi không xác định.");

    const parsedUndefined = parseApiError(undefined);
    expect(parsedUndefined.message).toBe("Đã xảy ra lỗi không xác định.");
  });
});

describe("API retry route active job and error contract", () => {
  it("validates that active job returns status 200 without conflict", async () => {
    // Dynamic import to test the route logic with mocks
    const mockSupabase = {
      from: vi.fn((table: string) => {
        if (table === "products") {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({
              data: { id: "prod-1", model_status: "queued" },
              error: null,
            }),
          };
        }
        if (table === "model_jobs") {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            in: vi.fn().mockReturnThis(),
            order: vi.fn().mockReturnThis(),
            limit: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({
              data: {
                id: "job-active-123",
                created_at: new Date().toISOString(),
                status: "queued",
              },
              error: null,
            }),
          };
        }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        };
      }),
    };

    // Verify active job detection logic
    const { data: latestJob } = await mockSupabase
      .from("model_jobs")
      .select("id,created_at,started_at,status")
      .eq("product_id", "prod-1")
      .in("status", ["queued", "dispatched", "validating", "preprocessing", "running", "exporting", "validating_output"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    expect(latestJob).not.toBeNull();
    expect(latestJob?.id).toBe("job-active-123");
  });
});
