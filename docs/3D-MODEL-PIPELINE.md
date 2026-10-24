# Quy trình sản phẩm gốm 3D

## Mục tiêu

Nghệ nhân đăng sản phẩm cùng ảnh và kích thước thật. Hệ thống tạo file GLB ở tiến trình nền, đưa bản dựng về cho nghệ nhân kiểm tra, rồi mới công khai cho người mua. Trang chi tiết sản phẩm hiện có sẽ tự bật khung xoay 3D khi sản phẩm đã có `model_url`.

## Luồng dữ liệu

```text
Nghệ nhân /seller
  -> products (draft) + product_source_assets + model_jobs (queued)
  -> product-source (ảnh nguồn riêng tư)
  -> model-worker (processing)
  -> product-assets (GLB công khai) + products (review)
  -> nghệ nhân duyệt
  -> products (active + ready)
  -> người mua /products/[slug] xem 3D
```

Supabase chịu trách nhiệm tài khoản, quyền sở hữu, hàng đợi và Storage. Worker Node tải job bằng service role rồi gọi Python để dựng GLB. Tách worker khỏi Next.js giúp tác vụ CPU dài không làm treo request web và có thể triển khai/mở rộng độc lập.

## Chạy local

1. Khởi động và reset Supabase để áp dụng migration mới:

   ```powershell
   corepack pnpm supabase:start
   corepack pnpm supabase:reset
   corepack pnpm supabase:status
   ```

2. Tạo Python virtual environment:

   ```powershell
   py -3 -m venv services/model-worker/.venv
   services/model-worker/.venv/Scripts/python -m pip install -r services/model-worker/requirements.txt
   ```

3. Tạo `.env.local` ở repository root:

   ```env
   SUPABASE_URL=http://127.0.0.1:55321
   SUPABASE_SERVICE_ROLE_KEY=SERVICE_ROLE_KEY_TU_SUPABASE_STATUS
   PYTHON_BIN=.venv/Scripts/python.exe
   MODEL_WORKER_POLL_MS=3000
   ```

4. Chạy riêng website và worker:

   ```powershell
   corepack pnpm dev:web
   corepack pnpm dev:model-worker
   ```

5. Đăng nhập `demo.seller@example.invalid`, mở `/seller`, tạo sản phẩm, chờ trạng thái **Chờ nghệ nhân duyệt**, kiểm tra bản 3D và bấm **Duyệt & xuất bản**.

## Dữ liệu và bảo mật

- `product-source` là bucket riêng tư. Policy chỉ cho chủ sở hữu đọc/xóa ảnh của mình; worker truy cập bằng service role.
- `product-assets` chứa ảnh bìa, ảnh trưng bày và GLB công khai để người mua tải trong model viewer.
- Người bán chỉ đọc/sửa sản phẩm thuộc hồ sơ nghệ nhân của chính họ qua RLS.
- Browser không nhận service-role key. Worker là tiến trình duy nhất cập nhật trạng thái thực thi job.
- API kiểm tra số lượng ảnh, dung lượng, MIME và magic bytes trước khi lưu.

## Giới hạn kỹ thuật cần hiển thị trung thực

- Phù hợp nhất với bình, lọ, chén và sản phẩm gần đối xứng quanh trục.
- Ảnh chính được dùng để dựng biên dạng. Ảnh phụ hiện chỉ lưu để đối chiếu, chưa ghép photogrammetry.
- Hoa văn mặt sau được phản chiếu từ mặt trước hoặc thay bằng men trơn theo lựa chọn của nghệ nhân.
- Lòng gốm và độ dày thành là giả định hình học.
- Mô hình phải được nghệ nhân xem lại; không dùng kết quả này làm số liệu đo kiểm chất lượng.

## Triển khai production

Triển khai web và worker thành hai service. Worker cần Python runtime, các package trong `requirements.txt`, biến môi trường server-only và quyền ghi Storage. RPC `claim_model_job()` dùng `FOR UPDATE SKIP LOCKED`, vì vậy nhiều worker có thể nhận các job khác nhau mà không dựng trùng một sản phẩm. Vẫn cần bổ sung log tập trung, cảnh báo job treo, quota, cleanup asset cũ và giới hạn CPU theo chính sách vận hành.

Nguồn dựng hình được chuyển thể từ gói `di-san-3d.zip` do người dùng cung cấp. Repository không nhập `.env`, `node_modules` hay cache trong archive. Cần xác nhận quyền sở hữu/giấy phép của tác giả trước khi phân phối mã nguồn công khai.
