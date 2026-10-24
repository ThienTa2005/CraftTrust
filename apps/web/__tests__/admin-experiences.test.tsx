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
  const item = { id: "model-id", title: "Gốm Việt", description: "Một tác phẩm", status: "draft" };
  const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
    if (init?.method === "PATCH") {
      item.status = JSON.parse(String(init.body)).status;
      return Response.json({ id: item.id, status: item.status });
    }
    return Response.json({ experiences: [item] });
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

it("uploads models to the admin endpoint as drafts", async () => {
  const fetchMock = vi.fn(async (_url: string, init?: RequestInit) =>
    Response.json(init?.method === "POST" ? { id: "new-model" } : { experiences: [] }),
  );
  vi.stubGlobal("fetch", fetchMock);
  render(<AdminExperiences />);
  await screen.findByText("Chưa có trải nghiệm. Hãy tải lên mô hình đầu tiên.");
  fireEvent.change(screen.getByLabelText("Tiêu đề"), { target: { value: "Mô hình gốm" } });
  fireEvent.change(screen.getByLabelText(/Mô hình GLB/), { target: { files: [new File(["glb"], "pot.glb")] } });
  fireEvent.submit(screen.getByRole("button", { name: "Tải lên và lưu nháp" }).closest("form")!);
  await waitFor(() => expect(fetchMock).toHaveBeenCalledWith("/api/admin/experiences", expect.objectContaining({ method: "POST", body: expect.any(FormData) })));
  expect(await screen.findByText(/Đã lưu bản nháp/)).toBeVisible();
});

it("exposes the experience management menu only to admins", () => {
  const { rerender } = render(<AdminSidebar activeTab="overview" onSelectTab={() => {}} />);
  expect(screen.queryByRole("button", { name: "Trải nghiệm 3D/VR" })).not.toBeInTheDocument();
  rerender(<AdminSidebar activeTab="overview" onSelectTab={() => {}} canManageExperiences />);
  expect(screen.getByRole("button", { name: "Trải nghiệm 3D/VR" })).toBeVisible();
});
