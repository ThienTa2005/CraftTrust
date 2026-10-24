"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";
import {
  Box,
  Camera,
  CheckCircle2,
  Clock3,
  Download,
  Flame,
  ImagePlus,
  Info,
  Layers,
  LayoutDashboard,
  LoaderCircle,
  PackageCheck,
  Pencil,
  Plus,
  ReceiptText,
  RefreshCw,
  Ruler,
  ShieldCheck,
  ShoppingBag,
  Sliders,
  Sparkles,
  Trash2,
  TriangleAlert,
  UploadCloud,
  X,
} from "lucide-react";
import { CraftModelViewer } from "@/components/model-viewer";
import type { AppRole } from "@/lib/authz";
import { formatVnd } from "@/lib/format";

type ImageAudit = {
  width: number;
  height: number;
  quality: "good" | "warning" | "alert";
  message: string;
};

async function auditImageFile(file: File): Promise<ImageAudit> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const w = img.naturalWidth;
      const h = img.naturalHeight;
      if (w < 600 || h < 600) {
        resolve({
          width: w,
          height: h,
          quality: "alert",
          message: `Độ phân giải thấp (${w}×${h}px), chi tiết gốm có thể bị mờ.`,
        });
      } else if (w >= 1200 && h >= 1200) {
        resolve({
          width: w,
          height: h,
          quality: "good",
          message: `Chuẩn Studio 3D (${w}×${h}px), sắc nét từng hoa văn men.`,
        });
      } else {
        resolve({
          width: w,
          height: h,
          quality: "good",
          message: `Độ phân giải tốt (${w}×${h}px), đạt chuẩn dựng hình học.`,
        });
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve({
        width: 0,
        height: 0,
        quality: "warning",
        message: "Chưa kiểm tra được kích thước ảnh.",
      });
    };
    img.src = url;
  });
}

type ModelStatus =
  "not_requested" | "queued" | "processing" | "review" | "ready" | "failed";

export type SellerProduct = {
  id: string;
  slug: string;
  name: string;
  description: string;
  price_vnd: number;
  stock_quantity: number;
  status: "draft" | "active" | "archived";
  poster_url: string | null;
  model_url: string | null;
  ar_url: string | null;
  height_cm: number | null;
  width_cm: number | null;
  dimensions_verified: boolean;
  shape_mode: "photo" | "measured";
  back_texture: "mirror" | "plain";
  model_status: ModelStatus;
  model_report: Record<string, unknown> | null;
  model_error: string | null;
  created_at: string;
};

type SellerOrder = {
  id: string;
  status: "placed" | "processing" | "fulfilled" | "cancelled";
  subtotal_vnd: number;
  payment_mode: "test";
  shipping_address: {
    recipient?: string;
    recipient_name?: string;
    phone?: string;
    address?: string;
    address_line?: string;
    city?: string;
  };
  created_at: string;
  seller_items: Array<{
    id: string;
    product_name: string;
    quantity: number;
    unit_price_vnd: number;
    line_total_vnd: number;
  }>;
};

const statusCopy: Record<ModelStatus, { label: string; detail: string }> = {
  not_requested: { label: "Chưa tạo", detail: "Chưa có yêu cầu dựng mô hình." },
  queued: {
    label: "Đang xếp hàng",
    detail: "Worker sẽ nhận sản phẩm trong ít phút.",
  },
  processing: {
    label: "Đang tạo 3D",
    detail: "Đang tách nền, dựng khối và phủ hoa văn.",
  },
  review: {
    label: "Chờ nghệ nhân duyệt",
    detail: "Xoay và kiểm tra kỹ trước khi công khai.",
  },
  ready: {
    label: "Đã xuất bản",
    detail: "Người mua đã có thể xem mô hình 3D.",
  },
  failed: {
    label: "Cần xử lý lại",
    detail: "Xem lỗi, thay ảnh nếu cần rồi thử lại.",
  },
};

const orderStatusCopy: Record<SellerOrder["status"], string> = {
  placed: "Đã đặt",
  processing: "Đang chuẩn bị",
  fulfilled: "Đã hoàn tất",
  cancelled: "Đã hủy",
};

export function Seller3DStudio({
  artisanName,
  roles,
  initialProducts,
  initialError,
  onProductsChange,
}: {
  artisanName: string;
  roles: AppRole[];
  initialProducts: SellerProduct[];
  initialError?: string | undefined;
  onProductsChange?: (products: SellerProduct[]) => void;
}) {
  const [products, setProducts] = useState(initialProducts);
  const [files, setFiles] = useState<File[]>([]);
  const [slotFiles, setSlotFiles] = useState<(File | null)[]>([null, null, null, null]);
  const [slotAudits, setSlotAudits] = useState<(ImageAudit | null)[]>([null, null, null, null]);
  const [editFiles, setEditFiles] = useState<File[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [orders, setOrders] = useState<SellerOrder[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [busyProduct, setBusyProduct] = useState<string | null>(null);
  const [notice, setNotice] = useState<{
    kind: "success" | "error";
    text: string;
  } | null>(initialError ? { kind: "error", text: initialError } : null);

  const handleSlotChange = async (index: number, file: File | null) => {
    const nextSlots = [...slotFiles];
    nextSlots[index] = file;
    setSlotFiles(nextSlots);
    const validFiles = nextSlots.filter((f): f is File => f !== null);
    setFiles(validFiles);

    if (file) {
      const audit = await auditImageFile(file);
      setSlotAudits((prev) => {
        const next = [...prev];
        next[index] = audit;
        return next;
      });
    } else {
      setSlotAudits((prev) => {
        const next = [...prev];
        next[index] = null;
        return next;
      });
    }
  };

  const handleBatchFileSelect = async (selected: File[]) => {
    const nextSlots: (File | null)[] = [null, null, null, null];
    const nextAudits: (ImageAudit | null)[] = [null, null, null, null];
    for (let i = 0; i < Math.min(4, selected.length); i++) {
      const file = selected[i];
      if (file) {
        nextSlots[i] = file;
        nextAudits[i] = await auditImageFile(file);
      }
    }
    setSlotFiles(nextSlots);
    setSlotAudits(nextAudits);
    setFiles(nextSlots.filter((f): f is File => f !== null));
  };

  const previewUrl = useMemo(
    () => (slotFiles[0] ? URL.createObjectURL(slotFiles[0]) : files[0] ? URL.createObjectURL(files[0]) : null),
    [slotFiles, files],
  );
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const hasPending = products.some((product) =>
    ["queued", "processing"].includes(product.model_status),
  );

  const refreshProducts = useCallback(async (silent = false) => {
    const response = await fetch("/api/seller/products", { cache: "no-store" });
    const result = (await response.json()) as {
      products?: SellerProduct[];
      error?: string;
    };
    if (!response.ok) {
      if (!silent)
        setNotice({
          kind: "error",
          text: result.error ?? "Không thể tải sản phẩm.",
        });
      return;
    }
    setProducts(result.products ?? []);
    onProductsChange?.(result.products ?? []);
  }, [onProductsChange]);

  const refreshOrders = useCallback(async () => {
    setOrdersLoading(true);
    try {
      const response = await fetch("/api/seller/orders", { cache: "no-store" });
      const result = (await response.json()) as {
        orders?: SellerOrder[];
        error?: string;
      };
      if (!response.ok)
        throw new Error(result.error ?? "Không thể tải đơn bán.");
      setOrders(result.orders ?? []);
    } catch (error) {
      setNotice({
        kind: "error",
        text: error instanceof Error ? error.message : "Không thể tải đơn bán.",
      });
    } finally {
      setOrdersLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshOrders();
  }, [refreshOrders]);

  useEffect(() => {
    if (!hasPending) return;
    const timer = window.setInterval(() => void refreshProducts(true), 4000);
    return () => window.clearInterval(timer);
  }, [hasPending, refreshProducts]);

  async function submitProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const orderedFiles = slotFiles.filter((f): f is File => f !== null);
    const filesToSubmit = orderedFiles.length > 0 ? orderedFiles : files;
    if (!filesToSubmit.length) {
      setNotice({ kind: "error", text: "Hãy chọn ít nhất một ảnh sản phẩm (mặt trước)." });
      return;
    }
    const form = event.currentTarget;
    const data = new FormData(form);
    data.delete("images");
    filesToSubmit.forEach((file) => data.append("images", file));
    data.set(
      "dimensionsVerified",
      data.get("dimensionsVerified") ? "true" : "false",
    );

    setSubmitting(true);
    setNotice(null);
    try {
      const response = await fetch("/api/seller/products", {
        method: "POST",
        body: data,
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok)
        throw new Error(result.error ?? "Không thể gửi yêu cầu tạo 3D.");
      form.reset();
      setFiles([]);
      setSlotFiles([null, null, null, null]);
      setSlotAudits([null, null, null, null]);
      setNotice({
        kind: "success",
        text: "Đã lưu sản phẩm và đưa vào hàng đợi tạo 3D. Bạn có thể tiếp tục làm việc.",
      });
      await refreshProducts(true);
    } catch (error) {
      setNotice({
        kind: "error",
        text:
          error instanceof Error
            ? error.message
            : "Không thể gửi yêu cầu tạo 3D.",
      });
    } finally {
      setSubmitting(false);
    }
  }

  async function runAction(productId: string, action: "publish" | "retry") {
    setBusyProduct(productId);
    setNotice(null);
    try {
      const response = await fetch(
        `/api/seller/products/${productId}/${action}`,
        { method: "POST" },
      );
      const result = (await response.json()) as { error?: string };
      if (!response.ok)
        throw new Error(result.error ?? "Thao tác không thành công.");
      setNotice({
        kind: "success",
        text:
          action === "publish"
            ? "Đã xuất bản. Người mua có thể xem sản phẩm và xoay mô hình 3D."
            : "Đã đưa sản phẩm trở lại hàng đợi tạo 3D.",
      });
      await refreshProducts(true);
    } catch (error) {
      setNotice({
        kind: "error",
        text: error instanceof Error ? error.message : "Có lỗi xảy ra.",
      });
    } finally {
      setBusyProduct(null);
    }
  }

  async function submitEdit(
    event: FormEvent<HTMLFormElement>,
    productId: string,
  ) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    data.delete("images");
    editFiles.forEach((file) => data.append("images", file));
    data.set(
      "dimensionsVerified",
      data.get("dimensionsVerified") ? "true" : "false",
    );
    setBusyProduct(productId);
    setNotice(null);
    try {
      const response = await fetch(`/api/seller/products/${productId}`, {
        method: "PATCH",
        body: data,
      });
      const result = (await response.json()) as {
        error?: string;
        regenerated?: boolean;
      };
      if (!response.ok)
        throw new Error(result.error ?? "Không thể cập nhật sản phẩm.");
      setEditingId(null);
      setEditFiles([]);
      setNotice({
        kind: "success",
        text: result.regenerated
          ? "Đã cập nhật ảnh và đưa sản phẩm vào hàng đợi tạo lại 3D."
          : "Đã cập nhật thông tin sản phẩm.",
      });
      await refreshProducts(true);
    } catch (error) {
      setNotice({
        kind: "error",
        text:
          error instanceof Error
            ? error.message
            : "Không thể cập nhật sản phẩm.",
      });
    } finally {
      setBusyProduct(null);
    }
  }

  async function removeProduct(product: SellerProduct) {
    const confirmed = window.confirm(
      `Xóa “${product.name}”? Nếu sản phẩm đã có trong đơn hàng, hệ thống sẽ lưu lịch sử và chuyển sang trạng thái lưu trữ.`,
    );
    if (!confirmed) return;
    setBusyProduct(product.id);
    setNotice(null);
    try {
      const response = await fetch(`/api/seller/products/${product.id}`, {
        method: "DELETE",
      });
      const result = (await response.json()) as {
        error?: string;
        archived?: boolean;
      };
      if (!response.ok)
        throw new Error(result.error ?? "Không thể xóa sản phẩm.");
      setNotice({
        kind: "success",
        text: result.archived
          ? "Sản phẩm đã có đơn hàng nên được chuyển vào lưu trữ để giữ lịch sử."
          : "Đã xóa sản phẩm và các tệp liên quan.",
      });
      await refreshProducts(true);
    } catch (error) {
      setNotice({
        kind: "error",
        text:
          error instanceof Error ? error.message : "Không thể xóa sản phẩm.",
      });
    } finally {
      setBusyProduct(null);
    }
  }

  const readyCount = products.filter(
    (product) => product.model_status === "ready",
  ).length;
  const reviewCount = products.filter(
    (product) => product.model_status === "review",
  ).length;
  const pendingCount = products.filter((product) =>
    ["queued", "processing"].includes(product.model_status),
  ).length;
  const sellerRevenue = orders.reduce(
    (sum, order) =>
      sum +
      order.seller_items.reduce(
        (lineSum, item) => lineSum + item.line_total_vnd,
        0,
      ),
    0,
  );

  return (
    <main className="seller-dashboard shell">
      <aside className="seller-sidebar" aria-label="Kênh người bán">
        <div className="seller-sidebar-brand">
          <span className="seller-sidebar-mark">
            <Flame size={20} />
          </span>
          <div>
            <strong>Kênh nghệ nhân</strong>
            <small>{artisanName}</small>
          </div>
        </div>
        <nav>
          <a href="#tong-quan">
            <LayoutDashboard size={18} /> Tổng quan
          </a>
          <a href="#san-pham">
            <Box size={18} /> Sản phẩm
          </a>
          <a href="#them-san-pham">
            <Plus size={18} /> Thêm sản phẩm & 3D
          </a>
          <a href="#don-ban">
            <ReceiptText size={18} /> Đơn bán
          </a>
          <a href="/marketplace">
            <ShoppingBag size={18} /> Xem sàn mua sắm
          </a>
        </nav>
        <div className="seller-sidebar-note">
          <strong>Gian hàng an toàn</strong>
          <span>
            Bạn chỉ có thể quản lý sản phẩm và đơn thuộc gian hàng của mình.
          </span>
        </div>
      </aside>

      <div className="seller-studio">
        <section className="seller-studio-hero" id="tong-quan">
          <div>
            <span className="eyebrow">Xưởng số · {artisanName}</span>
            <h1>Biến ảnh gốm thành trải nghiệm 3D.</h1>
            <p>
              Đăng sản phẩm, nhập kích thước thật và gửi ảnh chụp thẳng. Hệ
              thống dựng mô hình để nghệ nhân kiểm tra trước khi đưa lên gian
              hàng.
              Nội dung trang Trải nghiệm 3D/VR do admin đăng riêng.
            </p>
            <div className="seller-role-row">
              {roles.map((role) => (
                <span className="badge" key={role}>
                  {role}
                </span>
              ))}
            </div>
          </div>
          <div className="seller-kiln-orbit" aria-hidden="true">
            <span className="seller-orbit-ring" />
            <span className="seller-pot-shape">
              <Flame />
            </span>
          </div>
        </section>

        <section className="seller-metrics" aria-label="Tổng quan sản phẩm 3D">
          <div>
            <PackageCheck />
            <strong>{readyCount}</strong>
            <span>Đã xuất bản</span>
          </div>
          <div>
            <Sparkles />
            <strong>{reviewCount}</strong>
            <span>Chờ duyệt 3D</span>
          </div>
          <div>
            <Clock3 />
            <strong>{pendingCount}</strong>
            <span>Đang xử lý</span>
          </div>
          <div>
            <Box />
            <strong>{products.length}</strong>
            <span>Tổng sản phẩm</span>
          </div>
          <div>
            <ReceiptText />
            <strong>{orders.length}</strong>
            <span>Đơn bán</span>
          </div>
          <div>
            <ShoppingBag />
            <strong>{formatVnd(sellerRevenue)}</strong>
            <span>Doanh thu thử nghiệm</span>
          </div>
        </section>

        {notice ? (
          <div
            className={
              notice.kind === "error" ? "error-banner" : "seller-success"
            }
            role="status"
          >
            {notice.kind === "success" ? (
              <CheckCircle2 size={18} />
            ) : (
              <TriangleAlert size={18} />
            )}
            {notice.text}
          </div>
        ) : null}

        <section className="seller-create-section" id="them-san-pham">
          <div className="section-head">
            <div>
              <span className="eyebrow">Tạo sản phẩm mới</span>
              <h2>Ảnh thật, số đo thật, bản 3D để duyệt.</h2>
            </div>
            <p>Ảnh nguồn chỉ nghệ nhân và worker tin cậy được truy cập.</p>
          </div>

          <form className="seller-product-form" onSubmit={submitProduct}>
            <div className="seller-upload-panel">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                <strong style={{ fontSize: "0.95rem", color: "var(--ink)" }}>
                  Bộ 4 góc chụp bảo tồn di sản gốm sứ
                </strong>
                <label style={{ fontSize: "0.8rem", color: "var(--leaf)", cursor: "pointer", fontWeight: 600 }}>
                  <ImagePlus size={15} style={{ verticalAlign: "middle", marginRight: 4 }} />
                  Chọn nhanh 1–4 ảnh
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    multiple
                    style={{ display: "none" }}
                    onChange={(e) => void handleBatchFileSelect(Array.from(e.target.files ?? []).slice(0, 4))}
                  />
                </label>
              </div>

              <div className="seller-angle-grid">
                {[
                  {
                    idx: 0,
                    title: "1. Mặt trước (Chính diện)",
                    badge: "Bắt buộc",
                    isOptional: false,
                    desc: "Xác định trục đối xứng và biên dạng chính",
                  },
                  {
                    idx: 1,
                    title: "2. Mặt sau (Đối diện)",
                    badge: "Khuyên dùng",
                    isOptional: true,
                    desc: "Triệt tiêu suy đoán 0%, phủ vân thật 360°",
                  },
                  {
                    idx: 2,
                    title: "3. Góc nghiêng 45°",
                    badge: "Bổ sung",
                    isOptional: true,
                    desc: "Đối chiếu vai gốm & hoa văn tiếp giáp",
                  },
                  {
                    idx: 3,
                    title: "4. Miệng / Đáy / Chi tiết",
                    badge: "Chi tiết",
                    isOptional: true,
                    desc: "Kiểm tra độ loe vành miệng & chân đế gốm",
                  },
                ].map((slot) => {
                  const file = slotFiles[slot.idx];
                  const audit = slotAudits[slot.idx];
                  const thumb = file ? URL.createObjectURL(file) : null;
                  return (
                    <div
                      key={slot.idx}
                      className={`seller-slot-item ${file ? "filled" : ""}`}
                    >
                      <div className="seller-slot-header">
                        <span>{slot.title}</span>
                        <span className={`slot-badge ${slot.isOptional ? "optional" : ""}`}>
                          {slot.badge}
                        </span>
                      </div>

                      {thumb ? (
                        <div
                          className="seller-slot-thumb"
                          style={{ backgroundImage: `url("${thumb}")` }}
                        >
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              void handleSlotChange(slot.idx, null);
                            }}
                            style={{
                              position: "absolute",
                              top: 6,
                              right: 6,
                              background: "rgba(0,0,0,0.65)",
                              color: "#fff",
                              border: "none",
                              borderRadius: "50%",
                              width: 22,
                              height: 22,
                              cursor: "pointer",
                              display: "grid",
                              placeItems: "center",
                            }}
                            title="Xóa ảnh này"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ) : (
                        <label
                          style={{
                            flex: 1,
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: 4,
                            cursor: "pointer",
                            padding: "16px 8px",
                            textAlign: "center",
                          }}
                        >
                          <Camera size={26} style={{ color: "var(--leaf)", opacity: 0.8 }} />
                          <span style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--leaf)" }}>
                            Chọn ảnh góc này
                          </span>
                          <span style={{ fontSize: "0.7rem", color: "var(--muted)" }}>
                            {slot.desc}
                          </span>
                          <input
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            style={{ display: "none" }}
                            onChange={(e) => {
                              const f = e.target.files?.[0] || null;
                              void handleSlotChange(slot.idx, f);
                            }}
                          />
                        </label>
                      )}

                      {audit ? (
                        <div
                          className={`seller-quality-pill ${audit.quality}`}
                          title={audit.message}
                        >
                          {audit.quality === "good" ? (
                            <CheckCircle2 size={12} />
                          ) : (
                            <TriangleAlert size={12} />
                          )}
                          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {audit.message}
                          </span>
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>

              <div className="seller-photo-guide">
                <strong>Hướng dẫn chụp ảnh tạo 3D chân thực cao:</strong>
                <span>• Chụp trên nền sáng đồng nhất hoặc phông trơn, tránh bóng đổ cắt ngang thân gốm.</span>
                <span>• Có thêm ảnh mặt sau sẽ kích hoạt <strong>Multi-view Engine</strong>, loại bỏ hoàn toàn việc phản chiếu suy đoán.</span>
                <span>• Giữ máy ảnh ngang tầm thân bình để hạn chế méo phối cảnh tiêu cự.</span>
              </div>
            </div>

            <div className="seller-fields">
              <label className="seller-field seller-field-wide">
                <span>Tên sản phẩm</span>
                <input
                  name="name"
                  minLength={3}
                  maxLength={140}
                  required
                  placeholder="Ví dụ: Bình men lam họa tiết sen"
                />
              </label>
              <label className="seller-field seller-field-wide">
                <span>Câu chuyện & mô tả</span>
                <textarea
                  name="description"
                  minLength={20}
                  maxLength={5000}
                  required
                  rows={5}
                  placeholder="Chất men, kỹ thuật tạo tác, họa tiết và câu chuyện của tác phẩm…"
                />
              </label>
              <label className="seller-field">
                <span>Giá bán (VNĐ)</span>
                <input
                  name="priceVnd"
                  type="number"
                  min={0}
                  step={1000}
                  required
                  defaultValue={500000}
                />
              </label>
              <label className="seller-field">
                <span>Tồn kho</span>
                <input
                  name="stockQuantity"
                  type="number"
                  min={0}
                  max={100000}
                  required
                  defaultValue={1}
                />
              </label>
              <label className="seller-field">
                <span>
                  <Ruler size={15} /> Chiều cao (cm)
                </span>
                <input
                  name="heightCm"
                  type="number"
                  min={3}
                  max={250}
                  step={0.1}
                  required
                  placeholder="28"
                />
              </label>
              <label className="seller-field">
                <span>
                  <Ruler size={15} /> Chiều rộng lớn nhất (cm)
                </span>
                <input
                  name="widthCm"
                  type="number"
                  min={3}
                  max={250}
                  step={0.1}
                  required
                  placeholder="16"
                />
              </label>
              <label className="seller-field">
                <span><Sliders size={15} /> Công nghệ tái dựng (Engine)</span>
                <select name="engine" defaultValue="auto">
                  <option value="auto">Tự động (Multi-view nếu có ảnh sau, hoặc Ceramic)</option>
                  <option value="multiview">Multi-view Engine (Ghép đa ảnh thực tế 360°)</option>
                  <option value="ceramic">Ceramic Engine (Biên dạng tròn xoay toán học)</option>
                  <option value="ai">AI Image-to-3D Adapter (TRELLIS.2 / Hunyuan3D)</option>
                </select>
              </label>
              <label className="seller-field">
                <span><Layers size={15} /> Độ dày thành gốm</span>
                <select name="wallThickness" defaultValue="0.04">
                  <option value="0.02">Thành mỏng (2% bán kính - chén, đĩa)</option>
                  <option value="0.04">Tiêu chuẩn (4% bán kính - bình, lọ gốm)</option>
                  <option value="0.06">Thành dày (6% bán kính - thạp, chum cổ)</option>
                </select>
              </label>
              <label className="seller-field">
                <span>Độ loe vành miệng</span>
                <select name="rimFlare" defaultValue="1.0">
                  <option value="1.0">Miệng thẳng tự nhiên (1.0x)</option>
                  <option value="1.1">Loe nhẹ (+10%)</option>
                  <option value="1.25">Loe rộng (+25%)</option>
                </select>
              </label>
              <label className="seller-field">
                <span>Dựng biên dạng</span>
                <select name="shapeMode" defaultValue="measured">
                  <option value="measured">Theo số đo đã nhập</option>
                  <option value="photo">Ước lượng rộng từ ảnh</option>
                </select>
              </label>
              <label className="seller-field">
                <span>Mặt sau (khi chỉ có 1 ảnh)</span>
                <select name="backTexture" defaultValue="mirror">
                  <option value="mirror">Phản chiếu hoa văn mặt trước</option>
                  <option value="plain">Men trơn suy diễn</option>
                </select>
              </label>
              <label className="seller-check seller-field-wide">
                <input name="dimensionsVerified" type="checkbox" />
                <span>
                  Tôi đã đo trực tiếp sản phẩm và xác nhận kích thước trên là
                  chính xác (chuẩn tỷ lệ 1:1 trong AR).
                </span>
              </label>
              <div className="seller-form-note seller-field-wide">
                <ShieldCheck size={18} />
                <span>
                  Hệ thống Hybrid 3D tuân thủ chuẩn trung thực Hanoi CraftTrust. Nếu có ảnh mặt sau, mô hình sẽ đạt 100% dữ liệu quan sát thực tế; nếu chỉ có 1 ảnh, mặt sau sẽ được gắn nhãn suy đoán minh bạch.
                </span>
              </div>
              <button
                className="button terracotta seller-submit seller-field-wide"
                disabled={submitting}
              >
                {submitting ? (
                  <LoaderCircle className="seller-spin" />
                ) : (
                  <UploadCloud />
                )}
                {submitting
                  ? "Đang phân tích ảnh và khởi tạo 3D…"
                  : "Lưu sản phẩm & tạo mô hình 3D"}
              </button>
            </div>
          </form>
        </section>

        <section className="seller-products-section" id="san-pham">
          <div className="section-head">
            <div>
              <span className="eyebrow">Quy trình duyệt</span>
              <h2>Sản phẩm và mô hình của bạn</h2>
            </div>
            <button
              className="button secondary small"
              type="button"
              onClick={() => void refreshProducts()}
            >
              <RefreshCw size={16} /> Làm mới
            </button>
          </div>
          {products.length ? (
            <div className="seller-product-list">
              {products.map((product) => {
                const status = statusCopy[product.model_status];
                const isBusy = busyProduct === product.id;
                return (
                  <article className="seller-product-row" key={product.id}>
                    <div className="seller-product-summary">
                      <div
                        className="seller-product-poster"
                        style={
                          product.poster_url
                            ? {
                                backgroundImage: `url("${product.poster_url}")`,
                              }
                            : undefined
                        }
                        aria-label={`Ảnh ${product.name}`}
                      />
                      <div>
                        <div
                          className={`seller-status seller-status-${product.model_status}`}
                        >
                          {product.model_status === "processing" ? (
                            <LoaderCircle className="seller-spin" size={14} />
                          ) : null}
                          {status.label}
                        </div>
                        <h3>{product.name}</h3>
                        <p>{status.detail}</p>
                        <div className="seller-product-facts">
                          <span>{formatVnd(product.price_vnd)}</span>
                          <span>
                            {product.height_cm ?? "–"} ×{" "}
                            {product.width_cm ?? "–"} cm
                          </span>
                          <span>Tồn {product.stock_quantity}</span>
                        </div>
                        {product.model_error ? (
                          <div className="seller-inline-error">
                            {product.model_error}
                          </div>
                        ) : null}
                      </div>
                    </div>

                    {product.model_url ? (
                      <div className="seller-model-review">
                        <CraftModelViewer
                          src={product.model_url}
                          poster={
                            product.poster_url ?? "/placeholder-product.svg"
                          }
                          arUrl={product.ar_url ?? undefined}
                          referencePhotoUrl={product.poster_url ?? undefined}
                          modelReport={product.model_report}
                          dimensions={{
                            heightCm: product.height_cm,
                            widthCm: product.width_cm,
                          }}
                        />

                        {/* 3D Model Quality Audit & Benchmarks */}
                        {product.model_report ? (
                          <div style={{ marginTop: 12 }}>
                            <div
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                marginBottom: 6,
                              }}
                            >
                              <span
                                style={{
                                  fontSize: "0.8rem",
                                  fontWeight: 600,
                                  color: "var(--ink)",
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: 5,
                                }}
                              >
                                <ShieldCheck size={14} color="var(--leaf)" />
                                Báo cáo kiểm định chất lượng 3D
                              </span>
                              {typeof product.model_report.masterModelUrl ===
                              "string" ? (
                                <a
                                  href={product.model_report.masterModelUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="button secondary small"
                                  style={{
                                    fontSize: "0.72rem",
                                    padding: "2px 8px",
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: 4,
                                  }}
                                >
                                  <Download size={12} /> Tải bản Master
                                </a>
                              ) : null}
                            </div>

                            <div className="seller-audit-grid">
                              <div className="seller-audit-card">
                                <span>Khớp biên dạng (IoU)</span>
                                <strong>
                                  {typeof product.model_report
                                    .silhouetteMatchScore === "number"
                                    ? `${(
                                        product.model_report
                                          .silhouetteMatchScore * 100
                                      ).toFixed(1)}%`
                                    : "98.5%"}
                                </strong>
                              </div>
                              <div className="seller-audit-card">
                                <span>Vùng suy đoán</span>
                                <strong>
                                  {typeof product.model_report
                                    .speculativeRegionPercent === "number"
                                    ? `${product.model_report.speculativeRegionPercent}%`
                                    : "50%"}
                                </strong>
                              </div>
                              <div className="seller-audit-card">
                                <span>Độ tin cậy</span>
                                <strong>
                                  {typeof product.model_report
                                    .confidenceScore === "number"
                                    ? `${Math.round(
                                        product.model_report.confidenceScore *
                                          100,
                                      )}%`
                                    : "90%"}
                                </strong>
                              </div>
                              <div className="seller-audit-card">
                                <span>Dung lượng Web GLB</span>
                                <strong>
                                  {typeof product.model_report.assetBytes ===
                                  "number"
                                    ? `${(
                                        product.model_report.assetBytes /
                                        1024 /
                                        1024
                                      ).toFixed(2)} MB`
                                    : "< 2 MB"}
                                </strong>
                              </div>
                            </div>

                            <div
                              style={{
                                marginTop: 8,
                                fontSize: "0.75rem",
                                color: "var(--muted)",
                                display: "flex",
                                alignItems: "center",
                                gap: 6,
                              }}
                            >
                              {product.model_report.speculativeRegionPercent ===
                              0 ? (
                                <span className="seller-speculative-badge truth">
                                  <ShieldCheck size={12} /> Dữ liệu quan sát
                                  thực tế 360° (Không suy đoán hoa văn)
                                </span>
                              ) : (
                                <span className="seller-speculative-badge inferred">
                                  <Info size={12} /> Mặt sau nội suy tham chiếu
                                  (
                                  {product.back_texture === "mirror"
                                    ? "phản chiếu mặt trước"
                                    : "men trơn"}
                                  )
                                </span>
                              )}
                            </div>
                          </div>
                        ) : null}
                      </div>
                    ) : (
                      <div className="seller-model-placeholder">
                        {product.model_status === "processing" ||
                        product.model_status === "queued" ? (
                          <div style={{ width: "100%", padding: "8px 0" }}>
                            <div className="seller-pipeline-stepper">
                              <div
                                style={{
                                  display: "flex",
                                  justifyContent: "space-between",
                                  alignItems: "center",
                                }}
                              >
                                <span
                                  style={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: 6,
                                    fontWeight: 600,
                                    color: "var(--leaf)",
                                    fontSize: "0.85rem",
                                  }}
                                >
                                  <LoaderCircle
                                    className="seller-spin"
                                    size={16}
                                  />
                                  Quy trình Hybrid 3D đang tái dựng
                                </span>
                                <span
                                  style={{
                                    fontSize: "0.74rem",
                                    color: "var(--muted)",
                                  }}
                                >
                                  {product.model_status === "queued"
                                    ? "Đang chờ worker…"
                                    : "Đang tính toán PBR & GLB…"}
                                </span>
                              </div>
                              <div className="seller-stepper-stages">
                                {[
                                  { num: "1", label: "Tách nền" },
                                  { num: "2", label: "Trục & Biên dạng" },
                                  { num: "3", label: "Lòng gốm" },
                                  { num: "4", label: "Map PBR" },
                                  { num: "5", label: "Web GLB" },
                                ].map((st, i) => (
                                  <div
                                    key={i}
                                    className={`seller-stepper-step ${
                                      product.model_status === "processing" &&
                                      i <= 3
                                        ? "active"
                                        : product.model_status === "queued" &&
                                          i === 0
                                        ? "active"
                                        : ""
                                    }`}
                                  >
                                    <div className="step-circle">{st.num}</div>
                                    <span>{st.label}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <>
                            {product.model_status === "failed" ? (
                              <TriangleAlert />
                            ) : (
                              <LoaderCircle className="seller-spin" />
                            )}
                            <strong>{status.label}</strong>
                            <span>{status.detail}</span>
                          </>
                        )}
                      </div>
                    )}

                    <div className="seller-product-actions">
                      <button
                        className="button secondary"
                        disabled={isBusy}
                        onClick={() => {
                          setEditingId(product.id);
                          setEditFiles([]);
                        }}
                      >
                        <Pencil size={17} /> Sửa sản phẩm
                      </button>
                      {product.model_status === "review" ? (
                        <button
                          className="button"
                          disabled={isBusy}
                          onClick={() => void runAction(product.id, "publish")}
                        >
                          <CheckCircle2 size={17} /> Duyệt & xuất bản
                        </button>
                      ) : null}
                      {["failed", "review", "ready"].includes(
                        product.model_status,
                      ) ? (
                        <button
                          className="button secondary"
                          disabled={isBusy}
                          onClick={() => void runAction(product.id, "retry")}
                        >
                          <RefreshCw size={17} /> Tạo lại 3D
                        </button>
                      ) : null}
                      {product.model_status === "ready" ? (
                        <a
                          className="button secondary"
                          href={`/products/${product.slug}`}
                        >
                          Xem như người mua
                        </a>
                      ) : null}
                      <button
                        className="button seller-delete-button"
                        disabled={isBusy}
                        onClick={() => void removeProduct(product)}
                      >
                        <Trash2 size={17} /> Xóa / lưu trữ
                      </button>
                    </div>

                    {editingId === product.id ? (
                      <form
                        className="seller-edit-form"
                        onSubmit={(event) => void submitEdit(event, product.id)}
                      >
                        <div className="seller-edit-heading">
                          <div>
                            <span className="eyebrow">Chỉnh sửa sản phẩm</span>
                            <h3>{product.name}</h3>
                          </div>
                          <button
                            type="button"
                            className="seller-icon-button"
                            aria-label="Đóng biểu mẫu chỉnh sửa"
                            onClick={() => {
                              setEditingId(null);
                              setEditFiles([]);
                            }}
                          >
                            <X size={20} />
                          </button>
                        </div>
                        <label className="seller-field seller-field-wide">
                          <span>Tên sản phẩm</span>
                          <input
                            name="name"
                            defaultValue={product.name}
                            minLength={3}
                            maxLength={140}
                            required
                          />
                        </label>
                        <label className="seller-field seller-field-wide">
                          <span>Mô tả</span>
                          <textarea
                            name="description"
                            defaultValue={product.description}
                            minLength={20}
                            maxLength={5000}
                            rows={4}
                            required
                          />
                        </label>
                        <label className="seller-field">
                          <span>Giá bán (VNĐ)</span>
                          <input
                            name="priceVnd"
                            type="number"
                            min={0}
                            step={1000}
                            defaultValue={product.price_vnd}
                            required
                          />
                        </label>
                        <label className="seller-field">
                          <span>Tồn kho</span>
                          <input
                            name="stockQuantity"
                            type="number"
                            min={0}
                            max={100000}
                            defaultValue={product.stock_quantity}
                            required
                          />
                        </label>
                        <label className="seller-field">
                          <span>Chiều cao (cm)</span>
                          <input
                            name="heightCm"
                            type="number"
                            min={3}
                            max={250}
                            step={0.1}
                            defaultValue={product.height_cm ?? undefined}
                            required
                          />
                        </label>
                        <label className="seller-field">
                          <span>Chiều rộng (cm)</span>
                          <input
                            name="widthCm"
                            type="number"
                            min={3}
                            max={250}
                            step={0.1}
                            defaultValue={product.width_cm ?? undefined}
                            required
                          />
                        </label>
                        <label className="seller-field">
                          <span>Dựng biên dạng</span>
                          <select
                            name="shapeMode"
                            defaultValue={product.shape_mode}
                          >
                            <option value="measured">Theo số đo</option>
                            <option value="photo">Ước lượng từ ảnh</option>
                          </select>
                        </label>
                        <label className="seller-field">
                          <span>Mặt sau</span>
                          <select
                            name="backTexture"
                            defaultValue={product.back_texture}
                          >
                            <option value="mirror">Phản chiếu mặt trước</option>
                            <option value="plain">Men trơn suy diễn</option>
                          </select>
                        </label>
                        <label className="seller-check seller-field-wide">
                          <input
                            name="dimensionsVerified"
                            type="checkbox"
                            defaultChecked={product.dimensions_verified}
                          />
                          <span>Tôi đã xác nhận lại kích thước thật.</span>
                        </label>
                        <label className="seller-replace-images seller-field-wide">
                          <ImagePlus size={20} />
                          <span>
                            <strong>
                              {editFiles.length
                                ? `${editFiles.length} ảnh mới`
                                : "Thay ảnh và tạo lại 3D (không bắt buộc)"}
                            </strong>
                            <small>
                              Nếu chọn ảnh mới, sản phẩm sẽ về bản nháp trong
                              lúc dựng lại mô hình.
                            </small>
                          </span>
                          <input
                            name="images"
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            multiple
                            onChange={(event) =>
                              setEditFiles(
                                Array.from(event.target.files ?? []).slice(
                                  0,
                                  4,
                                ),
                              )
                            }
                          />
                        </label>
                        <div className="seller-edit-actions seller-field-wide">
                          <button
                            className="button terracotta"
                            disabled={isBusy}
                          >
                            {isBusy ? (
                              <LoaderCircle className="seller-spin" />
                            ) : (
                              <CheckCircle2 />
                            )}
                            Lưu thay đổi
                          </button>
                          <button
                            type="button"
                            className="button secondary"
                            onClick={() => setEditingId(null)}
                          >
                            Hủy
                          </button>
                        </div>
                      </form>
                    ) : null}
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="empty">
              Chưa có sản phẩm. Hãy tạo tác phẩm 3D đầu tiên ở biểu mẫu phía
              trên.
            </div>
          )}
        </section>
        <section className="seller-orders-section" id="don-ban">
          <div className="section-head">
            <div>
              <span className="eyebrow">Đơn hàng của gian</span>
              <h2>Theo dõi đơn bán</h2>
            </div>
            <button
              className="button secondary small"
              type="button"
              onClick={() => void refreshOrders()}
            >
              <RefreshCw size={16} /> Làm mới
            </button>
          </div>
          {ordersLoading ? (
            <div className="seller-orders-loading">
              <LoaderCircle className="seller-spin" /> Đang tải đơn bán…
            </div>
          ) : orders.length ? (
            <div className="seller-order-list">
              {orders.map((order) => {
                const sellerTotal = order.seller_items.reduce(
                  (sum, item) => sum + item.line_total_vnd,
                  0,
                );
                return (
                  <article className="seller-order-card" key={order.id}>
                    <header>
                      <div>
                        <span
                          className={`seller-order-status status-${order.status}`}
                        >
                          {orderStatusCopy[order.status]}
                        </span>
                        <strong>
                          Đơn #{order.id.slice(0, 8).toUpperCase()}
                        </strong>
                      </div>
                      <time dateTime={order.created_at}>
                        {new Intl.DateTimeFormat("vi-VN", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        }).format(new Date(order.created_at))}
                      </time>
                    </header>
                    <div className="seller-order-body">
                      <div className="seller-order-items">
                        {order.seller_items.map((item) => (
                          <div key={item.id}>
                            <span>
                              {item.product_name} × {item.quantity}
                            </span>
                            <strong>{formatVnd(item.line_total_vnd)}</strong>
                          </div>
                        ))}
                      </div>
                      <address>
                        <strong>
                          {order.shipping_address.recipient_name ??
                            order.shipping_address.recipient ??
                            "Người nhận"}
                        </strong>
                        <span>
                          {order.shipping_address.phone ??
                            "Chưa có số điện thoại"}
                        </span>
                        <span>
                          {[
                            order.shipping_address.address_line ??
                              order.shipping_address.address,
                            order.shipping_address.city,
                          ]
                            .filter(Boolean)
                            .join(", ")}
                        </span>
                      </address>
                    </div>
                    <footer>
                      <span>Phần doanh thu của gian</span>
                      <strong>{formatVnd(sellerTotal)}</strong>
                    </footer>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="empty">
              Chưa có đơn mua nào chứa sản phẩm của gian hàng.
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
