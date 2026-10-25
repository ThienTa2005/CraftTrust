# BÁO CÁO KIỂM THỬ VÀ RÀ SOÁT TOÀN BỘ ROUTES (ROUTE_AUDIT.md)
**Dự án:** Hanoi CraftTrust – Sàn thương mại điện tử đa người bán & Di sản số  
**Môi trường thử nghiệm:** Production Build & Local Supabase Stack (`127.0.0.1:55321` / Port `3000`)  
**Ngày kiểm thử:** 25/10/2026  
**Người thực hiện:** Senior Full-Stack Architect & QA Automation Lead  

---

## 1. TỔNG QUAN DANH SÁCH ROUTES TRÊN TOÀN HỆ THỐNG

| Route | Quyền truy cập (RBAC) | Application Shell | Trạng thái HTTP | Rendering Type | Kết quả kiểm thử |
| :--- | :--- | :--- | :---: | :---: | :---: |
| `/` | Công khai (Public) | Buyer Marketplace Shell | 200 OK | Dynamic (SSR) | **PASS ✓** |
| `/marketplace` | Công khai (Public) | Buyer Marketplace Shell | 200 OK | Dynamic (SSR) | **PASS ✓** |
| `/products/[slug]` | Công khai (Public) | Buyer Marketplace Shell | 200 OK | Dynamic (SSR) | **PASS ✓** |
| `/villages` | Công khai (Public) | Buyer Marketplace Shell | 200 OK | Dynamic (SSR) | **PASS ✓** |
| `/villages/[slug]` | Công khai (Public) | Buyer Marketplace Shell | 200 OK | Dynamic (SSR) | **PASS ✓** |
| `/map` | Công khai (Public) | Buyer Marketplace Shell | 200 OK | Dynamic (SSR) | **PASS ✓** |
| `/experiences` | Công khai (Public) | Buyer Marketplace Shell | 200 OK | Dynamic (SSR) | **PASS ✓** |
| `/rewards` | Khách mua (Customer) | Buyer Marketplace Shell | 200 OK | Dynamic (SSR) | **PASS ✓** |
| `/cart` | Khách mua (Customer) | Buyer Marketplace Shell | 200 OK | Dynamic (SSR) | **PASS ✓** |
| `/checkout` | Khách mua (Customer) | Buyer Marketplace Shell | 200 OK | Dynamic (SSR) | **PASS ✓** |
| `/orders` | Khách mua (Customer) | Buyer Marketplace Shell | 200 OK | Dynamic (SSR) | **PASS ✓** |
| `/assistant` | Công khai / Khách mua | Buyer Marketplace Shell | 200 OK | Dynamic (SSR) | **PASS ✓** |
| `/auth` | Công khai (Guest) | Unified Auth Shell | 200 OK | Dynamic (SSR) | **PASS ✓** |
| `/auth/callback` | Hệ thống (OAuth/Email) | API Route Handler | 302 Redirect | Dynamic (API) | **PASS ✓** |
| `/trace` | Công khai (Public) | Digital Passport Shell | 200 OK | Dynamic (SSR) | **PASS ✓** |
| `/trace/[publicCode]` | Công khai (Public) | Digital Passport Shell | 200 OK | Dynamic (SSR) | **PASS ✓** |
| `/seller` | Nghệ nhân / Nhà bán hàng | Seller Centre Shell | 200 OK | Dynamic (SSR) | **PASS ✓** |
| `/admin` | Quản trị viên / Thẩm định | Admin Portal Shell | 200 OK | Dynamic (SSR) | **PASS ✓** |
| `/docs` | Công khai (Public) | Buyer Marketplace Shell | 200 OK | Dynamic (SSR) | **PASS ✓** |
| `/_not-found` | Công khai (Public) | Global Error Shell | 404 Not Found | Static | **PASS ✓** |

---

## 2. KIỂM THỬ CÁC ROUTE API NỀN TẢNG (BACKEND API HANDLERS)

| API Endpoint | Phương thức | Phân quyền bảo vệ | Chức năng nghiệp vụ | Mã phản hồi | Kết quả |
| :--- | :---: | :--- | :--- | :---: | :---: |
| `/api/admin/orders` | `GET` | Admin / Verifier | Lấy danh sách toàn bộ đơn hàng toàn sàn kèm thông tin người mua | 200 OK | **PASS ✓** |
| `/api/admin/orders` | `PATCH` | Admin / Verifier | Cập nhật trạng thái đơn (placed, processing, fulfilled, cancelled) & ghi Audit Log | 200 OK | **PASS ✓** |
| `/api/admin/products` | `GET` | Admin / Verifier | Lấy danh sách sản phẩm kèm trạng thái kiểm duyệt | 200 OK | **PASS ✓** |
| `/api/admin/products` | `PATCH` | Admin / Verifier | Phê duyệt mở bán (`active`) hoặc tạm chuyển nháp (`draft`) sản phẩm | 200 OK | **PASS ✓** |
| `/api/admin/merchants` | `GET` | Admin / Verifier | Lấy danh sách hồ sơ xưởng làng nghề & nghệ nhân | 200 OK | **PASS ✓** |
| `/api/admin/merchants` | `PATCH` | Admin / Verifier | Kích hoạt hoặc tạm ngưng gian hàng xưởng nghệ nhân | 200 OK | **PASS ✓** |
| `/api/seller/orders` | `GET` | Seller / Artisan | Lấy danh sách đơn hàng chứa sản phẩm của xưởng | 200 OK | **PASS ✓** |
| `/api/seller/orders` | `PATCH` | Seller / Artisan | Nghệ nhân xác nhận đóng gói và chuyển giao bưu cục | 200 OK | **PASS ✓** |
| `/api/seller/register` | `POST` | Authenticated Buyer | Người mua đăng ký xưởng làng nghề và nhận quyền Seller | 200 OK | **PASS ✓** |
| `/api/cart` | `POST` / `GET` | Authenticated / Session | Thêm/xóa sản phẩm và đồng bộ giỏ hàng đa gian hàng | 200 OK | **PASS ✓** |
| `/api/checkout` | `POST` | Authenticated | Tạo đơn hàng mới từ giỏ hàng thực tế | 200 OK | **PASS ✓** |
| `/api/evidence/review` | `POST` | Verifier / Admin | Thẩm định và phê duyệt chứng cứ di sản làng nghề | 200 OK | **PASS ✓** |

---

## 3. CHI TIẾT BẢO VỆ ROUTE VÀ CƠ CHẾ FAIL-CLOSED

1. **Truy cập route `/admin` khi chưa đăng nhập:**
   - Hệ thống không làm sập ứng dụng hay lộ dữ liệu nội bộ.
   - Hiển thị banner bảo vệ: *"Khu Vực Quản Trị Hệ Thống"* với nút *"Đăng nhập Cổng Quản Trị"*, kèm URL đích `?next=/admin`.
2. **Truy cập route `/seller` khi là tài khoản Buyer:**
   - Tự động hiển thị form *"Mở Gian Hàng Làng Nghề"* (`SellerRegistrationForm`) cho phép đăng ký trực tiếp thông tin xưởng và liên kết với làng nghề Hà Nội thông qua `/api/seller/register`.
3. **Truy cập route `/trace/[publicCode]` với mã không tồn tại:**
   - Trả về trang 404 chuẩn, không làm lộ stack trace backend hay thông tin nhạy cảm.
4. **Truy cập route `/trace/CT-BTG-NVA-2026-0085`:**
   - Trả về đầy đủ Hộ chiếu di sản số chuẩn mực với dữ liệu thật, mô hình 3D xoay đáy tem QR và thông báo minh bạch OCOP.
