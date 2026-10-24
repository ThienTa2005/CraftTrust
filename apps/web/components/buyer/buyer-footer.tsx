"use client";
import Link from "next/link";
import { BrandLogo } from "@/components/brand-logo";
import { useLanguage } from "@/lib/i18n/context";
export function BuyerFooter() {
  const { locale } = useLanguage();
  const vi = locale === "vi";
  return <footer className="craft-footer"><div className="shell craft-footer-grid">
    <div><BrandLogo /><p>{vi ? "Kết nối nghệ nhân, tác phẩm thủ công và câu chuyện làng nghề Hà Nội." : "Connecting artisans, handcrafted works and Hanoi's craft heritage."}</p><small>Hanoi Craft-Trust · CraftTrust</small></div>
    <div><h3>{vi ? "Khám phá" : "Explore"}</h3><Link href="/marketplace">{vi ? "Tác phẩm thủ công" : "Craft collection"}</Link><Link href="/villages">{vi ? "Làng nghề Hà Nội" : "Craft villages"}</Link><Link href="/experiences">3D/VR</Link><Link href="/map">{vi ? "Bản đồ làng nghề" : "Village map"}</Link></div>
    <div><h3>{vi ? "Tài khoản & hỗ trợ" : "Account & help"}</h3><Link href="/orders">{vi ? "Đơn mua" : "Orders"}</Link><Link href="/auth">{vi ? "Đăng nhập" : "Sign in"}</Link><Link href="/docs">{vi ? "Hướng dẫn & chính sách" : "Guides & policies"}</Link><Link href="/assistant">{vi ? "Trợ lý di sản" : "Heritage assistant"}</Link></div>
    <div><h3>{vi ? "Dành cho đối tác" : "Partners"}</h3><Link href="/seller">{vi ? "Kênh nghệ nhân" : "Seller Centre"}</Link><Link href="/admin">{vi ? "Cổng quản trị" : "Admin Portal"}</Link><p>{vi ? "Thông tin nguồn gốc được thể hiện theo hồ sơ minh chứng của từng tác phẩm. Vui lòng xem chi tiết hộ chiếu trước khi mua." : "Origin information reflects each work's evidence record. Review its passport before purchasing."}</p></div>
  </div><div className="shell craft-footer-bottom">© {new Date().getFullYear()} CraftTrust · {vi ? "Thanh toán hiện ở chế độ thử nghiệm; không thu tiền thật." : "Checkout is currently in test mode; no real payment is collected."}</div></footer>;
}
