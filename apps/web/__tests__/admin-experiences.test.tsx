import React from "react";
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { AdminExperiences } from "@/components/admin/admin-experiences";
import { AdminSidebar } from "@/components/admin/admin-sidebar";

vi.mock("next/link", () => ({ default: ({ href, children }: { href: string; children: React.ReactNode }) => <a href={href}>{children}</a> }));

vi.mock("@/components/experience-viewer", () => ({
  ExperienceViewer: ({ id, onReady }: { id: string; onReady: (id: string) => void }) =>
    <button onClick={() => onReady(id)}>Model loaded</button>,
}));
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

it("requires a loaded preview before publishing, and supports hiding published content", async () => {
  const item = { id: "model-id", title: "Gốm Việt", description: "Một tác phẩm", status: "draft", product: { id: "product-id", name: "Bình gốm", artisan: "Nghệ nhân An" } };
  const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
    if (init?.method === "PATCH") {
      item.status = JSON.parse(String(init.body)).status;
      return Response.json({ id: item.id, status: item.status });
    }
    return Response.json({ experiences: [item], products: [] });
  });
  vi.stubGlobal("fetch", fetchMock);
  render(<AdminExperiences />);
  const publish = await screen.findByRole("button", { name: "Xuất bản" });
  expect(publish).toBeDisabled();
  fireEvent.click(screen.getByRole("button", { name: "Xem trước" }));
  fireEvent.click(screen.getByRole("button", { name: "Model loaded" }));
  expect(publish).toBeEnabled();
  fireEvent.click(publish);
  const hide = await screen.findByRole("button", { name: "Ẩn trải nghiệm" });
  await waitFor(() => expect(hide).toBeEnabled());
  fireEvent.click(hide);
  await waitFor(() => expect(fetchMock).toHaveBeenCalledWith("/api/admin/experiences/model-id", expect.objectContaining({ method: "PATCH", body: JSON.stringify({ status: "draft" }) })));
});

it("creates a draft from an existing artisan product model", async () => {
  const product = { id: "11111111-1111-4111-8111-111111111111", name: "Bình gốm", artisan: "Nghệ nhân An", modelAssetId: "asset-id" };
  const fetchMock = vi.fn(async (_url: string, init?: RequestInit) =>
    Response.json(init?.method === "POST" ? { id: "new-model" } : { experiences: [], products: [product] }),
  );
  vi.stubGlobal("fetch", fetchMock);
  render(<AdminExperiences />);
  await screen.findByText("Chưa có trải nghiệm. Hãy chọn một sản phẩm 3D ở trên.");
  fireEvent.change(screen.getByLabelText(/Sản phẩm 3D/), { target: { value: product.id } });
  fireEvent.change(screen.getByLabelText("Tiêu đề"), { target: { value: "Mô hình gốm" } });
  fireEvent.submit(screen.getByRole("button", { name: "Tạo trải nghiệm từ sản phẩm" }).closest("form")!);
  await waitFor(() => expect(fetchMock).toHaveBeenCalledWith("/api/admin/experiences", expect.objectContaining({
    method: "POST",
    body: JSON.stringify({ productId: product.id, title: "Mô hình gốm", description: "" }),
  })));
  expect(await screen.findByText(/Đã tạo bản nháp/)).toBeVisible();
});

it("exposes the experience management menu only to admins", () => {
  const { rerender } = render(<AdminSidebar activeTab="overview" onSelectTab={() => {}} />);
  expect(screen.queryByRole("button", { name: "Trải nghiệm 3D/VR" })).not.toBeInTheDocument();
  rerender(<AdminSidebar activeTab="overview" onSelectTab={() => {}} canManageExperiences />);
  expect(screen.getByRole("button", { name: "Trải nghiệm 3D/VR" })).toBeVisible();
});
