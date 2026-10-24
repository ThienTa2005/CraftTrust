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
  CheckCircle2,
  Clock3,
  LayoutDashboard,
  Flame,
  ImagePlus,
  LoaderCircle,
  PackageCheck,
  Pencil,
  Plus,
  ReceiptText,
  RefreshCw,
  Ruler,
  ShoppingBag,
  Sparkles,
  Trash2,
  TriangleAlert,
  UploadCloud,
  X,
} from "lucide-react";
import { CraftModelViewer } from "@/components/model-viewer";
import type { AppRole } from "@/lib/authz";
import { formatVnd } from "@/lib/format";

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
}: {
  artisanName: string;
  roles: AppRole[];
  initialProducts: SellerProduct[];
  initialError?: string | undefined;
}) {
  const [products, setProducts] = useState(initialProducts);
  const [files, setFiles] = useState<File[]>([]);
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

  const previewUrl = useMemo(
    () => (files[0] ? URL.createObjectURL(files[0]) : null),
    [files],
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
  }, []);

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
    if (!files.length) {
      setNotice({ kind: "error", text: "Hãy chọn ít nhất một ảnh sản phẩm." });
      return;
    }
    const form = event.currentTarget;
    const data = new FormData(form);
    data.delete("images");
    files.forEach((file) => data.append("images", file));
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
              <label className="seller-dropzone">
                {previewUrl ? (
                  <span
                    className="seller-image-preview"
                    style={{ backgroundImage: `url("${previewUrl}")` }}
                  />
                ) : (
                  <span className="seller-dropzone-icon">
                    <ImagePlus size={34} />
                  </span>
                )}
                <strong>
                  {files.length
                    ? `${files.length} ảnh đã chọn`
                    : "Chọn 1–4 ảnh gốm"}
                </strong>
                <span>JPEG, PNG hoặc WebP · tối đa 7 MB/ảnh</span>
                <input
                  name="images"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  onChange={(event) =>
                    setFiles(Array.from(event.target.files ?? []).slice(0, 4))
                  }
                />
              </label>
              <div className="seller-photo-guide">
                <strong>Ảnh chính quyết định chất lượng 3D</strong>
                <span>• Chụp thẳng, thấy trọn thân và đáy sản phẩm.</span>
                <span>• Dùng nền trơn hoặc PNG đã tách nền.</span>
                <span>
                  • Tránh tay người, vật khác và bóng đổ che đường biên.
                </span>
                <span>
                  • Ảnh phụ được lưu để đối chiếu, chưa dùng ghép đa góc.
                </span>
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
                <span>Dựng biên dạng</span>
                <select name="shapeMode" defaultValue="measured">
                  <option value="measured">Theo số đo đã nhập</option>
                  <option value="photo">Ước lượng rộng từ ảnh</option>
                </select>
              </label>
              <label className="seller-field">
                <span>Mặt sau chưa nhìn thấy</span>
                <select name="backTexture" defaultValue="mirror">
                  <option value="mirror">Phản chiếu hoa văn mặt trước</option>
                  <option value="plain">Men trơn suy diễn</option>
                </select>
              </label>
              <label className="seller-check seller-field-wide">
                <input name="dimensionsVerified" type="checkbox" />
                <span>
                  Tôi đã đo trực tiếp sản phẩm và xác nhận kích thước trên là
                  chính xác.
                </span>
              </label>
              <div className="seller-form-note seller-field-wide">
                <TriangleAlert size={18} />
                <span>
                  Công cụ phù hợp nhất với bình, lọ, chén và sản phẩm gần đối
                  xứng quanh trục. Mặt sau, lòng gốm và độ dày thành là phần suy
                  diễn, không phải quét 3D đo kiểm.
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
                  ? "Đang tải ảnh và tạo yêu cầu…"
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
                        />
                      </div>
                    ) : (
                      <div className="seller-model-placeholder">
                        {product.model_status === "failed" ? (
                          <TriangleAlert />
                        ) : (
                          <LoaderCircle className="seller-spin" />
                        )}
                        <strong>{status.label}</strong>
                        <span>{status.detail}</span>
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
