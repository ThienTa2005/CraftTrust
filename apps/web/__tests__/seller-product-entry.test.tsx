import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
vi.mock("@/components/seller/seller-header", () => ({ SellerHeader: () => null }));
vi.mock("@/components/seller-3d-studio", () => ({
  Seller3DStudio: () => <div>Form tải ảnh tạo 3D sản phẩm</div>,
}));
import { SellerCentreView } from "@/components/seller/seller-centre-view";

it("opens photo-to-3D creation from Add New Product", () => {
  render(<SellerCentreView artisanName="Nghệ nhân" roles={["artisan"]} initialProducts={[]} />);
  fireEvent.click(screen.getByRole("button", { name: /Thêm Sản Phẩm Mới/ }));
  expect(screen.getByText("Form tải ảnh tạo 3D sản phẩm")).toBeVisible();
}, 15000);

