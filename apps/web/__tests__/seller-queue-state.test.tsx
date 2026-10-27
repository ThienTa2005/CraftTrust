import React from "react";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { Seller3DStudio, type SellerProduct } from "@/components/seller-3d-studio";

vi.mock("@/components/model-viewer", () => ({ CraftModelViewer: () => null }));

const product: SellerProduct = {
  id: "product", slug: "binh-men", name: "bình men", description: "Bình men thủ công",
  price_vnd: 500000, stock_quantity: 1, status: "draft", poster_url: null,
  model_url: null, ar_url: null, height_cm: 26.9, width_cm: 16,
  dimensions_verified: false, shape_mode: "photo", back_texture: "mirror",
  model_status: "queued", model_report: null, model_error: null,
  created_at: "2026-10-25T02:39:49Z",
  model_job: { id: "job", status: "queued", created_at: "2026-10-25T02:39:49Z", current_step: "queued" },
};

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ orders: [] }) }));
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

it("does not activate reconstruction stages before a worker claims the job", async () => {
  const { container } = render(<Seller3DStudio artisanName="Nghệ nhân" roles={["artisan"]} initialProducts={[product]} />);
  expect(screen.getByText("Đang chờ tạo mô hình 3D")).toBeVisible();
  expect(container.querySelectorAll(".seller-stepper-step.active")).toHaveLength(0);
  await waitFor(() => expect(fetch).toHaveBeenCalled());
});

it("explains a delayed queue without asking the seller to upload again", async () => {
  render(<Seller3DStudio artisanName="Nghệ nhân" roles={["artisan"]} initialProducts={[{ ...product, model_queue_delayed: true }]} />);
  expect(screen.getByText("Chờ xử lý lâu")).toBeVisible();
  expect(screen.getByText(/Ảnh đã được lưu; không cần tải lại/)).toBeVisible();
  await waitFor(() => expect(fetch).toHaveBeenCalled());
});

it("shows the stage reported by the worker", async () => {
  const { container } = render(<Seller3DStudio artisanName="Nghệ nhân" roles={["artisan"]} initialProducts={[{ ...product, model_status: "processing", model_job: { ...product.model_job!, status: "running", current_step: "pixal3d_inference" } }]} />);
  expect(container.querySelectorAll(".seller-stepper-step.active")).toHaveLength(3);
  await waitFor(() => expect(fetch).toHaveBeenCalled());
});

it("shows actionable placeholder and create 3D button when model is not_requested without infinite spinner", async () => {
  const notRequestedProduct: SellerProduct = {
    ...product,
    model_status: "not_requested",
    model_url: null,
    model_version: null,
    model_job: null,
  };
  const { container } = render(<Seller3DStudio artisanName="Nghệ nhân" roles={["artisan"]} initialProducts={[notRequestedProduct]} />);

  // Must show clear heading
  expect(screen.getByText("Chưa tạo mô hình 3D")).toBeVisible();
  // Must provide actionable button
  expect(screen.getByRole("button", { name: /Tạo mô hình 3D bằng AI/i })).toBeVisible();
  // Must NOT show infinite spinner in the placeholder
  expect(container.querySelector(".seller-model-placeholder .seller-spin")).toBeNull();
  await waitFor(() => expect(fetch).toHaveBeenCalled());
});

