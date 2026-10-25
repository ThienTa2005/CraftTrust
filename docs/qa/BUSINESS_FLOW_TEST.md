# BÁO CÁO KIỂM THỬ CÁC LUỒNG NGHIỆP VỤ THƯƠNG MẠI & DI SẢN (BUSINESS_FLOW_TEST.md)
**Dự án:** Hanoi CraftTrust – E-commerce & Heritage Business Lifecycles  
**Ngày kiểm thử:** 25/10/2026  
**Chuyên gia thực hiện:** E-commerce System Architect & QA Lead  

---

## 1. LUỒNG ĐĂNG KÝ VÀ KÍCH HOẠT XƯỞNG NGƯỜI BÁN (SELLER ONBOARDING)
- **Kịch bản:** Người dùng có tài khoản Buyer muốn mở xưởng gốm làng nghề.
- **Các bước thực hiện:**
  1. Người dùng truy cập `/seller`. Giao diện nhận diện tài khoản chưa có hồ sơ xưởng và hiển thị `SellerRegistrationForm`.
  2. Người dùng nhập:
     - Tên xưởng: *Xưởng Gốm Mỹ Nghệ Bát Tràng Bảo Long*
     - Làng nghề: Chọn *Làng gốm Bát Tràng (Gia Lâm)*
     - Số năm kinh nghiệm: *15 năm*
     - Mô tả: *Chuyên vuốt tay men lam và men tro trấu tự nhiên.*
  3. Gửi form $\rightarrow$ API `POST /api/seller/register` tiếp nhận.
  4. Hệ thống tạo bản ghi trong bảng `artisans`, gán `owner_id = user.id`, và tự động cấp quyền `seller` + `artisan` vào bảng `user_roles`.
  5. Trang tự động tải lại và đưa người dùng vào Kênh Người Bán (`SellerCentreView`) với đầy đủ chức năng quản lý xưởng, đăng sản phẩm và Studio 3D.
- **Kết quả:** **PASS ✓**

---

## 2. LUỒNG ĐĂNG BÁN VÀ PHÊ DUYỆT SẢN PHẨM (PRODUCT MODERATION)
- **Kịch bản:** Người bán tạo sản phẩm mới và Admin kiểm duyệt trước khi hiển thị trên sàn thương mại điện tử.
- **Các bước thực hiện:**
  1. Seller vào Kênh Người Bán $\rightarrow$ Tab *Studio 3D & AI Scan*.
  2. Seller nhập tên sản phẩm, giá bán, số lượng tồn kho, hình ảnh và tạo mô hình 3D.
  3. Sản phẩm được khởi tạo ở trạng thái `draft`.
  4. Quản trị viên truy cập Cổng Quản Trị (`/admin`) $\rightarrow$ Tab *Kiểm Duyệt Sản Phẩm*.
  5. Quản trị viên xem xét kích thước, ảnh chụp, thông tin chất liệu và bấm nút *"Phê duyệt mở bán"*.
  6. API `PATCH /api/admin/products` cập nhật trạng thái sản phẩm sang `active` trong database và ghi nhận sự kiện vào `audit_events`.
  7. Sản phẩm xuất hiện ngay lập tức trên Marketplace của Buyer (`/marketplace`) và trang chi tiết (`/products/[slug]`).
- **Nếu bị từ chối:** Quản trị viên bấm *"Tạm chuyển nháp"*, sản phẩm lập tức ẩn khỏi sàn thương mại điện tử.
- **Kết quả:** **PASS ✓**

---

## 3. LUỒNG ĐẶT HÀNG, ĐÓNG GÓI VÀ HOÀN TẤT ĐƠN HÀNG (ORDER LIFECYCLE)
- **Kịch bản:** Người mua chọn sản phẩm, tiến hành thanh toán, Seller đóng gói và Admin giám sát quỹ ký quỹ Escrow.
- **Các bước thực hiện:**
  1. Buyer thêm sản phẩm vào giỏ hàng (`/cart`) $\rightarrow$ Tiến hành thanh toán tại `/checkout`.
  2. Đơn hàng được tạo thành công trong bảng `orders` ở trạng thái ban đầu `placed` (Chờ xác nhận).
  3. Các dòng sản phẩm được ghi vào `order_items` với đúng giá đơn vị và số lượng.
  4. **Tại Kênh Người Bán (`/seller`):**
     - Đơn hàng xuất hiện trong danh sách *"Cần Làm"* (Chờ Xác Nhận).
     - Seller kiểm tra địa chỉ và bấm *"Xác nhận đóng gói"*.
     - API `PATCH /api/seller/orders` cập nhật trạng thái đơn thành `processing`.
     - Seller đóng gói chống sốc 3 lớp gốm sứ và bấm *"Giao bưu cục"*. Trạng thái chuyển sang `fulfilled`.
  5. **Tại Cổng Quản Trị (`/admin`):**
     - Quản trị viên theo dõi toàn bộ đơn hàng trong tab *Giám Sát Đơn Hàng & Vận Chuyển Toàn Sàn*.
     - Cơ chế Ký quỹ Escrow hiển thị tổng số tiền tạm giữ an toàn cho đến khi đơn hàng hoàn tất.
- **Kết quả:** **PASS ✓**
