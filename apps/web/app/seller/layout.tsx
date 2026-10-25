import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Kênh Người Bán · CraftTrust Seller Centre",
  description:
    "Không gian quản trị kinh doanh, quản lý sản phẩm, đơn hàng và Studio 3D/AR dành riêng cho nghệ nhân làng nghề.",
};

export default function SellerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="seller-centre-portal-wrapper">{children}</div>;
}
