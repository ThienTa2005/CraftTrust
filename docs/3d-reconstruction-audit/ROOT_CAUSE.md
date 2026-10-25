# Kiểm toán nguyên nhân — 25/10/2026

Đã kiểm tra mã local khớp remote `ca0f467a61b7374e2450f0aead6c17b15cfb986f` trước khi sửa. Tạo nhánh `fix/3d-reconstruction-audit`; checkpoint `80f2cfa` giữ nguyên 12 file thay đổi có sẵn của người dùng. Không sửa production hoặc gọi API/GPU trả phí.

## Bằng chứng trực tiếp

Hai file nguyên gốc, không thay bằng ảnh đơn giản:

| File | SHA-256 |
|---|---|
| t1-3-1024x1536.jpg | `6004113e31ca4715ab50b3aa2827fdc5d5fa64fbdef9e4be75ded52ae0bfd592` |
| t2-3-1024x1536.jpg | `7d068efe91a4f09ab214638a90a1dddabba45cdc615a892a6eeda3905dd2a39a` |

Baseline chạy code chưa sửa, với t1 là FRONT và t2 là BACK. Góc 180° là giả định dựa trên mô tả hai mặt đối diện, không phải camera pose đã đo. Cả hai lần chính dùng `shape-mode photo`, chiều cao 100 cm và chiều rộng tham chiếu 80 cm lấy từ screenshot, chưa xác minh bằng đo thực tế. Có thêm bản `after-measured` để kiểm tra trường hợp ép kích thước 100 × 80 cm.

## Các lỗi được xác nhận trong phiên bản thực tế

1. **Mask ảnh trước đã sai.** GrabCut khởi tạo bằng hình chữ nhật giữ một mảng nền xám lớn bên trái bình. Pixel nền tại `(x=180,y=800)` nằm trong foreground baseline. Mảng này làm rộng biên dạng và bị xoay quanh thân; không chỉ là lỗi material. Xem [so sánh segmentation](../../outputs/3d-audit/segmentation-comparison.png).
2. **Bỏ mask ảnh sau.** `back_rgb, _ = segment_object(back_img)` bỏ mask; `cv2.remap` đọc trực tiếp ảnh sau, kể cả nền.
3. **Căn sai hệ tọa độ.** Ảnh sau được resize theo chiều cao toàn ảnh và đặt tâm tại giữa khung hình; dùng profile và tọa độ Y của ảnh trước. Không căn theo foreground từng ảnh.
4. **Mask texture ảnh trước là silhouette dựng lại**, không phải mask vật thể thực. Nearest fill trên mask sai vẫn mang màu nền lên mesh.
5. **Biên dạng bị nhiễm chi tiết nổi.** Khởi tạo trục bằng least squares và đóng hình thái có thể giữ/phóng đại outlier; mọi bán kính bất thường thành vòng quanh bình. Đây là lathe, không phải reconstruction của rồng.
6. **Chỉ sử dụng hai ảnh đầu.** Worker mặc định ordinal 0/1 là trước/sau; các slot trống bị nén thứ tự ở frontend. Tải ảnh sau thất bại bị nuốt, có thể âm thầm dựng một ảnh.
7. **Texture không có kiểm chứng hỗ trợ.** Cosine cross-fade trộn hai hoa văn khác nhau; cân màu theo toàn ảnh kể cả background và các bề mặt không tương ứng.
8. **Quality report sai ý nghĩa.** Hai ảnh tự thành 0% speculative; confidence cộng từ IoU, số ảnh và độ phân giải. IoU được đo trước khi hiệu chỉnh tỷ lệ theo số đo. `isManifold=True` được gán mà không kiểm tra. UI còn có giá trị dự phòng 98,5% / 90%.
9. **AI chưa có inference.** Các adapter kiểm tra sơ bộ GPU/đường dẫn weights, nhưng không triển khai `generate`; pipeline vẫn dựng lathe. Có fallback im lặng.
10. **Normal map từ độ sáng ảnh không phải relief.** Pigment, bóng đổ và phản xạ bị biến thành normal giả. Mesh còn nhân bản vertex không dùng giữa materials, làm baseline Web GLB vượt mục tiêu 2 MB.

Baseline: 2.635.920 bytes; IoU 0,8988; confidence 0,944; speculative 0%. Baseline vẫn qua kiểm tra cấu trúc GLB: **GLB hợp lệ không chứng minh mô hình giống hiện vật**.
