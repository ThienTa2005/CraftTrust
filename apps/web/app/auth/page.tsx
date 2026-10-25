import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthView } from "@/components/auth-view";
import { BrandedLoader } from "@/components/branded-loader";

export const metadata: Metadata = {
  title: "Đăng nhập · Sign In · Hanoi CraftTrust",
  description: "Cổng đăng nhập hệ thống Hanoi CraftTrust dành cho Khách hàng, Nghệ nhân và Quản trị viên.",
};

export default function AuthPage() {
  return (
    <Suspense fallback={<BrandedLoader message="Đang tải cổng xác thực CraftTrust..." />}>
      <AuthView />
    </Suspense>
  );
}
