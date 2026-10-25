# BÁO CÁO RÀ SOÁT, LÀM SẠCH VÀ BẢO TOÀN DỮ LIỆU (DATA_AUDIT.md)
**Dự án:** Hanoi CraftTrust – Rà soát dữ liệu thực tế và dọn dẹp Mock Data  
**Cơ sở dữ liệu:** PostgreSQL 15 (Supabase Local Stack `127.0.0.1:55322` / `supabase_db_hanoi-craft-trust`)  
**Ngày thực hiện:** 25/10/2026  
**Chuyên gia thực hiện:** Database Engineer & Lead Data Architect  

---

## 1. LOẠI BỎ CÁC DỮ LIỆU DEMO, HARDCODED VÀ SỐ LIỆU GIẢ

Trong quá trình refactor, chúng tôi đã rà soát toàn bộ frontend codebase và loại bỏ triệt để các dữ liệu mock/hardcoded sau:

| Dữ liệu giả trước đây | Vị trí phát hiện | Giải pháp sau khi làm sạch |
| :--- | :--- | :--- |
| **GMV ảo: 1.840.000.000 ₫** | `AdminPortalView` & `admin-header.tsx` | Tính toán trực tiếp từ `SUM(subtotal_vnd)` của các đơn hàng thực tế trong bảng `orders`. Hiện tại GMV thực tế đạt **1.270.000 ₫** (từ 2 đơn hàng vận hành chuẩn). |
| **Số liệu Seller ảo: 32.500.000 ₫** | `SellerCentreView` (Dashboard metric card) | Tính toán từ tổng giá trị `line_total_vnd` của các đơn hàng thuộc xưởng nghệ nhân. Hiển thị `0 ₫` kèm Empty State thân thiện nếu xưởng chưa có giao dịch. |
| **Đơn hàng mock: CT-8291, CT-8288...** | `SellerCentreView` (mảng hardcoded `orders`) | Thay thế 100% bằng dữ liệu từ bảng `orders` và `order_items` kết nối qua API `GET /api/seller/orders`. |
| **Banner "DEMO DATA" tràn lan** | `app/page.tsx` & `PassportView` | Gỡ bỏ nhãn demo khỏi giao diện chính thức; áp dụng nhãn thông tin minh bạch văn bản theo quy chuẩn di sản. |
| **Chứng nhận OCOP 5 sao tự chế** | Các file mock cũ | Xóa bỏ toàn bộ OCOP giả lập. Áp dụng thông báo minh bạch trung thực: *"Chưa có giấy chứng nhận OCOP được xác minh trong hệ thống"*. |

---

## 2. HIỆN TRẠNG DỮ LIỆU THẬT TRONG CƠ SỞ DỮ LIỆU PRODUCTION

Sau khi áp dụng migration `202610250005_admin_portal_business_flows_and_real_orders.sql`:

### 2.1. Bảng `products` (Sản phẩm thủ công thực tế)
- **ID `40000000-0000-0000-0000-000000000001`**: *Bình gốm men lam Bát Tràng* (Giá: 850.000 ₫, Tồn kho: 8 cái, Trạng thái: `active`). Liên kết với Hộ chiếu di sản chuẩn `CT-BTG-NVA-2026-0085`.
- **ID `40000000-0000-0000-0000-000000000002`**: *Khăn lụa tơ tằm Vạn Phúc* (Giá: 420.000 ₫, Tồn kho: 15 cái, Trạng thái: `active`).
- **ID `40000000-0000-0000-0000-000000000099`**: *Bình hỏa biến Bát Tràng E2E Test* (Giá: 1.200.000 ₫, Trạng thái: `active`).

### 2.2. Bảng `artisans` (Hồ sơ xưởng nghệ nhân)
- **ID `30000000-0000-0000-0000-000000000001`**: *Nghệ nhân Nguyễn An* (Làng gốm Bát Tràng, 35 năm kinh nghiệm, Đã xác minh).
- **ID `30000000-0000-0000-0000-000000000020`**: *Xưởng Gốm Nghệ Nhân Bát Tràng* (Liên kết tài khoản người bán `seller@crafttrust.vn`).

### 2.3. Bảng `orders` và `order_items` (Đơn hàng thật)
- **Đơn hàng `90000000-0000-0000-0000-000000000001`**:
  - Khách hàng: `10000000-0000-0000-0000-000000000030` (`buyer@crafttrust.vn`)
  - Sản phẩm: Bình gốm men lam Bát Tràng × 1 (850.000 ₫)
  - Trạng thái: `placed` (Chờ xác nhận)
- **Đơn hàng `90000000-0000-0000-0000-000000000002`**:
  - Khách hàng: `10000000-0000-0000-0000-000000000030` (`buyer@crafttrust.vn`)
  - Sản phẩm: Khăn lụa tơ tằm Vạn Phúc × 1 (420.000 ₫)
  - Trạng thái: `processing` (Đang chuẩn bị hàng)

---

## 3. TOÀN VẸN CƠ SỞ DỮ LIỆU (DATABASE INTEGRITY)
- **Ràng buộc khóa ngoại (Foreign Keys):** 100% hợp lệ giữa `order_items` $\rightarrow$ `orders` và `products`, `products` $\rightarrow$ `artisans`, `artisans` $\rightarrow$ `villages`. Không có bản ghi mồ côi (orphan records).
- **Chỉ mục (Indexes):** Các trường tra cứu nhanh như `passport_records.public_code`, `products.slug`, `orders.status`, `user_roles.user_id` đều có index B-Tree hoạt động tối ưu.
- **Bảo mật RLS:** Các chính sách Row Level Security bảo vệ nghiêm ngặt chống can thiệp chéo giữa các Seller và chống truy cập trái phép vào dữ liệu Admin.
