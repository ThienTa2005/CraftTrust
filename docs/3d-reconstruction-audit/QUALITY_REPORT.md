# Kết quả kiểm định hai ảnh bình rồng

**Kết luận: sửa được lỗi lấy nền lên mô hình và báo cáo sai; bản dựng vẫn CHƯA ĐẠT tiêu chuẩn bản sao hiện vật để xuất bản.**

Nguồn: [report JSON](../../outputs/3d-audit/after/model.json), [manifest/hash đầu vào](../../outputs/3d-audit/input-manifest.json).

| Chỉ tiêu | Kết quả cuối |
|---|---:|
| Engine thực | ceramic-cpu 3.0 |
| Mode | limited-multiview |
| Web GLB | 1.397.076 bytes |
| Texture thân ngoài có hỗ trợ ảnh theo mô hình chiếu | 76,45% |
| Texture thân ngoài ngoại suy/không hỗ trợ | 23,55% |
| Đóng góp FRONT / BACK | 38,04% / 38,41% |
| Điểm lấy mẫu ngoài mask đã bị loại | 7.319 |
| Điểm lấy mẫu được chấp nhận ngoài mask | 0 |
| Silhouette IoU FRONT / BACK | 0,9491 / 0,9541 |
| Chênh màu P95 ở chỗ đổi nguồn | 177,37 (RGB Euclidean) — cần review |
| Confidence / độ chính xác vật lý | Không xác định |
| glTF Validator Web + Master | 0 errors, 0 warnings |
| Trạng thái | NEEDS_REVIEW, publicationBlocked=true |

Coverage chỉ phản ánh phép chiếu và mask, không xác nhận segmentation chính xác tuyệt đối hoặc recovered geometry. IoU dùng mask tự động của từng ảnh và cùng dữ liệu đã dùng dựng profile; không phải phép đo độc lập độ giống hiện vật. Không được diễn giải 94,91% IoU thành 94,91% độ chính xác 3D.

## Kích thước

Chiều cao 100 cm / rộng 80 cm lấy từ screenshot, chưa có xác nhận số đo vật lý. Ở mode photo, mesh cao 100 cm, rộng khoảng 61,66 cm theo tỷ lệ ảnh; chênh 22,93% so với rộng khai báo. Đây là cảnh báo cần đo lại, không phải tự sửa số đo sản phẩm.

[Bản ép số đo 100 × 80 cm](../../outputs/3d-audit/after-measured/model.glb) có IoU FRONT 0,8032 / BACK 0,8020, coverage 58,28%, ngoại suy 41,72%. Bản này cũng bị chặn publish. Hai bản giúp thấy ảnh hưởng của số đo thay vì che sai tỷ lệ.

## Hình học và vùng thiếu

- Thân/cổ/miệng/đáy cơ sở là suy diễn tròn xoay. Rồng, râu, công trình, chân tượng và các bề mặt khuất chưa có hình học relief thật.
- Ảnh màu giữ hoa văn hai mặt, nhưng không cung cấp depth; normal trung tính không được gọi là relief.
- Hai hông có texture kéo dài và đường nối rõ. Đây là **FAIL trực quan**, không đánh dấu đã đạt chuẩn.
- Lòng bình, mặt đáy và độ dày thành chưa có ảnh/số đo kiểm chứng. Vật liệu bên trong và roughness là giả định.
- Kiểm tra edge manifold sau weld, winding, finite UV, kích thước và GLB đạt. Triangle self-intersection tổng quát chưa đo; không báo `isManifold=True` như một kết luận toàn diện.
- Góc camera do người dùng khai báo, phép chiếu trực giao chưa được hiệu chuẩn. Không đo similarity ở LEFT/RIGHT/TOP/BOTTOM vì không có ảnh tham chiếu tương ứng.

## Dữ liệu cần bổ sung

Trước mắt bổ sung LEFT/RIGHT chụp ngang thân, nhất quán tiêu cự/khoảng cách/ánh sáng, để giảm vùng texture ngoại suy. Để dựng rồng nổi, cần một bộ nhiều góc liên tiếp có overlap, nhiều cao độ quanh miệng/vai/thân, ảnh cận relief có overlap với ảnh toàn vật, và thước/mốc kích thước. Không coi mốc tối thiểu 12 ảnh của adapter là bảo đảm đủ chất lượng. Chụp một vòng đầy đủ với bước góc nhỏ (ví dụ 10–15°) và kiểm tra feature overlap thực tế; nền đơn giản, tránh thay đổi phản xạ và không thay vị trí các chi tiết.

Cần cài và nghiệm thu COLMAP/OpenMVS/Blender hoặc một engine AI inference thực trên hạ tầng được chấp thuận. Hai ảnh đối diện hiện tại không đủ để kiểm chứng độ sâu relief hay các bề mặt bị che khuất.
