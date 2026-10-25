# BÁO CÁO AUDIT DESIGN SYSTEM – HANOI CRAFTTRUST

**Dự án**: Hanoi CraftTrust  
**Mục tiêu**: Chuẩn hóa Design System toàn diện theo Buyer Marketplace chuẩn (Ảnh 1) cho Buyer Marketplace, Seller Centre và Admin Portal.  
**Ngày thực hiện**: 25/10/2026  
**Phiên bản**: v2.1.0 Design System Refactor  

---

## 1. TỔNG QUAN VÀ NGUYÊN TẮC THIẾT KẾ (DESIGN FOUNDATION)

### 1.1. Chuẩn Thiết Kế Gốc (Single Source of Truth)
Giao diện **Buyer Marketplace** được xác định là chuẩn thiết kế duy nhất cho toàn bộ hệ sinh thái số của Hanoi CraftTrust.
- **Phong cách chủ đạo**: *Modern Vietnamese Heritage Commerce* (Thương mại thủ công di sản Việt Nam hiện đại, sang trọng, thanh lịch, tinh tế).
- **Nguyên tắc cốt lõi**:
  - **Design System dùng chung**: Dùng chung toàn bộ Design Tokens (màu sắc, typography, radii, shadows, spacing) và Shared UI Primitives.
  - **Bố cục giao diện tách biệt (Separated Application Layouts)**:
    - *Buyer Marketplace*: Ecommerce layout chuẩn (Header tìm kiếm ngành hàng, category nav, hero banner, product grid, giỏ hàng, footer di sản).
    - *Seller Centre*: Merchant operations layout (Header người bán, sidebar nghiệp vụ xưởng nghệ nhân, KPI vận hành đơn hàng, quản lý sản phẩm, Studio 3D).
    - *Admin Portal*: System governance layout (Header xanh navy đậm viền vàng đồng, sidebar phân quyền verifier/admin, executive KPI cards, audit logs, kiểm duyệt xuất xứ).

---

## 2. TRÍCH XUẤT DESIGN TOKENS TỪ BUYER MARKETPLACE

### 2.1. Color Palette (Hệ Màu Thương Hiệu)

| Token Name | Mã Màu (Hex / CSS) | Vai Trò & Ngữ Cảnh Sử Dụng |
| :--- | :--- | :--- |
| `--indigo-dark` / Primary Dark | `#10223b` / `#0b263b` | Màu xanh navy đậm nhận diện thương hiệu, header Admin, text heading chính, nút chuyển vùng. |
| `--indigo` / Primary Navy | `#153b5b` | Xanh navy truyền thống, phụ đề thương hiệu, viền active, các liên kết quan trọng. |
| `--terracotta` / Primary Accent | `#d15738` / `#e76043` | Màu cam đất nung thủ công. Sử dụng cho tất cả nút bấm chính (Primary Button), focus ring, active badge, highlight trạng thái. |
| `--gold` / Heritage Gold Accent | `#d5aa45` / `#c89d43` | Màu vàng đồng gốm men hoàng gia. Dùng làm điểm nhấn viền Admin, huy hiệu di sản, border accent có kiểm soát. |
| `--paper` / Canvas Base | `#f6f1e8` | Màu nền trắng ngà ấm tự nhiên (giấy điệp/lụa tơ tằm). Thay thế hoàn toàn nền xám lạnh (`#f4f6f8`) ở Seller & Admin. |
| `--paper-deep` / Canvas Muted | `#ebe3d6` | Nền thứ cấp cho các thanh công cụ, dải phân cách nhẹ. |
| `--surface` / Card Surface | `#ffffff` / `#fffdf8` | Nền trắng ngà cho tất cả Card, Container, Data Table, Modal, Popover. |
| `--line` / Border Line | `#ded8ce` / `#d9d3c7` | Viền kẻ mảnh, ấm áp, tinh tế 1px cho card, table row, input. |
| `--ink` / Text Primary | `#172c35` | Màu mực đen chàm đậm, độ tương phản cao, dễ đọc trên nền giấy ngà. |
| `--muted` / Text Muted | `#64748b` / `#66777b` | Màu chữ phụ, mô tả phụ đề, helper text. |
| `--leaf` / Success Heritage | `#08736b` | Màu xanh lá men ngọc (Celadon), dùng cho trạng thái thành công, verified, tăng trưởng dương. |

### 2.2. Typography System (Hệ Thống Phông Chữ)
- **Font Tiêu Đề (Headings & Display)**:
  - Font: `Fraunces` (Google Font, hỗ trợ Tiếng Việt đầy đủ, trục font serif cổ điển sang trọng).
  - CSS Variable: `var(--font-display, "Playfair Display", "Fraunces", Georgia, serif)`.
  - Ứng dụng: H1–H6, Brand Titles, Card Headings, Dashboard Section Titles, KPI Metric Values.
- **Font Nội Dung & Giao Diện (Body & UI)**:
  - Font: `Be Vietnam Pro` (Google Font thiết kế riêng cho ngôn ngữ Tiếng Việt, hiển thị sắc nét mọi kích thước).
  - CSS Variable: `var(--font-body, "Be Vietnam Pro", system-ui, sans-serif)`.
  - Ứng dụng: Navigation, Sidebar menu, Button labels, Form labels, Inputs, Table data, Body copy, Tooltips.

### 2.3. Radius, Elevation & Shadows
- **Card Radius**: `border-radius: 18px` (Container chính), `border-radius: 14px` (Metric/KPI Card).
- **Button Radius**: `border-radius: 10px` (nút lớn), `border-radius: 8px` (nút trung bình), `border-radius: 999px` (Pill button/tag).
- **Input Radius**: `border-radius: 10px`, padding `10px 14px`, viền `1.5px solid var(--line)`, focus terracotta `3px ring`.
- **Elevation Shadow**:
  - Subtle Surface: `box-shadow: 0 4px 20px rgba(16, 34, 59, 0.04)` (Card tiêu chuẩn).
  - Floating Popover/Modal: `box-shadow: 0 16px 36px rgba(16, 34, 59, 0.14)`.
  - Hover Elevate: `transform: translateY(-2px); box-shadow: 0 8px 24px rgba(16, 34, 59, 0.08)`.

---

## 3. CHUẨN HÓA LOGO & NHẬN DIỆN THƯƠNG HIỆU

### 3.1. Quy Chuẩn Logo CraftTrust
- **Logo Chính thức**: `BrandLogo` trích xuất từ `/brand/full.png` và `/brand/icon-*.png`.
  - Slogan thương hiệu: *Mỗi lần mua một lần về làng*.
  - Tên thương hiệu: **CraftTrust**.
  - Tên nền tảng: **Hanoi CraftTrust**.
- **Điều chỉnh tại Kênh Người Bán (Seller Centre)**:
  - **Trước refactor**: Biểu tượng cửa hàng màu đỏ kèm chữ thô `HANOI CRAFT-TRUST - KÊNH NGƯỜI BÁN`.
  - **Sau refactor**: Sử dụng biểu tượng chính thức `BrandLogo variant="compact"`, tiêu đề serif `CraftTrust`, phụ đề cam đất `KÊNH NGƯỜI BÁN · SELLER CENTRE`.
- **Điều chỉnh tại Cổng Quản Trị (Admin Portal)**:
  - **Trước refactor**: Icon logo nhỏ mất cân đối, tiêu đề chưa có phân cấp chuẩn.
  - **Sau refactor**: Sử dụng `BrandLogo variant="compact"`, tiêu đề serif trắng `CraftTrust Admin Portal`, phụ đề vàng đồng `CỔNG QUẢN TRỊ HỆ THỐNG`, nút liên kết `Xem Sàn Mua Sắm`.

---

## 4. CHI TIẾT REFACTOR THEO TỪNG PHÂN HỆ

### 4.1. Seller Centre (Kênh Người Bán)
1. **Nền và Bố cục**:
   - Chuyển toàn bộ nền từ xám lạnh `#f4f6f8` sang nền trắng ngà ấm `var(--paper, #f6f1e8)`.
   - Màu chữ đồng bộ sang `var(--ink, #172c35)`.
2. **Header Người Bán**:
   - Nền trắng tinh tế với đường kẻ `1px solid var(--line, #ded8ce)`.
   - Thanh tìm kiếm nhanh chức năng với icon search, border ấm và viền focus cam đất `var(--terracotta)`.
   - Nút `Xem Sàn Mua Sắm` mở tab mới đồng bộ style với Buyer.
3. **Sidebar Nghiệp Vụ**:
   - Item active chuyển sang nền cam đất nhạt `#fff5f0`, chữ `var(--terracotta, #d15738)`, viền trái `3px solid var(--terracotta)`.
   - Nhóm danh mục `TỔNG QUAN`, `QUẢN LÝ ĐƠN HÀNG`, `QUẢN LÝ SẢN PHẨM`, `VẬN CHUYỂN`, `KÊNH MARKETING`, `TÀI CHÍNH` có typography rõ ràng, không xuống dòng lỗi.
4. **Dashboard & KPI Cards**:
   - Thẻ `Danh Sách Cần Làm` (To-do grid): 4 ô việc cần làm với số đếm font serif, hover nhấc thẻ nhẹ và viền cam đất.
   - Thẻ `Business Analytics` (Doanh thu, Đơn hàng, Sản phẩm, 3D): Chuẩn hóa theo KPI card trắng, border ấm, số liệu font `Fraunces` màu navy đậm.
   - Nút thao tác nhanh `Đăng Sản Phẩm Mới`, `Mở Studio 3D & AI Scan`, `Tạo Mã Giảm Giá` dùng chung button tokens.
5. **Data Table**:
   - Thead màu giấy ngà `#fbf8f3`, chữ chàm đậm font 700.
   - Td viền mảnh `#f2ede4`, hover hàng mềm mại `#faf7f2`.

### 4.2. Admin Portal (Cổng Quản Trị)
1. **Header Quản Trị**:
   - Nền xanh navy sâu `var(--indigo-dark, #10223b)` đồng bộ với phần chân trang và banner Buyer.
   - Viền vàng đồng `2px solid var(--gold, #d5aa45)`.
   - Bổ sung nút `Xem Sàn Mua Sắm` (`/marketplace`).
2. **Sidebar Điều Hành**:
   - Nền trắng sáng, border phải `var(--line, #ded8ce)`.
   - Menu item active có nền `var(--indigo-dark, #10223b)`, viền trái vàng đồng `3px solid var(--gold)` và icon vàng kim.
3. **Chuẩn Hóa 5 KPI Cards Thành Một Component Thống Nhất**:
   - **Trước refactor**: Card GMV bị đổ màu xanh navy đặc toàn bộ, card hồ sơ chờ thẩm định màu đỏ gắt, card khác viền vàng lộn xộn.
   - **Sau refactor**: Cả 5 KPI cards (*Tổng GMV toàn sàn, Gian hàng nghệ nhân, Hồ sơ chờ thẩm định, Hộ chiếu di sản số, Quỹ bảo tồn nghề*) đều có nền trắng surface đồng nhất, viền `1px solid var(--line)`, số đếm font serif `Fraunces` màu navy đậm `1.75rem`, icon đồng bộ và phụ đề thống nhất.
4. **Khu Vực Nội Dung Quản Trị**:
   - `Cụm Làng Nghề Truyền Thống Hà Nội`: Thanh tiến trình tỷ lệ màu terracotta với track viền ngà.
   - `Nhật Ký Thao Tác Hệ Thống (Audit Logs)`: Dấu chấm trạng thái gọn gàng, nút xem tất cả chuẩn hóa.
   - Bảng đơn hàng, kiểm duyệt minh chứng xuất xứ, kiểm duyệt sản phẩm 3D dùng chung Shared Table component.

---

## 5. DANH SÁCH FILE VÀ COMPONENT ĐÃ REFACTOR

| File Path | Nội Dung Thay Đổi |
| :--- | :--- |
| `apps/web/app/globals.css` | Chuẩn hóa toàn bộ CSS Seller Centre (lines 6646–7260) và Admin Portal (lines 7472–7965) theo Buyer Design Tokens. |
| `apps/web/app/upgrade.css` | Modal Passport trung tâm, containment cho toàn bộ ảnh sản phẩm, backdrop blur, layout responsive. |
| `apps/web/components/seller/seller-header.tsx` | Thay icon store đỏ bằng `BrandLogo variant="compact"`, cập nhật tên thương hiệu CraftTrust. |
| `apps/web/components/seller/seller-registration-form.tsx` | Thay icon store bằng `BrandLogo variant="compact"`, cập nhật tên nền tảng `Hanoi CraftTrust`. |
| `apps/web/components/seller/seller-centre-view.tsx` | Chuẩn hóa quy chuẩn bọc hàng Hanoi CraftTrust, card và bảng biểu. |
| `apps/web/components/admin/admin-header.tsx` | Cập nhật tên `CraftTrust Admin Portal`, phụ đề vàng đồng, thêm nút `Xem Sàn Mua Sắm`. |
| `apps/web/components/admin/admin-portal-view.tsx` | Chuẩn hóa 5 KPI cards về cùng 1 component duy nhất với icon và typography đồng nhất. |
| `apps/web/app/seller/layout.tsx` | Metadata title chuẩn hóa: `Kênh Người Bán · CraftTrust Seller Centre`. |
| `apps/web/app/admin/layout.tsx` | Metadata title chuẩn hóa: `Cổng Quản Trị Hệ Thống · CraftTrust Admin Portal`. |
| `apps/web/app/seller/page.tsx` | Eyebrow brand unauthorized: `Hanoi CraftTrust · Kênh Người Bán`. |
| `apps/web/app/admin/page.tsx` | Eyebrow brand unauthorized: `Hanoi CraftTrust · Cổng Quản Trị Hệ Thống`. |
