"use client";

import Link from "next/link";
import {
  Award,
  Clock,
  Leaf,
  MapPin,
  Phone,
  QrCode,
  ShieldCheck,
  Truck,
} from "lucide-react";
import { useLanguage } from "@/lib/i18n/context";

export function BuyerFooter() {
  const { locale } = useLanguage();

  return (
    <footer className="buyer-footer">
      {/* 1. SHOPPING COMMITMENTS STRIP (Cam kết bảo chứng mua sắm) */}
      <div className="buyer-footer-trust-strip">
        <div className="buyer-footer-container">
          <div className="buyer-trust-cell">
            <div className="trust-icon">
              <ShieldCheck size={26} />
            </div>
            <div>
              <strong>{locale === "vi" ? "100% Nghệ Nhân Thật" : "100% Verified Artisans"}</strong>
              <span>{locale === "vi" ? "Xác thực danh tính & xưởng nghề Bát Tràng" : "Authentic craft workshops from Hanoi"}</span>
            </div>
          </div>

          <div className="buyer-trust-cell">
            <div className="trust-icon">
              <QrCode size={26} />
            </div>
            <div>
              <strong>{locale === "vi" ? "Hộ Chiếu Di Sản Số" : "Digital Heritage Passport"}</strong>
              <span>{locale === "vi" ? "Truy xuất nguồn gốc đất, men và lò nung củi" : "Blockchain/NFC verifiable craft record"}</span>
            </div>
          </div>

          <div className="buyer-trust-cell">
            <div className="trust-icon">
              <Truck size={26} />
            </div>
            <div>
              <strong>{locale === "vi" ? "Bảo Hiểm Vỡ Hỏng 100%" : "Breakage Insurance"}</strong>
              <span>{locale === "vi" ? "Đóng gói bọc xốp khí chuyên dụng đồ gốm sứ" : "Custom fragility packaging for pottery"}</span>
            </div>
          </div>

          <div className="buyer-trust-cell">
            <div className="trust-icon">
              <Clock size={26} />
            </div>
            <div>
              <strong>{locale === "vi" ? "Đổi Trả 7 Ngày" : "7-Day Free Returns"}</strong>
              <span>{locale === "vi" ? "Bảo vệ tối đa quyền lợi người mua hàng" : "Full buyer protection policy"}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. MAIN FOOTER DIRECTORY (Cấu trúc chân trang TMĐT chuyên nghiệp) */}
      <div className="buyer-footer-main">
        <div className="buyer-footer-container buyer-footer-grid">
          {/* Col 1: Về sàn */}
          <div className="buyer-footer-col">
            <div className="buyer-footer-brand">
              <span className="brand-mark">
                <Leaf size={20} />
              </span>
              <span className="brand-title">HANOI CRAFT-TRUST</span>
            </div>
            <p className="buyer-footer-desc">
              {locale === "vi"
                ? "Nền tảng thương mại điện tử kết nối người yêu văn hóa với các nghệ nhân tinh hoa làng nghề truyền thống Thăng Long – Hà Nội. Tiên phong áp dụng Hộ chiếu số, công nghệ 3D/AR và thẩm định xuất xứ."
                : "The dedicated marketplace connecting cultural collectors with Hanoi heritage craft masters. Pioneering Digital Heritage Passports, interactive 3D/AR, and origin verification."}
            </p>
            <div className="buyer-footer-contact">
              <div className="contact-item">
                <MapPin size={16} />
                <span>Thôn Bát Tràng, Xã Bát Tràng, Gia Lâm, Hà Nội</span>
              </div>
              <div className="contact-item">
                <Phone size={16} />
                <span>Hotline: 1900 6868 · 024 3874 0123</span>
              </div>
            </div>
          </div>

          {/* Col 2: Chăm sóc khách hàng */}
          <div className="buyer-footer-col">
            <h4>{locale === "vi" ? "Chăm Sóc Khách Hàng" : "Customer Care"}</h4>
            <ul className="buyer-footer-links">
              <li>
                <Link href="/docs">{locale === "vi" ? "Trung tâm trợ giúp & FAQ" : "Help Center & FAQ"}</Link>
              </li>
              <li>
                <Link href="/orders">{locale === "vi" ? "Tra cứu đơn mua" : "Track My Order"}</Link>
              </li>
              <li>
                <Link href="/docs">{locale === "vi" ? "Chính sách vận chuyển gốm sứ" : "Pottery Shipping Terms"}</Link>
              </li>
              <li>
                <Link href="/docs">{locale === "vi" ? "Chính sách đổi trả & hoàn tiền" : "Returns & Refund Policy"}</Link>
              </li>
              <li>
                <Link href="/docs">{locale === "vi" ? "Chính sách bảo hành men gốm" : "Ceramic Warranty Policy"}</Link>
              </li>
              <li>
                <Link href="/assistant">{locale === "vi" ? "Trò chuyện với AI Di Sản" : "Heritage AI Guide"}</Link>
              </li>
            </ul>
          </div>

          {/* Col 3: Dành cho đối tác & Nghệ nhân */}
          <div className="buyer-footer-col">
            <h4>{locale === "vi" ? "Kênh Người Bán & Đối Tác" : "Artisans & Sellers"}</h4>
            <ul className="buyer-footer-links">
              <li>
                <Link href="/seller" className="seller-portal-highlight">
                  <strong>{locale === "vi" ? "Kênh Người Bán (Seller Centre)" : "Seller Centre"}</strong>
                </Link>
              </li>
              <li>
                <Link href="/seller">{locale === "vi" ? "Quy chế hoạt động sàn TMĐT" : "Marketplace Regulations"}</Link>
              </li>
              <li>
                <Link href="/admin">{locale === "vi" ? "Cổng Kiểm Duyệt Di Sản (Admin)" : "Admin Verification Desk"}</Link>
              </li>
              <li>
                <Link href="/docs">{locale === "vi" ? "Quy chuẩn thẩm định Hộ chiếu số" : "Passport Auditing Standard"}</Link>
              </li>
              <li>
                <Link href="/villages/bat-trang">{locale === "vi" ? "Liên hệ kết nối xưởng nghề mới" : "Register New Workshop"}</Link>
              </li>
            </ul>
          </div>

          {/* Col 4: Thanh toán & Vận chuyển */}
          <div className="buyer-footer-col">
            <h4>{locale === "vi" ? "Thanh Toán & Vận Chuyển" : "Payment & Shipping"}</h4>
            <div className="payment-badges">
              <span className="payment-badge">VietQR</span>
              <span className="payment-badge">Napas 24/7</span>
              <span className="payment-badge">Visa / Master</span>
              <span className="payment-badge">Thanh toán khi nhận</span>
            </div>
            <h4 style={{ marginTop: 20 }}>{locale === "vi" ? "Đối Tác Vận Chuyển" : "Logistics Partners"}</h4>
            <div className="payment-badges">
              <span className="payment-badge">VNPost Tiết Kiệm</span>
              <span className="payment-badge">ViettelPost Fragile</span>
              <span className="payment-badge">GHTK Gốm Sứ</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. FOOTER BOTTOM */}
      <div className="buyer-footer-bottom">
        <div className="buyer-footer-container bottom-flex">
          <div>
            <span>© 2026 HANOI CRAFT-TRUST. Tất cả các quyền được bảo lưu.</span>
            <span className="sep">·</span>
            <span>Đề tài Nghiên cứu Ứng dụng Di sản Thủ công & Công nghệ Số Thăng Long</span>
          </div>
          <div className="bottom-badges">
            <span className="gov-seal">
              <Award size={14} /> {locale === "vi" ? "Bảo chứng Làng nghề Bát Tràng" : "Bat Trang Certified"}
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
