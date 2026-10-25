# BÁO CÁO KIỂM THỬ ĐỘ PHẢN HỒI GIAO DIỆN VÀ RESPONSIVE (RESPONSIVE_REPORT.md)
**Dự án:** Hanoi CraftTrust – Đa nền tảng và Đa kích thước màn hình  
**Công cụ kiểm thử:** Playwright Automated Responsive Matrix & Chromium DevTools  
**Ngày kiểm thử:** 25/10/2026  
**Chuyên gia thực hiện:** Senior UI/UX Engineer & QA Automation Engineer  

---

## 1. MA TRẬN KIỂM THỬ KÍCH THƯỚC MÀN HÌNH (VIEWPORT MATRIX)

Hệ thống đã được kiểm thử tự động trên toàn bộ các độ phân giải tiêu chuẩn theo quy định của đề bài:

| STT | Kích thước Viewport | Thiết bị đại diện | Tỷ lệ màn hình | Bố cục Shell | Cuộn ngang ngoài ý muốn | Kết quả kiểm thử |
| :---: | :---: | :--- | :---: | :--- | :---: | :---: |
| 1 | **320 × 568** | iPhone SE (1st Gen) | 16:9 | Mobile Single Column | Không (0px) | **PASS ✓** |
| 2 | **360 × 800** | Android Compact | 20:9 | Mobile Single Column | Không (0px) | **PASS ✓** |
| 3 | **375 × 812** | iPhone X / 11 Pro / 12 Mini | 19.5:9 | Mobile Drawer Navigation | Không (0px) | **PASS ✓** |
| 4 | **390 × 844** | iPhone 12 / 13 / 14 | 19.5:9 | Mobile Drawer Navigation | Không (0px) | **PASS ✓** |
| 5 | **412 × 915** | Google Pixel 7 / Samsung Galaxy | 20:9 | Mobile Drawer Navigation | Không (0px) | **PASS ✓** |
| 6 | **430 × 932** | iPhone 14 Pro Max / 15 Plus | 19.5:9 | Mobile Drawer Navigation | Không (0px) | **PASS ✓** |
| 7 | **768 × 1024** | iPad Mini / Tablet Portrait | 4:3 | Tablet Adaptive Grid | Không (0px) | **PASS ✓** |
| 8 | **1024 × 768** | iPad Landscape / Small Laptop | 4:3 | Desktop Adaptive Sidebar | Không (0px) | **PASS ✓** |
| 9 | **1440 × 900** | Macbook Pro 15" / Desktop HD | 16:10 | Full Desktop Dual Sidebar | Không (0px) | **PASS ✓** |
| 10 | **1920 × 1080** | Full HD Monitor / 4K Scaled | 16:9 | Full Desktop Centered Shell | Không (0px) | **PASS ✓** |

---

## 2. CÁC ĐIỂM CẢI TIẾN RESPONSIVE ĐẶC BIỆT THEO VAI TRÒ

### 2.1. Cổng Quản Trị Hệ Thống (`/admin`)
- **Trước khi sửa:** Sidebar chiếm 280px cố định, trên màn hình điện thoại dưới 900px làm đẩy toàn bộ bảng số liệu ra ngoài màn hình, gây cuộn ngang khó chịu.
- **Sau khi sửa:** 
  - Tại viewports $< 900\text{px}$, Sidebar tự động chuyển thành Drawer trượt từ bên trái ra ngoài màn hình.
  - Thêm nút Hamburger menu tại Header quản trị.
  - Khi mở Drawer, xuất hiện lớp nền làm mờ (`admin-mobile-backdrop`) và nút đóng `X` tiện lợi.
  - Các bảng dữ liệu lớn (Đơn hàng, Sản phẩm) được bọc trong container `admin-table-wrap` với thanh cuộn ngang nội bộ mượt mà (`overflow-x: auto`), không làm vỡ bố cục tổng thể của trang.

### 2.2. Kênh Người Bán (`/seller`)
- Bảng điều khiển kinh doanh và Studio 3D tự động co dãn theo một cột đơn trên màn hình điện thoại.
- Các nút hành động thao tác nhanh (`Xác nhận đơn`, `Giao bưu cục`) được tối ưu kích thước cảm ứng tối thiểu 44px theo tiêu chuẩn Accessibility (WCAG 2.1 AA).

### 2.3. Trang Truy Xuất Nguồn Gốc (`/trace/[publicCode]`)
- Tác phẩm 3D Model Viewer tự động căn chỉnh tỷ lệ 1:1 linh hoạt.
- 6 thẻ video công đoạn chế tác được xếp theo dạng tab ngang cuộn mượt hoặc xếp chồng linh hoạt, không bị vỡ bố cục trên màn hình 320px.
