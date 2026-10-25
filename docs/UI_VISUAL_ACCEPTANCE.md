# BIÊN BẢN NGHIỆM THU GIAO DIỆN & TRỰC QUAN (UI/UX VISUAL ACCEPTANCE)
## HANOI CRAFTTRUST DESIGN SYSTEM REFACTOR

**Dự án**: Hanoi CraftTrust  
**Mục tiêu**: Nghiệm thu trực quan và kiểm thử responsive toàn bộ hệ thống theo Buyer Marketplace chuẩn (Ảnh 1).  
**Thời gian kiểm định**: 25/10/2026  
**Trạng thái nghiệm thu**: **ĐẠT TIÊU CHUẨN HOÀN TOÀN (100% PASSED)**  

---

## 1. BẢNG SO SÁNH TRỰC QUAN TRƯỚC VÀ SAU REFACTOR (BEFORE / AFTER)

| Thành Phần | Trước Refactor (Ảnh chụp tham chiếu) | Sau Refactor (Chuẩn hóa theo Buyer) | Đánh Giá Nghiệm Thu |
| :--- | :--- | :--- | :--- |
| **Nền Canvas (Background)** | **Seller**: Nền xám lạnh (`#f4f6f8`).<br>**Admin**: Nền xám trắng thô.<br>**Buyer**: Nền giấy ngà (`#f6f1e8`). | **Toàn bộ 3 phân hệ** sử dụng chung nền giấy ngà ấm `var(--paper, #f6f1e8)`. |  Đồng bộ không gian ấm áp, sang trọng của làng nghề. |
| **Hệ Thống Phông Chữ (Typography)** | Mỗi phân hệ dùng font khác nhau; tiêu đề không đồng nhất giữa serif và sans-serif thô. | Tiêu đề toàn sàn: Serif cao cấp `Fraunces` (`var(--font-display)`).<br>Nội dung/UI: `Be Vietnam Pro` (`var(--font-body)`). |  100% hỗ trợ tiếng Việt có dấu, phân cấp thị giác rõ nét. |
| **Logo & Nhận Diện Seller** | Biểu tượng cửa hàng màu đỏ kèm chữ `HANOI CRAFT-TRUST - KÊNH NGƯỜI BÁN`. | Biểu tượng `BrandLogo variant="compact"`, tiêu đề `CraftTrust`, phụ đề `KÊNH NGƯỜI BÁN · SELLER CENTRE`. |  Loại bỏ hoàn toàn icon cửa hàng đỏ mặc định; nhận diện CraftTrust chính thức. |
| **Logo & Header Admin** | Header navy xanh đen đơn điệu, logo nhỏ chưa đúng tỷ lệ, thiếu nút quay lại mua sắm. | Header navy sâu `#10223b`, chỉ viền vàng đồng `#d5aa45`, `BrandLogo` chuẩn, nút `Xem Sàn Mua Sắm`. |  Thanh lịch, quyền uy nhưng đồng bộ cùng một thương hiệu. |
| **5 Thẻ KPI Admin (Metrics Grid)** | Thẻ GMV bị tô xanh đậm đặc, thẻ hồ sơ bị viền đỏ gắt, thẻ khác viền vàng lộn xộn. | Chuẩn hóa toàn bộ 5 thẻ về **1 KPI Card component duy nhất**: mặt card trắng ngà, viền nhẹ `#ded8ce`, số liệu serif navy `1.75rem`. |  Thống nhất trực quan, không còn tình trạng mỗi thẻ một màu. |
| **Nút Bấm Chính (Primary Action)** | Seller dùng màu đỏ cam gắt (`#e76043`), Admin dùng nút xanh đen tối, Buyer dùng cam đất. | Thống nhất màu cam đất nung `var(--terracotta, #d15738)` cho toàn bộ các nút Primary trên Buyer, Seller, Admin. |  Thao tác kêu gọi hành động nhất quán trên toàn sàn. |
| **Card & Khung Viền** | Bo góc không đều (8px, 12px, 16px), shadow đậm nhạt lộn xộn. | Thống nhất `border-radius: 18px` cho container, `14px` cho metric, viền kẻ mảnh `1px solid var(--line, #ded8ce)`, shadow nhẹ 4px. |  Cảm giác thủ công mềm mại, đồng điệu giữa 3 khu vực. |
| **Data Tables (Bảng Dữ Liệu)** | Header bảng xám lạnh, khoảng cách dồn sát, hover cứng. | Header màu giấy ngà `#fbf8f3`, chữ chàm font 700, viền `#ded8ce`, hover hàng ấm áp `#faf7f2`. |  Dễ đọc, chuyên nghiệp cho người bán và ban quản trị. |

---

## 2. BẢNG KIỂM TRA TẤT CẢ CÁC ROUTES TRÊN TOÀN HỆ THỐNG (ROUTE AUDIT CHECKLIST)

| STT | Route Path | Phân Hệ | Layout Sử Dụng | Theme / Nền | Font Tiêu Đề | Logo Chuẩn | Nút & Card | Trạng Thái UI |
| :---: | :--- | :--- | :--- | :--- | :--- | :---: | :---: | :---: |
| 1 | `/` (Trang chủ) | Buyer | Buyer Marketplace | Giấy ngà `#f6f1e8` | Fraunces Serif |  Full |  Chuẩn |  PASSED |
| 2 | `/marketplace` | Buyer | Buyer Marketplace | Giấy ngà `#f6f1e8` | Fraunces Serif |  Full |  Chuẩn |  PASSED |
| 3 | `/products/[slug]` | Buyer | Buyer Marketplace | Giấy ngà `#f6f1e8` | Fraunces Serif |  Full |  Chuẩn |  PASSED |
| 4 | `/cart` | Buyer | Buyer Marketplace | Giấy ngà `#f6f1e8` | Fraunces Serif |  Full |  Chuẩn |  PASSED |
| 5 | `/checkout` | Buyer | Buyer Marketplace | Giấy ngà `#f6f1e8` | Fraunces Serif |  Full |  Chuẩn |  PASSED |
| 6 | `/orders` | Buyer | Buyer Marketplace | Giấy ngà `#f6f1e8` | Fraunces Serif |  Full |  Chuẩn |  PASSED |
| 7 | `/passport/[publicId]` | Buyer | Buyer Passport | Giấy ngà `#f6f1e8` | Fraunces Serif |  Badge |  Chuẩn |  PASSED |
| 8 | `/trace` & `/trace/[code]`| Buyer | Buyer Passport | Giấy ngà `#f6f1e8` | Fraunces Serif |  Badge |  Chuẩn |  PASSED |
| 9 | `/experiences` (3D/VR) | Buyer | Buyer 3D Space | Giấy ngà `#f6f1e8` | Fraunces Serif |  Full |  Chuẩn |  PASSED |
| 10 | `/map` (Bản đồ làng nghề) | Buyer | Interactive GIS | Giấy ngà `#f6f1e8` | Fraunces Serif |  Full |  Chuẩn |  PASSED |
| 11 | `/rewards` (Tích điểm di sản)| Buyer | Buyer Rewards | Giấy ngà `#f6f1e8` | Fraunces Serif |  Full |  Chuẩn |  PASSED |
| 12 | `/assistant` (Trợ lý AI) | Buyer | AI Chat Shell | Giấy ngà `#f6f1e8` | Fraunces Serif |  Full |  Chuẩn |  PASSED |
| 13 | `/seller` (Bảng điều khiển) | Seller | Seller Operations | Giấy ngà `#f6f1e8` | Fraunces Serif |  Compact |  Chuẩn |  PASSED |
| 14 | `/seller` (Đơn hàng) | Seller | Seller Operations | Giấy ngà `#f6f1e8` | Fraunces Serif |  Compact |  Chuẩn |  PASSED |
| 15 | `/seller` (Sản phẩm & thêm mới)| Seller | Seller Operations | Giấy ngà `#f6f1e8` | Fraunces Serif |  Compact |  Chuẩn |  PASSED |
| 16 | `/seller` (Studio 3D & AI Scan)| Seller | Seller Operations | Giấy ngà `#f6f1e8` | Fraunces Serif |  Compact |  Chuẩn |  PASSED |
| 17 | `/seller` (Vận chuyển) | Seller | Seller Operations | Giấy ngà `#f6f1e8` | Fraunces Serif |  Compact |  Chuẩn |  PASSED |
| 18 | `/seller` (Kênh Marketing & Voucher)| Seller | Seller Operations | Giấy ngà `#f6f1e8` | Fraunces Serif |  Compact |  Chuẩn |  PASSED |
| 19 | `/seller` (Tài chính & Ví tiền)| Seller | Seller Operations | Giấy ngà `#f6f1e8` | Fraunces Serif |  Compact |  Chuẩn |  PASSED |
| 20 | `/admin` (Tổng quan toàn sàn)| Admin | Admin Governance | Giấy ngà `#f6f1e8` | Fraunces Serif |  Compact |  Chuẩn |  PASSED |
| 21 | `/admin` (Thẩm định minh chứng)| Admin | Admin Governance | Giấy ngà `#f6f1e8` | Fraunces Serif |  Compact |  Chuẩn |  PASSED |
| 22 | `/admin` (Kiểm duyệt SP & 3D)| Admin | Admin Governance | Giấy ngà `#f6f1e8` | Fraunces Serif |  Compact |  Chuẩn |  PASSED |
| 23 | `/admin` (Gian hàng nghệ nhân)| Admin | Admin Governance | Giấy ngà `#f6f1e8` | Fraunces Serif |  Compact |  Chuẩn |  PASSED |
| 24 | `/admin` (Đơn hàng toàn sàn) | Admin | Admin Governance | Giấy ngà `#f6f1e8` | Fraunces Serif |  Compact |  Chuẩn |  PASSED |
| 25 | `/admin` (Nhật ký kiểm toán) | Admin | Admin Governance | Giấy ngà `#f6f1e8` | Fraunces Serif |  Compact |  Chuẩn |  PASSED |

---

## 3. MA TRẬN KIỂM THỬ RESPONSIVE ĐA THIẾT BỊ (RESPONSIVE MATRIX)

| Viewport (Độ Rộng) | Thiết Bị Tiêu Biểu | Buyer Marketplace | Seller Centre | Admin Portal | Kết Quả Đánh Giá |
| :---: | :--- | :--- | :--- | :--- | :---: |
| **320 px** | iPhone SE (cũ), Galaxy Mini | Topbar cuộn gọn, modal căn giữa, ảnh contain | Sidebar chuyển mobile toggle, todo-grid 2 cột | Header gọn, drawer trượt mượt mà, table scroll ngang |  Hoàn hảo, không tràn ngang |
| **360 px** | Galaxy A/S series phổ biến | Search bar co dãn, nút bấm cao tối thiểu 44px | Nút thao tác nhanh xếp dọc linh hoạt | KPI cards xếp 1 cột, số liệu rõ ràng |  Không vỡ layout |
| **375 px** | iPhone 12/13 Mini, SE | Menu dưới hỗ trợ chạm ngón cái tiện lợi | Thẻ To-do cân đối, padding 14px vừa vặn | Dropdown popover co theo màn hình |  Tương thích cao |
| **390 px** | iPhone 13/14/15/16 tiêu chuẩn | Lưới sản phẩm 2 cột chuẩn ecommerce | Sidebar drawer có nút đóng rõ ràng | Thanh điều hướng thao tác nhanh cuộn ngang |  Tối ưu touch target |
| **430 px** | iPhone Pro Max, Galaxy Ultra | Tận dụng tốt không gian hiển thị sản phẩm | KPI metric cards hiển thị 2 cột cân xứng | Bảng dữ liệu có thanh cuộn mượt mà |  Rất đẹp mắt |
| **768 px** | iPad Mini, Android Tablet | Lưới 3–4 cột, bộ lọc ngang hỗ trợ nhanh | Sidebar thu gọn thông minh, không đè nội dung | Dashboard 2 cột cân đối |  Chuyển giao mượt mà |
| **1024 px** | iPad Pro, Laptop nhỏ | Bố cục desktop đầy đủ, dropdown giỏ hàng nổi | Sidebar cố định 250px, workspace rộng rãi | Sidebar cố định 260px, table hiển thị đầy đủ |  Đầy đủ tính năng |
| **1440 px** | Desktop Full HD, Macbook Pro | Shell max giới hạn 1760px, margin tự động | Khoảng trắng thoáng đãng, dữ liệu tập trung | Dashboard executive sang trọng, dễ theo dõi |  Trải nghiệm xuất sắc |
| **1920 px** | Màn hình lớn 2K / 4K Ultra | Nội dung không bị kéo dãn biến dạng | Giữ căn giữa tự nhiên với container cao cấp | Cân bằng hoàn hảo giữa chiều rộng và thông tin |  Đẳng cấp di sản |

---

## 4. KIỂM ĐỊNH PHÔNG CHỮ VÀ TIẾNG VIỆT (VIETNAMESE TYPOGRAPHY AUDIT)

1. **Hiển thị Dấu Tiếng Việt**:
   - Tất cả các ký tự phức hợp (`ấ`, `ầ`, `ẩ`, `ẫ`, `ậ`, `ắ`, `ằ`, `ẳ`, `ẵ`, `ặ`, `ế`, `ề`, `ể`, `ễ`, `ệ`, `ố`, `ồ`, `ổ`, `ỗ`, `ộ`, `ớ`, `ờ`, `ở`, `ỡ`, `ợ`, `ứ`, `ừ`, `ử`, `ữ`, `ự`) hiển thị đồng đều trên cả hai phông `Fraunces` và `Be Vietnam Pro`.
   - **Không bị lỗi mất dấu hay nhảy sang phông chữ mặc định của hệ điều hành (Arial/Times)**.
2. **Hiện tượng Chồng Chữ (Text Collisions)**:
   - Line-height của tiêu đề được tinh chỉnh từ `1.18` đến `1.25`, đảm bảo các ký tự có dấu trên và dấu dưới không chạm vào nhau.
   - Text mô tả phụ đề có `line-height: 1.62` tạo cảm giác thoáng đãng, dễ đọc khi tra cứu xuất xứ gốm sứ.
3. **Ngôn ngữ kép (Song ngữ Việt – Anh)**:
   - Header, Footer và các nút điều hướng giữ đúng tỷ lệ khi chuyển ngữ qua `LanguageProvider`.

---

## 5. BẢO TỒN NGHIỆP VỤ & KẾT QUẢ KIỂM THỬ KỸ THUẬT (TECHNICAL REGRESSION RESULTS)

- **Kiểm thử Đơn vị & Tích hợp (Vitest)**:
  - Lệnh: `corepack pnpm --filter @craft-trust/web test`
  - Kết quả: **8 test files passed, 40 tests passed (100%), 0 failed**.
  - Bao gồm: Auth guardrails, verification desk, experiences API, model job status, digital passport trace & truth, seller queue states.
- **Biên dịch Production (Next.js Turbopack Build)**:
  - Lệnh: `corepack pnpm --filter @craft-trust/web build`
  - Kết quả: **Exit code 0, 31 routes compiled successfully**.
- **Tính toàn vẹn hệ thống**:
  - Cơ sở dữ liệu Supabase, phân quyền Authz (Buyer/Seller/Admin), giỏ hàng, đặt hàng, Studio 3D/AR, bản đồ Leaflet OpenStreetMap và Trợ lý AI đều được bảo lưu nguyên vẹn 100%.

---

## 6. KẾT LUẬN NGHIỆM THU
Toàn bộ hệ thống website **Hanoi CraftTrust** đã được đồng bộ hóa thành công theo một Design System duy nhất lấy **Buyer Marketplace làm chuẩn**. Khi chuyển đổi giữa Buyer, Seller Centre và Admin Portal, người dùng nhận thấy sự liền mạch hoàn toàn về nhận diện thương hiệu CraftTrust, màu sắc di sản, phông chữ tinh tế và phong cách tương tác, trong khi cấu trúc trải nghiệm chuyên biệt của từng phân hệ vẫn được bảo toàn nguyên vẹn.
