import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Cổng Quản Trị Hệ Thống · CraftTrust Admin Portal",
  description:
    "Cổng điều hành toàn sàn, thẩm định minh chứng xuất xứ làng nghề, kiểm định mô hình 3D và cấp Hộ chiếu di sản số.",
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="admin-portal-root-wrapper">{children}</div>;
}
