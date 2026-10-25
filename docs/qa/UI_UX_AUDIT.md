# BÁO CÁO KIỂM THỬ THIẾT KẾ VÀ TRẢI NGHIỆM NGƯỜI DÙNG (UI_UX_AUDIT.md)
**Dự án:** Hanoi CraftTrust – Hệ thống Nhận diện Thương hiệu & Đồng bộ UI/UX  
**Tiêu chuẩn thiết kế:** CraftTrust Unified Design System (Navy, Gold, Terracotta, Ivory, Surface)  
**Ngày kiểm thử:** 25/10/2026  
**Chuyên gia thực hiện:** Senior UI/UX Designer & Frontend Architect  

---

## 1. VẤN ĐỀ TRƯỚC KHI REFACTOR (BEFORE) VÀ GIẢI PHÁP ĐỒNG BỘ (AFTER)

### 1.1. Bảng so sánh Hiện trạng vs Chuẩn hóa

| Thành phần | Trước khi Refactor (Lỗi phát hiện) | Sau khi Refactor (Chuẩn hóa CraftTrust) | Đánh giá |
| :--- | :--- | :--- | :---: |
| **Admin Portal Palette** | Dùng theme hacker tối (`#0f172a`, `#1e293b`), nút bấm màu xanh dương neon (`#3b82f6`), hoàn toàn lệch tông với toàn sàn. | Đồng bộ tông màu CraftTrust: Nền Trắng ngà (`#fbf9f5`), Header Xanh Navy (`#0c2340`) viền chỉ Vàng kim (`#b89028`), Card nội dung trắng viền nâu ấm (`#e8e1d7`). | **PASS ✓** |
| **Admin Header & Logo** | Dùng header của buyer hoặc logo text thô sơ, không hiển thị chức danh quản trị. | Đặt `BrandLogo` chuẩn nhận diện với tag `"CỔNG QUẢN TRỊ HỆ THỐNG"`, chip trạng thái hệ thống (Database, 3D Worker, NFC Registry) và menu Admin chuyên nghiệp. | **PASS ✓** |
| **Admin Navigation Mobile** | Sidebar bị cố định (fixed width) che mất bảng dữ liệu trên thiết bị di động dưới 900px. | Triển khai Responsive Drawer Navigation với nút hamburger trên Header, backdrop làm mờ và nút đóng `X`. | **PASS ✓** |
| **Typography & Font Tiếng Việt** | Một số tiêu đề bảng bị vỡ chữ hoặc thiếu dấu khi hiển thị trên font hệ thống. | Chuẩn hóa font chữ tiếng Việt toàn hệ thống (hỗ trợ trọn vẹn `ă, â, đ, ê, ô, ơ, ư` và các dấu thanh điệu sắc, huyền, hỏi, ngã, nặng). | **PASS ✓** |
| **Seller Centre Shell** | Số liệu doanh thu và đơn hàng bị hardcode số ảo (32.500.000 ₫, 1.420 lượt xem), nút cập nhật trạng thái không liên kết backend. | Bảng điều khiển Seller đồng bộ Design Tokens của sàn, hiển thị số liệu doanh thu và đơn hàng thực tế từ DB, hỗ trợ nút thao tác chuyển trạng thái đơn hàng thời gian thực. | **PASS ✓** |

---

## 2. BẢNG MÀU VÀ DESIGN TOKENS CHUẨN CRAFTTRUST

Hệ thống token CSS dùng chung được áp dụng xuyên suốt 3 Application Shells:

```css
:root {
  /* Màu chủ đạo thương hiệu */
  --primary-navy: #0c2340;     /* Xanh Navy gốm men lam truyền thống */
  --accent-gold: #b89028;      /* Vàng đồng / Hoàng kim Thăng Long */
  --accent-terracotta: #c85a32;/* Cam đất / Đất nung Bát Tràng */
  
  /* Bề mặt & Không gian */
  --bg-ivory: #fbf9f5;         /* Nền trắng ngà mộc mạc dịu mắt */
  --surface-card: #ffffff;     /* Bề mặt card nội dung */
  --border-card: #e8e1d7;      /* Đường viền thẻ màu gốm mộc */
  
  /* Trạng thái */
  --badge-success-bg: #ecfdf5;
  --badge-success-text: #059669;
  --badge-warning-bg: #fefce8;
  --badge-warning-text: #a16207;
}
```

---

## 3. KIỂM THỬ TRẢI NGHIỆM TRÊN BA APPLICATION SHELLS ĐỘC LẬP

### 2.1. Buyer Marketplace Shell
- **Header:** Giữ nguyên search bar sản phẩm gốm sứ/thủ công, giỏ hàng đếm số lượng thực, dropdown ngôn ngữ (Tiếng Việt / English).
- **Trang truy xuất (`/trace/[code]`):** Thiết kế dạng *Digital Heritage Passport* sang trọng; người mua có thể xoay 360° xem con dấu triện QR ở đáy sản phẩm 3D, đọc câu chuyện làng nghề Bát Tràng và theo dõi 6 video công đoạn sản xuất.
- **Không nhầm lẫn:** Không bao giờ hiển thị menu Sidebar của Seller hoặc Admin trong giao diện Buyer.

### 2.2. Seller Centre Shell
- **Header:** Chuyên dụng cho nghệ nhân xưởng nghề, có nút chuyển nhanh sang *"Xem Sàn Mua Sắm"*, nút truy cập nhanh Cổng Quản Trị (nếu tài khoản có vai trò Admin).
- **Sidebar:** Danh mục quản trị: Tổng quan, Tất cả đơn hàng, Đơn cần xử lý, Quản lý sản phẩm, Studio 3D & AI Scan, Cài đặt vận chuyển gốm sứ chống vỡ, Kênh Voucher, Tài chính & Doanh thu.
- **Form đăng ký xưởng (`SellerRegistrationForm`):** Giao diện sạch sẽ, hỗ trợ người mua đăng ký xưởng mới chỉ trong 1 bước trực quan.

### 2.3. Admin Portal Shell
- **Header:** Nhãn hiệu nổi bật *"CỔNG QUẢN TRỊ HỆ THỐNG"*, huy hiệu các vai trò được cấp (`CUSTOMER · VERIFIER · ADMIN`).
- **Sidebar:** Điều hành sàn, Báo cáo GMV, Thẩm định chứng cứ Hộ chiếu, Kiểm duyệt sản phẩm & 3D, Quản lý gian hàng nghệ nhân, Quản trị đơn hàng toàn sàn, Nhật ký kiểm toán Audit Log.
- **Tính năng xác nhận:** Mọi thao tác kiểm duyệt sản phẩm, phê duyệt đơn hàng, kích hoạt gian hàng đều hiển thị phản hồi trạng thái rõ ràng, không có nút bấm giả.
