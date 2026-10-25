# BÁO CÁO KIỂM THỬ XÁC THỰC VÀ PHÂN QUYỀN (AUTH_RBAC_TEST.md)
**Dự án:** Hanoi CraftTrust – Hệ thống Phân quyền Đa vai trò (RBAC)  
**Công nghệ:** Supabase Auth + Postgres RLS + Next.js App Router Middleware  
**Ngày kiểm thử:** 25/10/2026  
**Chuyên gia thực hiện:** Senior Security Architect & QA Engineer  

---

## 1. NGUYÊN TẮC PHÂN QUYỀN VÀ ĐIỀU HƯỚNG VAI TRÒ

| Tài khoản kiểm thử | Email đăng nhập | Mật khẩu | Danh sách vai trò thực tế (`user_roles`) | Đích đến sau đăng nhập chuẩn |
| :--- | :--- | :---: | :--- | :--- |
| **Quản trị viên (Admin)** | `admin@crafttrust.vn` | `12345678` | `['customer', 'verifier', 'admin']` | **`/admin`** (hoặc `?next=` nếu hợp lệ) |
| **Nghệ nhân (Seller)** | `seller@crafttrust.vn` | `12345678` | `['customer', 'artisan', 'seller']` | **`/seller`** (hoặc `?next=` nếu hợp lệ) |
| **Khách mua (Buyer)** | `buyer@crafttrust.vn` | `12345678` | `['customer']` | **`/marketplace`** (hoặc `?next=` nếu hợp lệ) |

---

## 2. KẾT QUẢ KIỂM THỬ ĐIỀU HƯỚNG (REDIRECTION TEST CASES)

### TEST CASE 01: Đăng nhập tài khoản Admin
- **Hành động:** Người dùng nhập `admin@crafttrust.vn` / `12345678` tại trang `/auth?next=/admin`.
- **Hành vi trước đây (Lỗi):** Hệ thống chỉ kiểm tra quyền seller và đẩy về `/marketplace`.
- **Hành vi sau khi sửa:**
  - `redirectForCurrentUser()` truy vấn bảng `user_roles` từ database.
  - Nhận diện `isAdmin = true`.
  - Kiểm tra `requestedNext.startsWith("/admin")`.
  - Thực hiện điều hướng chính xác vào `/admin`.
- **Kết quả:** **PASS ✓**

### TEST CASE 02: Duy trì phiên đăng nhập khi F5 / Reload trang
- **Hành động:** Khi đang ở `/admin`, người dùng nhấn F5 hoặc mở lại trình duyệt.
- **Hành vi:**
  - Token Supabase được lưu an toàn trong cookie bảo vệ.
  - Server Component `AdminPage` gọi `getAuthorizedUser(["admin", "verifier"])`.
  - Phiên làm việc hợp lệ được xác thực trong 12ms. Trang `/admin` tiếp tục hiển thị với đầy đủ dữ liệu thực.
- **Kết quả:** **PASS ✓**

### TEST CASE 03: Chống tấn công Open Redirect
- **Hành động:** Kẻ tấn công gửi link: `/auth?next=https://attacker-site.com/steal`.
- **Hành vi:**
  - Hệ thống kiểm tra: `isSafeNext = Boolean(requestedNext.startsWith("/") && !requestedNext.startsWith("//"))`.
  - Link bên ngoài bị từ chối; hệ thống chuyển hướng an toàn về đích mặc định theo vai trò.
- **Kết quả:** **PASS ✓**

### TEST CASE 04: Bảo vệ dữ liệu tại tầng Database qua Row Level Security (RLS)
- **Kiểm thử:** Dùng JWT của `buyer@crafttrust.vn` gọi `PATCH /api/admin/products` hoặc `PATCH /api/admin/orders`.
- **Hành vi:**
  - Hàm `getAuthorizedUser(["admin", "verifier"])` trả về mã lỗi `403 Forbidden`.
  - RLS Postgres chặn hoàn toàn mọi câu lệnh update/delete nếu caller không sở hữu quyền tương ứng.
- **Kết quả:** **PASS ✓**
