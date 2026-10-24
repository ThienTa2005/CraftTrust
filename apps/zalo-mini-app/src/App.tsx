import type { Session } from "@supabase/supabase-js";
import { useCallback, useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { createBundle, identifier, money, number, readConfig, record, rows, text, type Bundle } from "./lib";

type Tab = "discover" | "passport" | "cart" | "orders" | "account";
type Locale = "vi" | "en";

const tDict = {
  vi: {
    heroTag: "HANOI CRAFT-TRUST",
    tabs: { discover: "Khám phá", passport: "Hộ chiếu", cart: "Giỏ hàng", orders: "Đơn hàng", account: "Tài khoản" },
    retry: "Thử lại",
    loading: "Đang tải",
    loadingVillages: "Đang tải làng nghề đã công bố…",
    couldNotLoadVillages: "Không tải được làng nghề",
    requestFailed: "Yêu cầu thất bại.",
    loginRequiredCart: "Đăng nhập trong mục Tài khoản trước khi thêm vào giỏ.",
    addedToCart: "Đã lưu sản phẩm vào giỏ hàng.",
    updateCartFailed: "Không cập nhật được giỏ hàng.",
    discoverTitle: "Tinh hoa làng nghề Hà Nội",
    discoverCopy: "Nội dung di sản và sản phẩm đã công bố từ hệ thống Craft-Trust.",
    defaultDistrict: "Hà Nội",
    defaultVillage: "Làng nghề",
    noVillageSummary: "Chưa có mô tả được công bố.",
    noVillages: "Chưa có làng nghề",
    noVillagesMsg: "Backend chưa trả về bản ghi làng nghề đã công bố.",
    craftSection: "Sản phẩm thủ công",
    artisanRegistered: "Nghệ nhân đã đăng ký",
    defaultProduct: "Sản phẩm",
    outOfStock: "Hết hàng",
    addToCart: "Thêm vào giỏ",
    noProducts: "Chưa có sản phẩm",
    noProductsMsg: "Backend chưa trả về sản phẩm đang hoạt động.",
    cartNotice: "Giỏ hàng",
    passportTitle: "Hộ chiếu số",
    passportCopy: "Tra cứu trạng thái hiện tại từ sổ đăng ký; ứng dụng không tự xác nhận tính chính hãng.",
    passportInputLabel: "Mã hộ chiếu hoặc URL QR",
    passportPlaceholder: "VD: CT-PASSPORT-…",
    lookup: "Tra cứu",
    lookingUp: "Đang tra cứu…",
    invalidPassport: "Nhập mã hộ chiếu hoặc URL QR.",
    lookupFailed: "Không tra cứu được hộ chiếu.",
    notFoundTitle: "Không tìm thấy kết quả",
    registryStatus: "TRẠNG THÁI SỔ ĐĂNG KÝ · ",
    unknownStatus: "không rõ",
    unknownProduct: "Sản phẩm chưa xác định",
    unknownArtisan: "Nghệ nhân chưa xác định",
    passportDisclaimer: "Kết quả này chỉ phản ánh bằng chứng đã được phê duyệt trong hệ thống.",
    cartTitle: "Giỏ hàng",
    cartCopy: "Dữ liệu được lưu trong dự án Supabase đã cấu hình.",
    loginRequiredTitle: "Cần đăng nhập",
    cartLoginMsg: "Giỏ hàng được bảo vệ bằng phân quyền RLS. Đăng nhập trong mục Tài khoản.",
    loadingCart: "Đang tải giỏ hàng của bạn…",
    couldNotLoadCart: "Không tải được giỏ hàng",
    qty: "Số lượng",
    total: "Tổng",
    testCheckoutNoticeTitle: "Thanh toán thử chưa có trong Zalo shell",
    testCheckoutNoticeMsg: "Hoàn tất test checkout trên website hoặc ứng dụng di động. Không có thanh toán thật nào được suy đoán hay xử lý tại đây.",
    emptyCartTitle: "Giỏ hàng trống",
    emptyCartMsg: "Thêm sản phẩm từ mục Khám phá.",
    refresh: "Làm mới",
    ordersTitle: "Trạng thái đơn hàng",
    ordersCopy: "Trạng thái hiển thị nguyên trạng từ backend Craft-Trust.",
    ordersLoginMsg: "Đơn hàng là dữ liệu riêng tư và chỉ hiển thị cho chủ sở hữu.",
    loadingOrders: "Đang tải trạng thái đơn hàng…",
    couldNotLoadOrders: "Không tải được đơn hàng",
    noOrdersTitle: "Chưa có đơn hàng",
    noOrdersMsg: "Các đơn test checkout của tài khoản này sẽ xuất hiện tại đây.",
    accountTitle: "Tài khoản",
    accountCopy: "Phiên Supabase này bảo vệ giỏ hàng và đơn hàng.",
    signOut: "Đăng xuất",
    zaloNotLinkedTitle: "Liên kết Zalo chưa khả dụng",
    zaloNotLinkedMsg: "Cần Zalo App ID đã duyệt và một backend exchange token an toàn trước khi bật đăng nhập Zalo.",
    previewTitle: "Chế độ xem trước trình duyệt",
    previewMsg: "Mở bằng Zalo Mini App sau khi có App ID và gói phát hành được duyệt.",
    email: "Email",
    password: "Mật khẩu",
    signIn: "Đăng nhập",
    signingIn: "Đang đăng nhập…",
    signedIn: "Đã đăng nhập vào Supabase.",
    missingConfigTitle: "Cần cấu hình kết nối",
    missingConfigCopy: "Không hiển thị dữ liệu mẫu thay cho backend thật.",
    missingEnvTitle: "Thiếu biến môi trường",
    restoringSession: "Đang khôi phục phiên",
    pleaseWait: "Vui lòng chờ…"
  },
  en: {
    heroTag: "HANOI CRAFT-TRUST",
    tabs: { discover: "Discover", passport: "Passport", cart: "Cart", orders: "Orders", account: "Account" },
    retry: "Try again",
    loading: "Loading",
    loadingVillages: "Loading published craft villages…",
    couldNotLoadVillages: "Could not load villages",
    requestFailed: "Request failed.",
    loginRequiredCart: "Sign in under Account before adding to cart.",
    addedToCart: "Added product to cart.",
    updateCartFailed: "Could not update cart.",
    discoverTitle: "Hanoi Craft Villages",
    discoverCopy: "Heritage records and published craft products from Craft-Trust.",
    defaultDistrict: "Hanoi",
    defaultVillage: "Craft village",
    noVillageSummary: "No published summary available.",
    noVillages: "No published villages",
    noVillagesMsg: "The backend returned no published village records.",
    craftSection: "Craft products",
    artisanRegistered: "Registered artisan",
    defaultProduct: "Craft product",
    outOfStock: "Out of stock",
    addToCart: "Add to cart",
    noProducts: "No products",
    noProductsMsg: "The backend returned no active craft products.",
    cartNotice: "Cart",
    passportTitle: "Digital passport",
    passportCopy: "Inspect current registry status; the client does not independently certify authenticity.",
    passportInputLabel: "Passport code or QR URL",
    passportPlaceholder: "e.g. CT-PASSPORT-…",
    lookup: "Look up",
    lookingUp: "Looking up…",
    invalidPassport: "Enter a valid passport code or QR URL.",
    lookupFailed: "Passport lookup failed.",
    notFoundTitle: "Not found",
    registryStatus: "REGISTRY STATUS · ",
    unknownStatus: "unknown",
    unknownProduct: "Unidentified product",
    unknownArtisan: "Unidentified artisan",
    passportDisclaimer: "This result only reflects evidence reviewed and approved in the system.",
    cartTitle: "Your cart",
    cartCopy: "Persisted in the configured Supabase project.",
    loginRequiredTitle: "Sign in required",
    cartLoginMsg: "Cart data is protected by RLS. Sign in under Account tab.",
    loadingCart: "Loading your cart…",
    couldNotLoadCart: "Could not load cart",
    qty: "Qty",
    total: "Total",
    testCheckoutNoticeTitle: "Test checkout unavailable in Zalo shell",
    testCheckoutNoticeMsg: "Complete test checkout on website or mobile app. No real payment is processed here.",
    emptyCartTitle: "Cart is empty",
    emptyCartMsg: "Add products from the Discover tab.",
    refresh: "Refresh",
    ordersTitle: "Order status",
    ordersCopy: "Displayed as returned by the Craft-Trust backend.",
    ordersLoginMsg: "Orders are private and only visible to the owner.",
    loadingOrders: "Loading orders…",
    couldNotLoadOrders: "Could not load orders",
    noOrdersTitle: "No orders yet",
    noOrdersMsg: "Test checkout orders for this account will appear here.",
    accountTitle: "Account",
    accountCopy: "This Supabase session protects private carts and orders.",
    signOut: "Sign out",
    zaloNotLinkedTitle: "Zalo bridge not available",
    zaloNotLinkedMsg: "Requires approved Zalo App ID and secure token exchange backend.",
    previewTitle: "Browser preview mode",
    previewMsg: "Open in Zalo Mini App after obtaining an approved App ID.",
    email: "Email",
    password: "Password",
    signIn: "Sign in",
    signingIn: "Signing in…",
    signedIn: "Signed in to Supabase.",
    missingConfigTitle: "Connection setup required",
    missingConfigCopy: "Illustrative demo data is not displayed in place of live backend.",
    missingEnvTitle: "Missing environment variables",
    restoringSession: "Restoring session",
    pleaseWait: "Please wait…"
  }
};

function State({ title, children, retry, retryLabel = "Thử lại" }: { title: string; children: ReactNode; retry?: () => void; retryLabel?: string }) {
  return (
    <section className="state">
      <h2>{title}</h2>
      <div>{children}</div>
      {retry ? <button onClick={retry}>{retryLabel}</button> : null}
    </section>
  );
}

function useLoad(loader: (() => Promise<unknown>) | null) {
  const [data, setData] = useState<unknown>(null);
  const [loading, setLoading] = useState(Boolean(loader));
  const [error, setError] = useState("");
  const refresh = useCallback(async () => {
    if (!loader) return;
    setLoading(true);
    setError("");
    try {
      setData(await loader());
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Yêu cầu thất bại.");
    } finally {
      setLoading(false);
    }
  }, [loader]);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh();
  }, [refresh]);
  return { data, loading, error, refresh };
}

function Discover({ bundle, session, locale }: { bundle: Bundle; session: Session | null; locale: Locale }) {
  const strings = tDict[locale];
  const loader = useCallback(async () => {
    const [villages, artisans, products] = await Promise.all([
      bundle.api.listVillages(),
      bundle.api.listArtisans(),
      bundle.api.listProducts()
    ]);
    return { villages, artisans, products };
  }, [bundle]);
  const resource = useLoad(loader);
  const [notice, setNotice] = useState("");

  if (resource.loading) return <State title={strings.loading}>{strings.loadingVillages}</State>;
  if (resource.error) {
    return (
      <State title={strings.couldNotLoadVillages} retry={() => void resource.refresh()} retryLabel={strings.retry}>
        {resource.error}
      </State>
    );
  }

  const payload = record(resource.data);
  const villages = rows(payload.villages);
  const artisans = rows(payload.artisans);
  const products = rows(payload.products);
  const artisanNames = new Map(
    artisans.map((item) => {
      const artisan = record(item);
      return [text(artisan.id), text(artisan.name)] as const;
    })
  );

  const add = async (productId: string) => {
    if (!session) {
      setNotice(strings.loginRequiredCart);
      return;
    }
    setNotice("");
    try {
      await bundle.api.addToCart({ productId, quantity: 1 });
      setNotice(strings.addedToCart);
    } catch (cause) {
      setNotice(cause instanceof Error ? cause.message : strings.updateCartFailed);
    }
  };

  return (
    <main>
      <Hero title={strings.discoverTitle} copy={strings.discoverCopy} />
      {villages.length ? (
        <div className="cards">
          {villages.map((item, index) => {
            const village = record(item);
            return (
              <article className="card" key={text(village.id, String(index))}>
                <span className="kicker">{text(village.district, strings.defaultDistrict)}</span>
                <h2>{text(village.name, strings.defaultVillage)}</h2>
                <p>{text(village.summary, strings.noVillageSummary)}</p>
              </article>
            );
          })}
        </div>
      ) : (
        <State title={strings.noVillages}>{strings.noVillagesMsg}</State>
      )}
      <h2 className="section-title">{strings.craftSection}</h2>
      {products.length ? (
        <div className="cards">
          {products.map((item, index) => {
            const product = record(item);
            const stock = number(product.stockQuantity);
            return (
              <article className="card" key={text(product.id, String(index))}>
                <span className="kicker">{artisanNames.get(text(product.artisanId)) ?? strings.artisanRegistered}</span>
                <h2>{text(product.name, strings.defaultProduct)}</h2>
                <p>{text(product.description)}</p>
                <strong>{money(number(product.priceVnd))}</strong>
                <button disabled={stock < 1} onClick={() => void add(text(product.id))}>
                  {stock < 1 ? strings.outOfStock : strings.addToCart}
                </button>
              </article>
            );
          })}
        </div>
      ) : (
        <State title={strings.noProducts}>{strings.noProductsMsg}</State>
      )}
      {notice ? <State title={strings.cartNotice}>{notice}</State> : null}
    </main>
  );
}

function Passport({ bundle, locale }: { bundle: Bundle; locale: Locale }) {
  const strings = tDict[locale];
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<unknown>(null);
  const [error, setError] = useState("");

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const id = identifier(input);
    if (!id) {
      setError(strings.invalidPassport);
      return;
    }
    setBusy(true);
    setError("");
    setResult(null);
    try {
      const isQrResolver = /\/(q|qr)\//i.test(input);
      setResult(isQrResolver ? await bundle.api.resolveQr(id) : await bundle.api.getPassport(id));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : strings.lookupFailed);
    } finally {
      setBusy(false);
    }
  };

  const envelope = record(result);
  const passport = record(envelope.passport ?? envelope.data ?? result);
  const product = record(envelope.product ?? passport.product ?? passport.products);
  const artisan = record(envelope.artisan ?? product.artisan ?? product.artisans ?? passport.artisan);

  return (
    <main>
      <Hero title={strings.passportTitle} copy={strings.passportCopy} />
      <form className="form card" onSubmit={(event) => void submit(event)}>
        <label htmlFor="passport">{strings.passportInputLabel}</label>
        <input
          id="passport"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder={strings.passportPlaceholder}
        />
        <button disabled={busy}>{busy ? strings.lookingUp : strings.lookup}</button>
      </form>
      {error ? <State title={strings.notFoundTitle}>{error}</State> : null}
      {result ? (
        <article className="passport">
          <span className="kicker">
            {strings.registryStatus}
            {text(passport.status, strings.unknownStatus).toUpperCase()}
          </span>
          <h2>{text(product.name, strings.unknownProduct)}</h2>
          <strong className="tier">{text(passport.tier, "unverified").toUpperCase()}</strong>
          <p>{text(artisan.name, strings.unknownArtisan)}</p>
          <small>{strings.passportDisclaimer}</small>
        </article>
      ) : null}
    </main>
  );
}

function Cart({ bundle, session, locale }: { bundle: Bundle; session: Session | null; locale: Locale }) {
  const strings = tDict[locale];
  const loader = useCallback(() => bundle.api.getCart(), [bundle]);
  const resource = useLoad(session ? loader : null);
  const [notice, setNotice] = useState("");

  if (!session) return <State title={strings.loginRequiredTitle}>{strings.cartLoginMsg}</State>;
  if (resource.loading) return <State title={strings.loading}>{strings.loadingCart}</State>;
  if (resource.error) {
    return (
      <State title={strings.couldNotLoadCart} retry={() => void resource.refresh()} retryLabel={strings.retry}>
        {resource.error}
      </State>
    );
  }

  const cart = record(resource.data);
  const items = rows(cart.items ?? resource.data);
  const total = items.reduce<number>((sum, item) => {
    const line = record(item);
    return sum + number(line.unitPriceVnd ?? line.unit_price_vnd) * number(line.quantity);
  }, 0);

  return (
    <main>
      <Hero title={strings.cartTitle} copy={strings.cartCopy} />
      {items.length ? (
        <>
          {items.map((item, index) => {
            const line = record(item);
            const product = record(line.product ?? line.products);
            const unitPrice = number(line.unitPriceVnd ?? line.unit_price_vnd);
            return (
              <article className="line" key={text(product.id ?? line.productId, String(index))}>
                <div>
                  <strong>{text(product.name, strings.defaultProduct)}</strong>
                  <small>{strings.qty} {number(line.quantity)}</small>
                </div>
                <b>{money(unitPrice * number(line.quantity))}</b>
              </article>
            );
          })}
          <div className="total">{strings.total} {money(total)}</div>
          <State title={strings.testCheckoutNoticeTitle}>{strings.testCheckoutNoticeMsg}</State>
        </>
      ) : (
        <State title={strings.emptyCartTitle}>{strings.emptyCartMsg}</State>
      )}
      {notice ? <State title={strings.cartNotice}>{notice}</State> : null}
      <button className="secondary" onClick={() => { setNotice(""); void resource.refresh(); }}>
        {strings.refresh}
      </button>
    </main>
  );
}

function Orders({ bundle, session, locale }: { bundle: Bundle; session: Session | null; locale: Locale }) {
  const strings = tDict[locale];
  const loader = useCallback(() => bundle.api.listOrders(), [bundle]);
  const resource = useLoad(session ? loader : null);

  if (!session) return <State title={strings.loginRequiredTitle}>{strings.ordersLoginMsg}</State>;
  if (resource.loading) return <State title={strings.loading}>{strings.loadingOrders}</State>;
  if (resource.error) {
    return (
      <State title={strings.couldNotLoadOrders} retry={() => void resource.refresh()} retryLabel={strings.retry}>
        {resource.error}
      </State>
    );
  }

  const orders = rows(resource.data);
  return (
    <main>
      <Hero title={strings.ordersTitle} copy={strings.ordersCopy} />
      {orders.length ? (
        orders.map((item, index) => {
          const order = record(item);
          return (
            <article className="line" key={text(order.id, String(index))}>
              <div>
                <strong>#{text(order.id).slice(0, 8)}</strong>
                <small>{text(order.status, "unknown")}</small>
              </div>
              <b>{money(number(order.subtotal_vnd ?? order.subtotalVnd))}</b>
            </article>
          );
        })
      ) : (
        <State title={strings.noOrdersTitle}>{strings.noOrdersMsg}</State>
      )}
    </main>
  );
}

function Account({
  bundle,
  session,
  inZalo,
  locale,
  onToggleLocale
}: {
  bundle: Bundle;
  session: Session | null;
  inZalo: boolean;
  locale: Locale;
  onToggleLocale: () => void;
}) {
  const strings = tDict[locale];
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");

  const signIn = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    const { error } = await bundle.supabase.auth.signInWithPassword({ email: email.trim(), password });
    setNotice(error?.message ?? strings.signedIn);
    setBusy(false);
  };

  return (
    <main>
      <Hero title={strings.accountTitle} copy={session ? (session.user.email ?? session.user.id) : strings.accountCopy} />
      <div className="card" style={{ marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span>Ngôn ngữ / Language:</span>
        <button type="button" onClick={onToggleLocale} style={{ padding: "6px 12px", borderRadius: 8 }}>
          {locale === "vi" ? "🇻🇳 Tiếng Việt (chuyển EN)" : "🇬🇧 English (switch VI)"}
        </button>
      </div>

      {session ? (
        <button onClick={() => void bundle.supabase.auth.signOut()}>{strings.signOut}</button>
      ) : (
        <>
          {inZalo ? (
            <State title={strings.zaloNotLinkedTitle}>{strings.zaloNotLinkedMsg}</State>
          ) : (
            <State title={strings.previewTitle}>{strings.previewMsg}</State>
          )}
          <form className="form card" onSubmit={(event) => void signIn(event)}>
            <label htmlFor="email">{strings.email}</label>
            <input id="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
            <label htmlFor="password">{strings.password}</label>
            <input id="password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} required />
            <button disabled={busy}>{busy ? strings.signingIn : strings.signIn}</button>
          </form>
        </>
      )}
      {notice ? <State title={locale === "vi" ? "Xác thực" : "Auth"}>{notice}</State> : null}
    </main>
  );
}

function Hero({ title, copy }: { title: string; copy: string }) {
  return (
    <header className="hero">
      <span>HANOI CRAFT-TRUST</span>
      <h1>{title}</h1>
      <p>{copy}</p>
    </header>
  );
}

export default function App() {
  const setup = useMemo(() => readConfig(), []);
  const bundle = useMemo(() => (setup.config ? createBundle(setup.config) : null), [setup.config]);
  const [tab, setTab] = useState<Tab>("discover");
  const [locale, setLocale] = useState<Locale>("vi");
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(Boolean(bundle));
  const [inZalo, setInZalo] = useState(false);

  useEffect(() => {
    if (!bundle) return;
    let active = true;
    void bundle.supabase.auth.getSession().then(({ data }) => {
      if (active) {
        setSession(data.session);
        setAuthLoading(false);
      }
    });
    const { data } = bundle.supabase.auth.onAuthStateChange((_event, next) => setSession(next));
    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, [bundle]);

  useEffect(() => {
    void import("zmp-sdk")
      .then((module) => {
        const sdk = record(module.default ?? module);
        const getSystemInfo = sdk.getSystemInfo;
        if (typeof getSystemInfo === "function") {
          try {
            const info = getSystemInfo();
            setInZalo(Boolean(info));
          } catch {
            setInZalo(false);
          }
        }
      })
      .catch(() => setInZalo(false));
  }, []);

  const strings = tDict[locale];

  if (!bundle) {
    return (
      <div className="shell">
        <Hero title={strings.missingConfigTitle} copy={strings.missingConfigCopy} />
        <State title={strings.missingEnvTitle}>
          Thêm {setup.missing.join(", ")} vào apps/zalo-mini-app/.env.
        </State>
      </div>
    );
  }

  if (authLoading) {
    return (
      <div className="shell">
        <State title={strings.restoringSession}>{strings.pleaseWait}</State>
      </div>
    );
  }

  return (
    <div className="shell">
      <div style={{ display: "flex", justifyContent: "flex-end", padding: "8px 0" }}>
        <button
          type="button"
          onClick={() => setLocale(locale === "vi" ? "en" : "vi")}
          style={{ background: "#fff", border: "1px solid #d8cdc4", borderRadius: 999, padding: "4px 10px", fontSize: "0.8rem", cursor: "pointer" }}
        >
          {locale === "vi" ? "🇻🇳 Tiếng Việt" : "🇬🇧 English"}
        </button>
      </div>

      {tab === "discover" ? (
        <Discover bundle={bundle} session={session} locale={locale} />
      ) : tab === "passport" ? (
        <Passport bundle={bundle} locale={locale} />
      ) : tab === "cart" ? (
        <Cart bundle={bundle} session={session} locale={locale} />
      ) : tab === "orders" ? (
        <Orders bundle={bundle} session={session} locale={locale} />
      ) : (
        <Account
          bundle={bundle}
          session={session}
          inZalo={inZalo}
          locale={locale}
          onToggleLocale={() => setLocale(locale === "vi" ? "en" : "vi")}
        />
      )}

      <nav aria-label="Điều hướng chính">
        {(["discover", "passport", "cart", "orders", "account"] as const).map((item) => (
          <button key={item} className={tab === item ? "active" : ""} onClick={() => setTab(item)}>
            {strings.tabs[item]}
          </button>
        ))}
      </nav>
    </div>
  );
}
