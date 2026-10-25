"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ChevronDown,
  Gift,
  HelpCircle,
  Menu,
  QrCode,
  Search,
  ShoppingBag,
  Sparkles,
  UserRound,
  X,
  Glasses,
  MapPin,
  Layers,
} from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useLanguage } from "@/lib/i18n/context";
import { LanguageSwitcher } from "@/components/language-switcher";
import { BrandLogo } from "@/components/brand-logo";
import { getDemoCart, type DemoCartItem } from "@/lib/cart-store";
import { formatVnd } from "@/lib/format";
import { createBrowserSupabase } from "@/lib/supabase-browser";

export function BuyerHeader() {
  const { locale } = useLanguage();
  const router = useRouter();
  const pathname = usePathname();
  const [currentTier, setCurrentTier] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      setCurrentTier(params.get("tier"));
    }
  }, [pathname]);

  const isAllProductsActive = pathname === "/marketplace" && currentTier !== "gold";
  const isGoldActive = pathname === "/marketplace" && currentTier === "gold";
  const isExperiencesActive = pathname.startsWith("/experiences");
  const isMapActive = pathname.startsWith("/map");
  const isRewardsActive = pathname.startsWith("/rewards");

  // Search state
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");

  // Cart state
  const [cartItems, setCartItems] = useState<DemoCartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);

  // User state
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userRoles, setUserRoles] = useState<string[]>([]);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  // Mobile menu state
  const [mobileOpen, setMobileOpen] = useState(false);

  // Passport modal state
  const [passportModalOpen, setPassportModalOpen] = useState(false);
  const [passportQuery, setPassportQuery] = useState("");
  useEffect(() => {
    if (!mobileOpen && !passportModalOpen) return;
    const close = (event: KeyboardEvent) => { if (event.key === "Escape") { setMobileOpen(false); setPassportModalOpen(false); } };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [mobileOpen, passportModalOpen]);

  const supabase = useMemo(() => {
    try {
      return createBrowserSupabase();
    } catch {
      return null;
    }
  }, []);

  // Sync Cart
  useEffect(() => {
    const updateCart = () => setCartItems(getDemoCart());
    updateCart();
    window.addEventListener("hct_cart_updated", updateCart);
    return () => window.removeEventListener("hct_cart_updated", updateCart);
  }, []);

  // Sync Auth & Roles
  useEffect(() => {
    if (!supabase) return;
    async function syncUser() {
      const { data } = await supabase!.auth.getUser();
      if (data?.user) {
        setUserEmail(data.user.email ?? "Khách hàng");
        const { data: roles } = await supabase!
          .from("user_roles")
          .select("role")
          .eq("user_id", data.user.id);
        setUserRoles((roles ?? []).map((r) => r.role));
      } else {
        setUserEmail(null);
        setUserRoles([]);
      }
    }
    void syncUser();
    const { data: listener } = supabase.auth.onAuthStateChange(() => {
      void syncUser();
    });
    return () => listener.subscription.unsubscribe();
  }, [supabase]);

  const totalCartCount = cartItems.reduce((acc, item) => acc + item.quantity, 0);
  const cartSubtotal = cartItems.reduce(
    (acc, item) => acc + item.priceVnd * item.quantity,
    0,
  );

  const isSeller = userRoles.includes("seller") || userRoles.includes("artisan");
  const isAdmin = userRoles.includes("admin") || userRoles.includes("verifier");

  function handleSearchSubmit(e: FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (searchTerm.trim()) params.set("q", searchTerm.trim());
    if (selectedCategory !== "all") params.set("cat", selectedCategory);
    router.push(`/marketplace?${params.toString()}`);
  }

  function handlePassportLookup(e: FormEvent) {
    e.preventDefault();
    if (passportQuery.trim()) {
      setPassportModalOpen(false);
      router.push(`/passport/${encodeURIComponent(passportQuery.trim())}`);
    }
  }

  async function handleSignOut() {
    if (supabase) {
      await supabase.auth.signOut();
      setUserEmail(null);
      setUserRoles([]);
      router.push("/");
      router.refresh();
    }
  }


  return (
    <header className="buyer-header">
      {/* 1. TOP UTILITY BAR (Shopee-Style Topbar) */}
      <div className="buyer-topbar">
        <div className="buyer-topbar-container">
          <div className="buyer-topbar-left">
            <button
              type="button"
              className="buyer-topbar-link button-link"
              onClick={() => setPassportModalOpen(true)}
            >
              <QrCode size={14} />
              <span>{locale === "vi" ? "Tra cứu Hộ chiếu số" : "Digital Passport"}</span>
            </button>
            <span className="buyer-topbar-sep">|</span>
            <Link href="/assistant" className="buyer-topbar-link">
              <Sparkles size={14} />
              <span>{locale === "vi" ? "Trợ lý AI di sản" : "Heritage AI"}</span>
            </Link>
          </div>

          <div className="buyer-topbar-right">
            <Link href="/docs" className="buyer-topbar-link">
              <HelpCircle size={14} />
              <span>{locale === "vi" ? "Hỗ trợ & Chính sách" : "Help"}</span>
            </Link>
            <span className="buyer-topbar-sep">|</span>
            <div className="buyer-topbar-lang">
              <LanguageSwitcher />
            </div>
            <span className="buyer-topbar-sep">|</span>

            {userEmail ? (
              <div className="buyer-user-dropdown-wrapper">
                <button
                  type="button"
                  className="buyer-user-btn"
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  aria-expanded={userMenuOpen}
                >
                  <div className="buyer-avatar">
                    <UserRound size={14} />
                  </div>
                  <span className="buyer-user-name" title={userEmail}>
                    {userEmail.split("@")[0]}
                  </span>
                  <ChevronDown size={14} />
                </button>

                {userMenuOpen && (
                  <div
                    className="buyer-user-menu"
                    onMouseLeave={() => setUserMenuOpen(false)}
                  >
                    <div className="buyer-user-menu-header">
                      <strong>{userEmail}</strong>
                      <span className="buyer-role-badge">
                        {isAdmin ? "Admin · Verifier" : isSeller ? "Nghệ nhân · Seller" : "Khách hàng"}
                      </span>
                    </div>
                    <Link
                      href="/orders"
                      className="buyer-menu-item"
                      onClick={() => setUserMenuOpen(false)}
                    >
                      {locale === "vi" ? "Đơn mua của tôi" : "My Orders"}
                    </Link>
                    <Link
                      href="/rewards"
                      className="buyer-menu-item"
                      onClick={() => setUserMenuOpen(false)}
                    >
                      {locale === "vi" ? "Kho Voucher & Điểm thưởng" : "Rewards & Vouchers"}
                    </Link>
                    {isAdmin && (
                      <Link
                        href="/admin"
                        className="buyer-menu-item highlight-admin"
                        onClick={() => setUserMenuOpen(false)}
                      >
                        {locale === "vi" ? "⚙️ Cổng Quản Trị Hệ Thống" : "⚙️ Admin Portal"}
                      </Link>
                    )}
                    {isSeller && (
                      <Link
                        href="/seller"
                        className="buyer-menu-item highlight-seller"
                        onClick={() => setUserMenuOpen(false)}
                      >
                        {locale === "vi" ? "🏺 Kênh Người Bán & Nghệ Nhân" : "🏺 Seller Portal"}
                      </Link>
                    )}
                    <button
                      type="button"
                      className="buyer-menu-item signout-btn"
                      onClick={() => {
                        setUserMenuOpen(false);
                        void handleSignOut();
                      }}
                    >
                      {locale === "vi" ? "Đăng xuất" : "Sign out"}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="buyer-auth-links">
                <Link href="/auth" className="buyer-topbar-link">
                  {locale === "vi" ? "Đăng nhập" : "Sign in"}
                </Link>
                <span className="buyer-topbar-sep">/</span>
                <Link href="/auth" className="buyer-topbar-link bold">
                  {locale === "vi" ? "Đăng ký" : "Register"}
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 2. MAIN HEADER (Search, Logo, Cart) */}
      <div className="buyer-main-bar">
        <div className="buyer-main-container">
          {/* Brand Logo */}
          <Link href="/" className="buyer-brand" aria-label="Hanoi Craft-Trust">
            <BrandLogo />
          </Link>

          {/* Prominent Shopee-Style Search Bar */}
          <div className="buyer-search-wrapper">
            <form className="buyer-search-form" onSubmit={handleSearchSubmit}>
              <div className="buyer-search-select-box">
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  aria-label="Chọn danh mục tìm kiếm"
                >
                  <option value="all">{locale === "vi" ? "Tất cả ngành" : "All Categories"}</option>
                  <option value="tea">{locale === "vi" ? "Ấm chén trà" : "Tea Ware"}</option>
                  <option value="vase">{locale === "vi" ? "Bình & Đồ trưng bày" : "Vases & Decor"}</option>
                  <option value="cobalt">{locale === "vi" ? "Men lam Bát Tràng" : "Cobalt Glaze"}</option>
                  <option value="gold">{locale === "vi" ? "Hộ chiếu Vàng" : "Gold Passport"}</option>
                </select>
              </div>

              <div className="buyer-search-input-box">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder={
                    locale === "vi"
                      ? "Tìm ấm chén men tro, bình hút lộc Bát Tràng, gốm nghệ nhân..."
                      : "Search handcrafted ceramics, ash glaze teapots, vases..."
                  }
                  aria-label="Tìm kiếm sản phẩm"
                />
              </div>

              <button type="submit" className="buyer-search-submit-btn" aria-label="Tìm kiếm">
                <Search size={18} />
                <span className="btn-text">{locale === "vi" ? "Tìm kiếm" : "Search"}</span>
              </button>
            </form>


          </div>

          {/* Right Header Actions */}
          <div className="buyer-header-actions">
            {/* Quick Passport button */}
            <button
              type="button"
              className="buyer-action-icon-btn"
              onClick={() => setPassportModalOpen(true)}
              title={locale === "vi" ? "Tra cứu Hộ chiếu số tác phẩm" : "Passport verification"}
            >
              <QrCode size={22} />
              <span className="icon-label">{locale === "vi" ? "Hộ chiếu" : "Passport"}</span>
            </button>

            {/* Shopping Cart with Hover Popover */}
            <div
              className="buyer-cart-wrapper"
              onMouseEnter={() => setCartOpen(true)}
              onMouseLeave={() => setCartOpen(false)}
            >
              <Link href="/cart" className="buyer-cart-btn" aria-label="Giỏ hàng">
                <div className="buyer-cart-icon-wrap">
                  <ShoppingBag size={24} />
                  {totalCartCount > 0 && (
                    <span className="buyer-cart-badge">{totalCartCount}</span>
                  )}
                </div>
                <span className="buyer-cart-label">{locale === "vi" ? "Giỏ hàng" : "Cart"}</span>
              </Link>

              {cartOpen && (
                <div className="buyer-cart-popover">
                  <div className="buyer-cart-popover-header">
                    <strong>{locale === "vi" ? "Sản phẩm mới thêm" : "Recently Added"}</strong>
                    <span className="badge terracotta">{totalCartCount}</span>
                  </div>

                  {cartItems.length > 0 ? (
                    <>
                      <div className="buyer-cart-popover-list">
                        {cartItems.slice(0, 4).map((item) => (
                          <div key={item.id} className="buyer-cart-popover-item">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={item.image} alt={item.name} />
                            <div className="item-info">
                              <span className="item-name">{locale === "en" && item.nameEn ? item.nameEn : item.name}</span>
                              <span className="item-meta">
                                {item.quantity} × {formatVnd(item.priceVnd)}
                              </span>
                            </div>
                            <strong className="item-total">
                              {formatVnd(item.quantity * item.priceVnd)}
                            </strong>
                          </div>
                        ))}
                      </div>
                      <div className="buyer-cart-popover-footer">
                        <div className="popover-subtotal">
                          <span>{locale === "vi" ? "Tạm tính:" : "Subtotal:"}</span>
                          <strong>{formatVnd(cartSubtotal)}</strong>
                        </div>
                        <Link
                          href="/cart"
                          className="button terracotta full small"
                          onClick={() => setCartOpen(false)}
                        >
                          {locale === "vi" ? "Xem Giỏ Hàng & Thanh Toán" : "View Cart & Checkout"}
                        </Link>
                      </div>
                    </>
                  ) : (
                    <div className="buyer-cart-popover-empty">
                      <ShoppingBag size={32} />
                      <p>{locale === "vi" ? "Chưa có sản phẩm trong giỏ" : "Your cart is empty"}</p>
                      <Link
                        href="/marketplace"
                        className="button secondary small"
                        onClick={() => setCartOpen(false)}
                      >
                        {locale === "vi" ? "Khám phá ngay" : "Shop now"}
                      </Link>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Mobile Nav Toggle */}
            <button
              type="button"
              className="buyer-mobile-toggle"
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label="Toggle navigation"
              aria-expanded={mobileOpen}
              aria-controls="buyer-mobile-navigation"
            >
              {mobileOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </div>

      {/* 3. CATEGORIES NAVIGATION SUB-BAR */}
      <nav className="buyer-subnav" aria-label="Danh mục ngành hàng thủ công">
        <div className="buyer-subnav-container">
          <Link
            href="/marketplace"
            className={`buyer-subnav-item ${isAllProductsActive ? "active-indicator" : ""}`}
          >
            <Layers size={16} />
            <span>{locale === "vi" ? "Tất cả sản phẩm" : "All Products"}</span>
          </Link>
          <Link
            href="/marketplace?tier=gold"
            className={`buyer-subnav-item highlight-tier ${isGoldActive ? "active-indicator" : ""}`}
          >
            <span>✨ {locale === "vi" ? "Hộ Chiếu Vàng (Gold)" : "Gold Passport"}</span>
          </Link>
          <Link
            href="/experiences"
            className={`buyer-subnav-item ${isExperiencesActive ? "active-indicator" : ""}`}
          >
            <Glasses size={16} />
            <span>{locale === "vi" ? "Trải nghiệm 3D/VR" : "3D/VR Experiences"}</span>
          </Link>
          <Link
            href="/map"
            className={`buyer-subnav-item ${isMapActive ? "active-indicator" : ""}`}
          >
            <MapPin size={16} />
            <span>{locale === "vi" ? "Bản đồ làng nghề" : "Craft Map"}</span>
          </Link>
          <Link
            href="/rewards"
            className={`buyer-subnav-item ${isRewardsActive ? "active-indicator" : ""}`}
          >
            <Gift size={16} />
            <span>{locale === "vi" ? "Tích điểm đổi quà" : "Rewards"}</span>
          </Link>
        </div>
      </nav>

      {/* MOBILE DRAWER */}
      {mobileOpen && (
        <div className="buyer-mobile-drawer" id="buyer-mobile-navigation">
          <div className="buyer-mobile-drawer-head">
            <strong>CraftTrust</strong>
            <button type="button" aria-label="Đóng menu" onClick={() => setMobileOpen(false)}>
              <X size={20} />
            </button>
          </div>
          <div className="buyer-mobile-drawer-body">
            <LanguageSwitcher />
            <Link href="/auth" onClick={() => setMobileOpen(false)}>{locale === "vi" ? "Tài khoản / Đăng nhập" : "Account / Sign in"}</Link>
            <Link href="/experiences" onClick={() => setMobileOpen(false)}>{locale === "vi" ? "Trải nghiệm 3D/VR" : "3D/VR experiences"}</Link>
            <Link href="/marketplace" onClick={() => setMobileOpen(false)}>
              {locale === "vi" ? "Chợ thủ công" : "Marketplace"}
            </Link>
            <Link href="/villages" onClick={() => setMobileOpen(false)}>
              {locale === "vi" ? "Làng nghề di sản" : "Craft Villages"}
            </Link>
            <Link href="/map" onClick={() => setMobileOpen(false)}>
              {locale === "vi" ? "Bản đồ tương tác" : "Heritage Map"}
            </Link>
            <Link href="/rewards" onClick={() => setMobileOpen(false)}>
              {locale === "vi" ? "Ưu đãi & Tích điểm" : "Rewards & Points"}
            </Link>
            <Link href="/orders" onClick={() => setMobileOpen(false)}>
              {locale === "vi" ? "Đơn mua của tôi" : "My Orders"}
            </Link>
            <Link href="/trace/CT-BTG-NVA-2026-0085" onClick={() => setMobileOpen(false)}>
              {locale === "vi" ? "Hộ chiếu số di sản" : "Digital Passport"}
            </Link>
            <Link href="/assistant" onClick={() => setMobileOpen(false)}>
              {locale === "vi" ? "Trợ lý nghệ nhân AI" : "Heritage AI Guide"}
            </Link>
          </div>
        </div>
      )}

      {/* QUICK PASSPORT MODAL */}
      {passportModalOpen && (
        <div className="modal-backdrop" onClick={() => setPassportModalOpen(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 460 }}>
            <div className="modal-header">
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <QrCode size={22} style={{ color: "var(--terracotta)" }} />
                <h3>{locale === "vi" ? "Tra cứu Hộ chiếu di sản số" : "Digital Passport Lookup"}</h3>
              </div>
              <button
                type="button"
                className="modal-close"
                onClick={() => setPassportModalOpen(false)}
              >
                <X size={18} />
              </button>
            </div>
            <p style={{ fontSize: "0.9rem", color: "var(--muted)", margin: "8px 0 16px" }}>
              {locale === "vi"
                ? "Nhập mã định danh hộ chiếu hoặc quét mã QR/NFC được gắn trên tác phẩm gốm sứ để kiểm tra minh chứng xuất xứ."
                : "Enter passport public ID or scan NFC chip attached to the ceramic artwork to verify origin evidence."}
            </p>
            <form onSubmit={handlePassportLookup} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <input
                type="text"
                value={passportQuery}
                onChange={(e) => setPassportQuery(e.target.value)}
                placeholder="VD: CT-BTG-NVA-2026-0085"
                required
                style={{
                  padding: "12px 14px",
                  borderRadius: 8,
                  border: "1px solid var(--line)",
                  fontSize: "1rem",
                  fontFamily: "monospace",
                }}
              />
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                <button
                  type="button"
                  className="button secondary small"
                  onClick={() => {
                    setPassportQuery("CT-BTG-NVA-2026-0085");
                  }}
                >
                  {locale === "vi" ? "Mã gợi ý" : "Suggested ID"}
                </button>
                <button type="submit" className="button terracotta small">
                  {locale === "vi" ? "Tra cứu ngay" : "Lookup"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </header>
  );
}
