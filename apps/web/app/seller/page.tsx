import Link from "next/link";
import {
  Seller3DStudio,
  type SellerProduct,
} from "@/components/seller-3d-studio";
import { getAuthorizedUser } from "@/lib/authz";

export default async function SellerPage() {
  const auth = await getAuthorizedUser(["artisan", "seller", "admin"]);
  if (auth.reason || !auth.supabase || !auth.user) {
    return (
      <section className="shell page-hero">
        <span className="eyebrow">Xưởng số nghệ nhân</span>
        <h1>Không gian quản lý được bảo vệ</h1>
        <div className="error-banner">{auth.reason}</div>
        <Link className="button seller-sign-in" href="/auth">
          Đăng nhập
        </Link>
      </section>
    );
  }

  const { data: artisan, error: artisanError } = await auth.supabase
    .from("artisans")
    .select("id,name")
    .eq("owner_id", auth.user.id)
    .maybeSingle();

  if (artisanError || !artisan) {
    return (
      <section className="shell page-hero">
        <span className="eyebrow">Xưởng số nghệ nhân</span>
        <h1>Chưa có hồ sơ nghệ nhân</h1>
        <div className="error-banner">
          {artisanError?.message ??
            "Tài khoản này chưa được liên kết với hồ sơ nghệ nhân Bát Tràng."}
        </div>
      </section>
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
    <Seller3DStudio
      artisanName={artisan.name}
      roles={auth.roles}
      initialProducts={(products ?? []) as SellerProduct[]}
      initialError={error?.message}
    />
  );
}
