import Link from "next/link";
import { type SellerProduct } from "@/components/seller-3d-studio";
import { SellerCentreView } from "@/components/seller/seller-centre-view";
import { SellerRegistrationForm } from "@/components/seller/seller-registration-form";
import { getAuthorizedUser } from "@/lib/authz";
import { Lock } from "lucide-react";

export interface SellerOrderItem {
  id: string;
  order_id: string;
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price_vnd: number;
  line_total_vnd: number;
  personalization?: { text: string; finish: string; fontSizeMm?: number } | null;
}

export interface SellerOrderRecord {
  id: string;
  status: string;
  subtotal_vnd: number;
  payment_mode: string;
  shipping_address: string | Record<string, any>;
  created_at: string;
  seller_items: SellerOrderItem[];
}

export default async function SellerPage() {
  const auth = await getAuthorizedUser(["artisan", "seller", "admin"]);
  if (auth.reason || !auth.supabase || !auth.user) {
    return (
      <div className="seller-portal-unauthorized">
        <div className="seller-unauthorized-box">
          <div className="seller-unauthorized-icon">
            <Lock size={32} />
          </div>
          <span className="eyebrow">Hanoi CraftTrust · Kênh Người Bán</span>
          <h1>Khu Vực Quản Trị Của Nghệ Nhân</h1>
          <p>
            Đây là không gian quản lý kinh doanh, đơn hàng, sản phẩm và Studio 3D dành riêng cho các nghệ nhân và nhà bán hàng làng nghề đã được cấp quyền.
          </p>
          <div className="error-banner">{auth.reason}</div>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 20 }}>
            <Link className="button terracotta" href="/auth?next=/seller">
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

  const { data: artisan } = await auth.supabase
    .from("artisans")
    .select("id,name")
    .eq("owner_id", auth.user.id)
    .maybeSingle();

  if (!artisan) {
    const { data: villages } = await auth.supabase
      .from("villages")
      .select("id, name, district")
      .order("name");

    return (
      <div className="seller-portal-unauthorized">
        <SellerRegistrationForm villages={villages ?? []} />
      </div>
    );
  }

  const { data: products, error: productError } = await auth.supabase
    .from("products")
    .select(
      "id,slug,name,description,price_vnd,stock_quantity,status,poster_url,model_url,ar_url,height_cm,width_cm,dimensions_verified,shape_mode,back_texture,model_status,model_report,model_error,created_at",
    )
    .eq("artisan_id", artisan.id)
    .order("created_at", { ascending: false });

  // Query real orders for this artisan's products
  const productIds = (products ?? []).map((p) => p.id);
  let initialOrders: SellerOrderRecord[] = [];

  if (productIds.length > 0) {
    const { data: items } = await auth.supabase
      .from("order_items")
      .select("id,order_id,product_id,product_name,quantity,unit_price_vnd,line_total_vnd,created_at")
      .in("product_id", productIds)
      .order("created_at", { ascending: false });

    const orderIds = [...new Set((items ?? []).map((i) => i.order_id))];
    if (orderIds.length > 0) {
      const { data: ordersData } = await auth.supabase
        .from("orders")
        .select("id,status,subtotal_vnd,payment_mode,shipping_address,created_at")
        .in("id", orderIds)
        .order("created_at", { ascending: false });

      initialOrders = (ordersData ?? []).map((order) => ({
        ...order,
        seller_items: (items ?? []).filter((item) => item.order_id === order.id),
      }));
    }
  }

  return (
    <SellerCentreView
      artisanName={artisan.name}
      roles={auth.roles}
      initialProducts={(products ?? []) as SellerProduct[]}
      initialOrders={initialOrders}
      initialError={productError?.message}
    />
  );
}
