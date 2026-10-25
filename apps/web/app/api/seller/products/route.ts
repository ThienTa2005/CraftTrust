import { parseSourceViews, parseRequestedEngine, type CameraView } from "@/lib/model-source-views";
import { NextResponse } from "next/server";
import { getAuthorizedUser } from "@/lib/authz";
import { summarizeModelJobs } from "@/lib/model-job-status";

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

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 70);
}

function extensionFor(type: string) {
  if (type === "image/png") return "png";
  if (type === "image/webp") return "webp";
  return "jpg";
}

async function hasValidSignature(file: File) {
  const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  if (file.type === "image/jpeg") {
    return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  }
  if (file.type === "image/png") {
    return (
      bytes[0] === 0x89 &&
      bytes[1] === 0x50 &&
      bytes[2] === 0x4e &&
      bytes[3] === 0x47
    );
  }
  if (file.type === "image/webp") {
    return (
      String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
      String.fromCharCode(...bytes.slice(8, 12)) === "WEBP"
    );
  }
  return false;
}

async function getOwnedArtisan(
  supabase: NonNullable<
    Awaited<ReturnType<typeof getAuthorizedUser>>["supabase"]
  >,
  ownerId: string,
) {
  return supabase
    .from("artisans")
    .select("id,name")
    .eq("owner_id", ownerId)
    .maybeSingle();
}

export async function GET() {
  const auth = await getAuthorizedUser(["artisan", "seller", "admin"]);
  if (auth.reason || !auth.supabase || !auth.user) {
    return jsonError(
      auth.reason ?? "Không thể xác thực tài khoản.",
      auth.user ? 403 : 401,
    );
  }
  const { data: artisan, error: artisanError } = await getOwnedArtisan(
    auth.supabase,
    auth.user.id,
  );
  if (artisanError) return jsonError(artisanError.message, 500);
  if (!artisan)
    return jsonError("Tài khoản chưa được liên kết với hồ sơ nghệ nhân.", 409);

  const { data, error } = await auth.supabase
    .from("products")
    .select(
      "id,slug,name,description,price_vnd,stock_quantity,status,poster_url,model_url,ar_url,height_cm,width_cm,dimensions_verified,shape_mode,back_texture,model_status,model_report,model_error,created_at,model_jobs(id,status,created_at,current_step)",
    )
    .eq("artisan_id", artisan.id)
    .order("created_at", { ascending: false });
  if (error) return jsonError(error.message, 500);
  return NextResponse.json({
    products: (data ?? []).map(({ model_jobs, ...product }) => ({
      ...product,
      ...summarizeModelJobs(model_jobs ?? []),
    })),
  });
}

export async function POST(request: Request) {
  const auth = await getAuthorizedUser(["artisan", "seller", "admin"]);
  if (auth.reason || !auth.supabase || !auth.user) {
    return jsonError(
      auth.reason ?? "Không thể xác thực tài khoản.",
      auth.user ? 403 : 401,
    );
  }
  const { data: artisan, error: artisanError } = await getOwnedArtisan(
    auth.supabase,
    auth.user.id,
  );
  if (artisanError) return jsonError(artisanError.message, 500);
  if (!artisan)
    return jsonError("Tài khoản chưa được liên kết với hồ sơ nghệ nhân.", 409);

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
    .filter((entry): entry is File => entry instanceof File);

  let sourceViews: CameraView[];
  let engine: string;
  try {
    sourceViews = parseSourceViews(form.get("sourceViews"), images.length);
    engine = parseRequestedEngine(form.get("engine"));
    if (engine === "multiview" && images.length && sourceViews.filter(v => v.azimuth !== null).length < 2)
      throw new Error("Limited Multi-view cần ít nhất hai ảnh chụp ngang thân.");
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Góc chụp không hợp lệ.");
  }

  if (name.length < 3 || name.length > 140)
    return jsonError("Tên sản phẩm phải từ 3–140 ký tự.");
  if (description.length < 20 || description.length > 5000) {
    return jsonError("Mô tả sản phẩm phải từ 20–5000 ký tự.");
  }
  if (!Number.isSafeInteger(priceVnd) || priceVnd < 0)
    return jsonError("Giá bán không hợp lệ.");
  if (
    !Number.isSafeInteger(stockQuantity) ||
    stockQuantity < 0 ||
    stockQuantity > 100000
  ) {
    return jsonError("Số lượng tồn kho không hợp lệ.");
  }
  if (
    ![heightCm, widthCm].every(
      (value) => Number.isFinite(value) && value >= 3 && value <= 250,
    )
  ) {
    return jsonError("Chiều cao và chiều rộng phải nằm trong khoảng 3–250 cm.");
  }
  if (images.length < 1 || images.length > 4)
    return jsonError("Hãy chọn từ 1 đến 4 ảnh sản phẩm.");
  for (const image of images) {
    if (!ACCEPTED_TYPES.has(image.type))
      return jsonError("Chỉ chấp nhận ảnh JPEG, PNG hoặc WebP.");
    if (image.size < MIN_IMAGE_BYTES || image.size > MAX_IMAGE_BYTES) {
      return jsonError("Mỗi ảnh phải có dung lượng từ 200 byte đến 7 MB.");
    }
    if (!(await hasValidSignature(image)))
      return jsonError(
        `Tệp ${image.name} không đúng định dạng ảnh đã khai báo.`,
      );
  }

  const productId = crypto.randomUUID();
  const slug = `${slugify(name) || "gom-bat-trang"}-${productId.slice(0, 8)}`;
  const uploadedSourcePaths: string[] = [];
  const uploadedPublicPaths: string[] = [];

  const { error: productError } = await auth.supabase.from("products").insert({
    id: productId,
    artisan_id: artisan.id,
    slug,
    name,
    description,
    price_vnd: priceVnd,
    stock_quantity: stockQuantity,
    status: "draft",
    height_cm: heightCm,
    width_cm: widthCm,
    dimensions_verified: dimensionsVerified,
    shape_mode: shapeMode,
    back_texture: backTexture,
    model_status: "queued",
  });
  if (productError) return jsonError(productError.message, 500);

  try {
    const sourceRows: Array<Record<string, string | number | null>> = [];
    const mediaRows: Array<Record<string, string | number | null>> = [];
    let posterUrl = "";

    for (const [index, image] of images.entries()) {
      const extension = extensionFor(image.type);
      const sourcePath = `${auth.user.id}/${productId}/source-${index}.${extension}`;
      const publicPath = `${auth.user.id}/${productId}/image-${index}.${extension}`;
      const buffer = await image.arrayBuffer();

      const { error: sourceUploadError } = await auth.supabase.storage
        .from("product-source")
        .upload(sourcePath, buffer, {
          contentType: image.type,
          cacheControl: "3600",
          upsert: false,
        });
      if (sourceUploadError) throw sourceUploadError;
      uploadedSourcePaths.push(sourcePath);

      const { error: publicUploadError } = await auth.supabase.storage
        .from("product-assets")
        .upload(publicPath, buffer, {
          contentType: image.type,
          cacheControl: "31536000",
          upsert: false,
        });
      if (publicUploadError) throw publicUploadError;
      uploadedPublicPaths.push(publicPath);

      const publicAsset = { publicUrl: `/api/assets/product-assets/${publicPath}` };
      if (index === 0) posterUrl = publicAsset.publicUrl;
      sourceRows.push({
        product_id: productId,
        storage_path: sourcePath,
        mime_type: image.type,
        byte_size: image.size,
        ordinal: index,
        camera_direction: sourceViews[index]!.direction,
        camera_azimuth: sourceViews[index]!.azimuth,
      });
      mediaRows.push({
        product_id: productId,
        kind: "image",
        url: publicAsset.publicUrl,
        alt: `${name} – ảnh ${index + 1}`,
        sort_order: index,
      });
    }

    const { error: sourceRowsError } = await auth.supabase
      .from("product_source_assets")
      .insert(sourceRows);
    if (sourceRowsError) throw sourceRowsError;
    const { error: mediaError } = await auth.supabase
      .from("product_media")
      .insert(mediaRows);
    if (mediaError) throw mediaError;
    const { error: posterError } = await auth.supabase
      .from("products")
      .update({ poster_url: posterUrl })
      .eq("id", productId);
    if (posterError) throw posterError;
    const { error: jobError } = await auth.supabase
      .from("model_jobs")
      .insert({
        product_id: productId,
        status: "queued",
        attempt: 1,
        engine,
      });
    if (jobError) throw jobError;

    return NextResponse.json(
      { id: productId, slug, modelStatus: "queued" },
      { status: 201 },
    );
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Không thể tạo hồ sơ sản phẩm 3D.";
    await Promise.all([
      uploadedSourcePaths.length
        ? auth.supabase.storage
            .from("product-source")
            .remove(uploadedSourcePaths)
        : Promise.resolve(),
      uploadedPublicPaths.length
        ? auth.supabase.storage
            .from("product-assets")
            .remove(uploadedPublicPaths)
        : Promise.resolve(),
      auth.supabase
        .from("products")
        .update({ model_status: "failed", model_error: message })
        .eq("id", productId),
    ]);
    return jsonError(message, 500);
  }
}
