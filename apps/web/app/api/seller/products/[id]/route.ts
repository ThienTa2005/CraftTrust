import { parseSourceViews, parseRequestedEngine, type CameraView } from "@/lib/model-source-views";
import { NextResponse } from "next/server";
import { getAuthorizedUser } from "@/lib/authz";
import { enqueuePixal3dJob } from "@/lib/modal-3d";

export const runtime = "nodejs";

const MAX_IMAGE_BYTES = 7_000_000;
const MIN_IMAGE_BYTES = 200;
const ACCEPTED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

function toNumber(value: FormDataEntryValue | null) {
  if (typeof value !== "string" || value.trim() === "") return Number.NaN;
  return Number(value);
}

function extensionFor(type: string) {
  if (type === "image/png") return "png";
  if (type === "image/webp") return "webp";
  return "jpg";
}

async function hasValidSignature(file: File) {
  const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  if (file.type === "image/jpeg")
    return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (file.type === "image/png")
    return (
      bytes[0] === 0x89 &&
      bytes[1] === 0x50 &&
      bytes[2] === 0x4e &&
      bytes[3] === 0x47
    );
  if (file.type === "image/webp")
    return (
      String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
      String.fromCharCode(...bytes.slice(8, 12)) === "WEBP"
    );
  return false;
}

function publicStoragePath(url: string) {
  if (url.startsWith("/api/assets/product-assets/")) return url.slice("/api/assets/product-assets/".length);
  try {
    const marker = "/storage/v1/object/public/product-assets/";
    const path = new URL(url).pathname;
    const index = path.indexOf(marker);
    return index < 0
      ? null
      : decodeURIComponent(path.slice(index + marker.length));
  } catch {
    return null;
  }
}

async function authorizeProduct(id: string) {
  const auth = await getAuthorizedUser(["artisan", "seller", "admin"]);
  if (auth.reason || !auth.supabase || !auth.user) {
    return {
      response: jsonError(
        auth.reason ?? "Không thể xác thực tài khoản.",
        auth.user ? 403 : 401,
      ),
    };
  }
  const { data: product, error } = await auth.supabase
    .from("products")
    .select("id,status,model_status")
    .eq("id", id)
    .maybeSingle();
  if (error) return { response: jsonError(error.message, 500) };
  if (!product) return { response: jsonError("Không tìm thấy sản phẩm.", 404) };
  const { data: allowed } = await auth.supabase.rpc("can_manage_product", { p_product_id: id });
  if (allowed !== true) return { response: jsonError("Không có quyền sửa sản phẩm.", 403) };
  return { auth, product };
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const owned = await authorizeProduct(id);
  if ("response" in owned) return owned.response;
  const { auth, product } = owned;

  const form = await request.formData();
  const name = String(form.get("name") ?? "").trim();
  const description = String(form.get("description") ?? "").trim();
  const priceVnd = toNumber(form.get("priceVnd"));
  const stockQuantity = toNumber(form.get("stockQuantity"));
  const heightCm = toNumber(form.get("heightCm"));
  const widthCm = toNumber(form.get("widthCm"));
  const shapeMode = form.get("shapeMode") === "measured" ? "measured" : "photo";
  const backTexture = form.get("backTexture") === "plain" ? "plain" : "mirror";
  const dimensionsVerified = form.get("dimensionsVerified") === "true";
  const images = form
    .getAll("images")
    .filter((entry): entry is File => entry instanceof File && entry.size > 0);

  let sourceViews: CameraView[];
  let engine: string;
  try {
    sourceViews = parseSourceViews(form.get("sourceViews"), images.length);
    engine = parseRequestedEngine(form.get("engine"));
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Góc chụp không hợp lệ.");
  }

  if (name.length < 3 || name.length > 140)
    return jsonError("Tên sản phẩm phải từ 3–140 ký tự.");
  if (description.length < 20 || description.length > 5000)
    return jsonError("Mô tả sản phẩm phải từ 20–5000 ký tự.");
  if (!Number.isSafeInteger(priceVnd) || priceVnd < 0)
    return jsonError("Giá bán không hợp lệ.");
  if (
    !Number.isSafeInteger(stockQuantity) ||
    stockQuantity < 0 ||
    stockQuantity > 100000
  )
    return jsonError("Số lượng tồn kho không hợp lệ.");
  if (
    ![heightCm, widthCm].every(
      (value) => Number.isFinite(value) && value >= 3 && value <= 250,
    )
  )
    return jsonError("Chiều cao và chiều rộng phải nằm trong khoảng 3–250 cm.");
  if (images.length > 4)
    return jsonError("Chỉ được chọn tối đa 4 ảnh sản phẩm.");
  if (images.length && ["queued", "processing"].includes(product.model_status))
    return jsonError(
      "Hãy đợi lần tạo 3D hiện tại hoàn tất trước khi thay ảnh.",
      409,
    );
  for (const image of images) {
    if (!ACCEPTED_TYPES.has(image.type))
      return jsonError("Chỉ chấp nhận ảnh JPEG, PNG hoặc WebP.");
    if (image.size < MIN_IMAGE_BYTES || image.size > MAX_IMAGE_BYTES)
      return jsonError("Mỗi ảnh phải có dung lượng từ 200 byte đến 7 MB.");
    if (!(await hasValidSignature(image)))
      return jsonError(
        `Tệp ${image.name} không đúng định dạng ảnh đã khai báo.`,
      );
  }

  const baseUpdate = {
    name,
    description,
    price_vnd: priceVnd,
    stock_quantity: stockQuantity,
    height_cm: heightCm,
    width_cm: widthCm,
    dimensions_verified: dimensionsVerified,
    shape_mode: shapeMode,
    back_texture: backTexture,
  };
  if (!images.length) {
    const { error } = await auth.supabase
      .from("products")
      .update(baseUpdate)
      .eq("id", id);
    if (error) return jsonError(error.message, 500);
    return NextResponse.json({ ok: true, regenerated: false });
  }

  const { data: oldMedia } = await auth.supabase
    .from("product_media")
    .select("url")
    .eq("product_id", id)
    .eq("kind", "image");
  const revision = crypto.randomUUID().slice(0, 8);
  const sourceRows: Array<Record<string, string | number | null>> = [];
  const mediaRows: Array<Record<string, string | number | null>> = [];
  const newSourcePaths: string[] = [];
  const newPublicPaths: string[] = [];
  let posterUrl = "";

  try {
    for (const [index, image] of images.entries()) {
      const extension = extensionFor(image.type);
      const sourcePath = `${auth.user.id}/${id}/source-${revision}-${index}.${extension}`;
      const publicPath = `${auth.user.id}/${id}/image-${revision}-${index}.${extension}`;
      const buffer = await image.arrayBuffer();
      const { error: sourceError } = await auth.supabase.storage
        .from("product-source")
        .upload(sourcePath, buffer, {
          contentType: image.type,
          cacheControl: "3600",
        });
      if (sourceError) throw sourceError;
      newSourcePaths.push(sourcePath);
      const { error: publicError } = await auth.supabase.storage
        .from("product-assets")
        .upload(publicPath, buffer, {
          contentType: image.type,
          cacheControl: "31536000",
        });
      if (publicError) throw publicError;
      newPublicPaths.push(publicPath);
      const asset = { publicUrl: `/api/assets/product-assets/${publicPath}` };
      if (index === 0) posterUrl = asset.publicUrl;
      sourceRows.push({
        product_id: id,
        storage_path: sourcePath,
        mime_type: image.type,
        byte_size: image.size,
        ordinal: index,
        camera_direction: sourceViews[index]!.direction,
        camera_azimuth: sourceViews[index]!.azimuth,
      });
      mediaRows.push({
        product_id: id,
        kind: "image",
        url: asset.publicUrl,
        alt: `${name} – ảnh ${index + 1}`,
        sort_order: index,
      });
    }

    const { error: sourceDeleteError } = await auth.supabase
      .from("product_source_assets")
      .delete()
      .eq("product_id", id);
    if (sourceDeleteError) throw sourceDeleteError;
    const { error: sourceInsertError } = await auth.supabase
      .from("product_source_assets")
      .insert(sourceRows);
    if (sourceInsertError) throw sourceInsertError;
    const { error: mediaDeleteError } = await auth.supabase
      .from("product_media")
      .delete()
      .eq("product_id", id)
      .eq("kind", "image");
    if (mediaDeleteError) throw mediaDeleteError;
    const { error: mediaInsertError } = await auth.supabase
      .from("product_media")
      .insert(mediaRows);
    if (mediaInsertError) throw mediaInsertError;

    const { error: updateError } = await auth.supabase
      .from("products")
      .update({
        ...baseUpdate,
        poster_url: posterUrl,
        status: "draft",
        model_status: "queued",
        model_error: null,
        model_report: null,
        model_url: null,
        ar_url: null,
      })
      .eq("id", id);
    if (updateError) throw updateError;
    let queued;
    try {
      const mode = (engine === "pixal3d-multiview" || sourceViews.filter(v => v.azimuth !== null).length >= 2) ? "multiview" : "single";
      queued = await enqueuePixal3dJob(
        auth.supabase,
        id,
        mode,
      );
    } catch {
      await auth.supabase.from("products").update({ model_status: "not_requested", model_version: null }).eq("id", id);
      return NextResponse.json({ ok: true, regenerated: false, modelStatus: "not_requested",
        dispatchError: "Đã lưu ảnh. Generation chưa bật hoặc budget không đủ; hãy thử lại sau." });
    }
    const { jobId, dispatch } = queued;

    // Preserve prior source objects: immutable job manifests reference them.
    const oldSourcePaths: string[] = [];
    const oldPublicPaths = (oldMedia ?? [])
      .map((row) => publicStoragePath(row.url))
      .filter((path): path is string => Boolean(path));
    await Promise.all([
      oldSourcePaths.length
        ? auth.supabase.storage.from("product-source").remove(oldSourcePaths)
        : Promise.resolve(),
      oldPublicPaths.length
        ? auth.supabase.storage.from("product-assets").remove(oldPublicPaths)
        : Promise.resolve(),
    ]);
    return NextResponse.json({
      ok: dispatch.ok,
      regenerated: true,
      jobId,
      modelStatus: dispatch.ok ? "queued" : "failed",
      dispatchError: dispatch.ok ? undefined : dispatch.error,
    });
  } catch (error) {
    await Promise.all([
      newSourcePaths.length
        ? auth.supabase.storage.from("product-source").remove(newSourcePaths)
        : Promise.resolve(),
      newPublicPaths.length
        ? auth.supabase.storage.from("product-assets").remove(newPublicPaths)
        : Promise.resolve(),
    ]);
    return jsonError(
      error instanceof Error ? error.message : "Không thể cập nhật sản phẩm.",
      500,
    );
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const owned = await authorizeProduct(id);
  if ("response" in owned) return owned.response;
  const { auth, product } = owned;
  if (["queued", "processing"].includes(product.model_status))
    return jsonError("Không thể xóa khi mô hình 3D đang được xử lý.", 409);

  const { count: orderCount, error: orderError } = await auth.supabase
    .from("order_items")
    .select("id", { count: "exact", head: true })
    .eq("product_id", id);
  if (orderError) return jsonError(orderError.message, 500);
  if ((orderCount ?? 0) > 0) {
    const { error } = await auth.supabase
      .from("products")
      .update({ status: "archived", stock_quantity: 0 })
      .eq("id", id);
    if (error) return jsonError(error.message, 500);
    return NextResponse.json({ ok: true, archived: true });
  }

  const { data: sources } = await auth.supabase
    .from("product_source_assets")
    .select("storage_path")
    .eq("product_id", id);
  const { data: media } = await auth.supabase
    .from("product_media")
    .select("url")
    .eq("product_id", id);
  const { error: deleteError } = await auth.supabase
    .from("products")
    .delete()
    .eq("id", id);
  if (deleteError) return jsonError(deleteError.message, 500);

  const sourcePaths = (sources ?? []).map((row) => row.storage_path);
  const assetPaths = (media ?? [])
    .map((row) => publicStoragePath(row.url))
    .filter((path): path is string => Boolean(path));
  await Promise.all([
    sourcePaths.length
      ? auth.supabase.storage.from("product-source").remove(sourcePaths)
      : Promise.resolve(),
    assetPaths.length
      ? auth.supabase.storage.from("product-assets").remove(assetPaths)
      : Promise.resolve(),
  ]);
  return NextResponse.json({ ok: true, archived: false });
}
