import type { Metadata } from "next";
import { AuthView } from "@/components/auth-view";

export const metadata: Metadata = {
  title: "Đăng nhập · Sign In"
};

export default function AuthPage() {
  return <AuthView />;
}
