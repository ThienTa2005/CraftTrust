import Link from "next/link";
import { type SellerProduct } from "@/components/seller-3d-studio";
import { SellerCentreView } from "@/components/seller/seller-centre-view";
import { getAuthorizedUser } from "@/lib/authz";
import { Lock, Store } from "lucide-react";

export default async function SellerPage() {
  const auth = await getAuthorizedUser(["artisan", "seller", "admin"]);
  if (auth.reason || !auth.supabase || !auth.user) {
    return (
      <div className="seller-portal-unauthorized">
        <div className="seller-unauthorized-box">
          <div className="seller-unauthorized-icon">
            <Lock size={32} />
          </div>
          <span className="eyebrow">Hanoi Craft-Trust · Kênh Người Bán</span>
          <h1>Khu Vực Quản Trị Của Nghệ Nhân</h1>
          <p>
            Đây là không gian quản lý kinh doanh, đơn hàng, sản phẩm và Studio 3D dành riêng cho các nghệ nhân và nhà bán hàng làng nghề đã được cấp quyền.
          </p>
          <div className="error-banner">{auth.reason}</div>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 20 }}>
            <Link className="button terracotta" href="/auth">
              Đăng nhập tài khoản Người bán
            </Link>
            <Link className="button secondary" href="/marketplace">
              Về sàn mua sắm
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const { data: artisan, error: artisanError } = await auth.supabase
    .from("artisans")
    .select("id,name")
    .eq("owner_id", auth.user.id)
    .maybeSingle();

  if (artisanError || !artisan) {
    return (
      <div className="seller-portal-unauthorized">
        <div className="seller-unauthorized-box">
          <div className="seller-unauthorized-icon">
            <Store size={32} />
          </div>
          <span className="eyebrow">Xưởng số nghệ nhân</span>
          <h1>Chưa có hồ sơ nghệ nhân</h1>
          <div className="error-banner">
            {artisanError?.message ??
              "Tài khoản này chưa được liên kết với hồ sơ nghệ nhân Bát Tràng."}
          </div>
          <p style={{ marginTop: 12, color: "var(--muted)", fontSize: "0.95rem" }}>
            Vui lòng liên hệ với Ban Quản Trị qua Cổng Quản Trị để kích hoạt hồ sơ xưởng làng nghề của bạn.
          </p>
        </div>
      </div>
    );
  }

  const { data: products, error } = await auth.supabase
    .from("products")
    .select(
      "id,slug,name,description,price_vnd,stock_quantity,status,poster_url,model_url,ar_url,height_cm,width_cm,dimensions_verified,shape_mode,back_texture,model_status,model_report,model_error,created_at",
    )
    .eq("artisan_id", artisan.id)
    .order("created_at", { ascending: false });

  return (
    <SellerCentreView
      artisanName={artisan.name}
      roles={auth.roles}
      initialProducts={(products ?? []) as SellerProduct[]}
      initialError={error?.message}
    />
  );
}
