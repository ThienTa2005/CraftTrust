import Link from "next/link";
import { Lock } from "lucide-react";
import { AdminPortalView } from "@/components/admin/admin-portal-view";
import { getAuthorizedUser } from "@/lib/authz";

export default async function AdminPage() {
  const auth = await getAuthorizedUser(["verifier", "admin"]);

  if (auth.reason || !auth.supabase || !auth.user) {
    return (
      <div className="admin-portal-unauthorized">
        <div className="admin-unauthorized-box">
          <div className="admin-unauthorized-icon">
            <Lock size={32} />
          </div>
          <span className="eyebrow">Hanoi Craft-Trust · Cổng Quản Trị</span>
          <h1>Khu Vực Quản Trị & Thẩm Định Di Sản</h1>
          <p>
            Cổng điều hành toàn sàn, kiểm định minh chứng xuất xứ làng nghề, kiểm duyệt mô hình 3D và cấp Hộ chiếu số chỉ dành cho thành viên Hội đồng Thẩm định (Verifier) và Quản trị viên (Admin).
          </p>
          <div className="error-banner">{auth.reason}</div>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 20 }}>
            <Link className="button terracotta" href="/auth">
              Đăng nhập Quản trị viên
            </Link>
            <Link className="button secondary" href="/marketplace">
              Về sàn mua sắm
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const { data, error } = await auth.supabase
    .from("evidence_submissions")
    .select(
      "id,evidence_type,statement,status,created_at,passport_records(public_id,products(name)),heritage_sources(title,approval_status)",
    )
    .eq("status", "pending")
    .order("created_at");

  return (
    <AdminPortalView
      roles={auth.roles}
      initialEvidence={data ?? []}
      initialError={error?.message}
    />
  );
}
