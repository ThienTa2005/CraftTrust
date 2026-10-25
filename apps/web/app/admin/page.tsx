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
            <Link className="button terracotta" href="/auth?next=/admin">
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

  // 1. Evidence Submissions (support both legacy schema and hardened schema safely)
  let evidenceData: any[] | null = null;
  let evidenceError: any = null;

  const evidenceRes = await auth.supabase
    .from("evidence_submissions")
    .select(
      "id,evidence_type,statement,status,created_at,passport_records(public_id,products(name)),heritage_sources(title,approval_status)"
    )
    .order("created_at", { ascending: false });

  if (evidenceRes.error) {
    const fallbackRes = await auth.supabase
      .from("evidence_submissions")
      .select("id,evidence_type,statement,status,created_at")
      .order("created_at", { ascending: false });
    evidenceData = fallbackRes.data ?? [];
    evidenceError = fallbackRes.error;
  } else {
    evidenceData = evidenceRes.data ?? [];
    evidenceError = null;
  }

  // 2. Real Products across Platform
  const { data: productsData } = await auth.supabase
    .from("products")
    .select(`
      id, name, slug, price_vnd, stock_quantity, status, model_status, created_at, poster_url,
      artisans ( id, name, villages ( id, name ) ),
      product_model_assets ( id, status, original_filename, file_size )
    `)
    .order("created_at", { ascending: false });

  // 3. Real Merchants / Artisans
  const { data: artisansData } = await auth.supabase
    .from("artisans")
    .select(`
      id, name, slug, bio, years_practicing, is_published, created_at, owner_id,
      villages ( id, name, district ),
      products ( id )
    `)
    .order("created_at", { ascending: false });

  // 4. Real Platform Orders
  const { data: ordersData } = await auth.supabase
    .from("orders")
    .select(`
      id, status, subtotal_vnd, payment_mode, shipping_address, created_at, updated_at, user_id,
      profiles ( display_name ),
      order_items ( id, product_name, quantity, unit_price_vnd )
    `)
    .order("created_at", { ascending: false });

  // 5. Real Audit Events
  const { data: auditData } = await auth.supabase
    .from("audit_events")
    .select("id, action, entity_type, entity_id, actor_id, created_at, after_data")
    .order("created_at", { ascending: false })
    .limit(40);

  // 6. Real Villages
  const { data: villagesData } = await auth.supabase
    .from("villages")
    .select("id, name, slug, district, is_published, summary, artisans(id)")
    .order("name");

  // 7. Aggregated Metrics
  const { count: usersCount } = await auth.supabase
    .from("profiles")
    .select("*", { count: "exact", head: true });

  const { count: passportsCount } = await auth.supabase
    .from("passport_records")
    .select("*", { count: "exact", head: true });

  const { count: modelsCount } = await auth.supabase
    .from("product_model_assets")
    .select("*", { count: "exact", head: true });

  const orders = ordersData ?? [];
  const products = productsData ?? [];
  const artisans = artisansData ?? [];

  const totalGmvVnd = orders.reduce((sum, o) => sum + Number(o.subtotal_vnd || 0), 0);
  const activeProducts = products.filter((p) => p.status === "active").length;
  const pendingProducts = products.filter((p) => p.status === "draft").length;

  const stats = {
    totalBuyers: usersCount ?? 0,
    totalMerchants: artisans.length,
    totalProducts: products.length,
    activeProducts,
    pendingProducts,
    totalOrders: orders.length,
    totalGmvVnd,
    totalPassports: passportsCount ?? 0,
    total3DModels: modelsCount ?? 0,
  };

  return (
    <AdminPortalView
      roles={auth.roles}
      initialEvidence={evidenceData ?? []}
      initialProducts={products}
      initialMerchants={artisans}
      initialOrders={orders}
      initialAuditLogs={auditData ?? []}
      initialVillages={villagesData ?? []}
      initialStats={stats}
      initialError={evidenceError?.message}
    />
  );
}
