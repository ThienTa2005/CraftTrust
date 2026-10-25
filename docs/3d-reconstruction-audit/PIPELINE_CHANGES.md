# Thay đổi pipeline

## P0 đã triển khai

- `services/model-worker/segmentation.py`: dùng mô hình màu biên ảnh và connected background để khởi tạo GrabCut; giữ alpha holes, không đưa pixel alpha chưa opaque vào vùng lấy mẫu. Giữ chi tiết rồng liên thông với thân.
- `generate.py`: trục ban đầu dùng Theil–Sen, loại outlier một phía, lọc các bán kính nhô hẹp, giữ miệng/đế khỏi sụp do scanline đầu quá ngắn. Hai hoặc nhiều profile cùng giới hạn thân cơ sở. Hỗ trợ chỉnh silhouette qua `--profile-json` (mảng bán kính/chiều cao từ đáy đến miệng).
- `texture_projection.py`: mỗi ảnh có mask/profile/góc riêng; projection trực giao theo hình học cuối cùng; erode mask trước bilinear sampling, kiểm tra bounds/finite, chọn nguồn theo hướng nhìn. Ảnh sau không phản chiếu ảnh trước. Giữ nguyên ảnh RGB, không dùng BGR nhầm thứ tự.
- Không tự cân màu trên hai mặt khác nhau khi không có correspondence chung đã hiệu chuẩn. Không cross-fade hoa văn đối diện. Vùng không được hỗ trợ ngoại suy từ texel hợp lệ gần nhất, có provenance riêng; đây không phải dữ liệu đo.
- Coverage đo theo diện tích thân ngoài, giới hạn góc nhìn có cosine ≥ 0,35. Không tính lòng bình/miệng/đáy như đã quan sát. Seam check đo chênh màu tại chỗ đổi nguồn, bao gồm đường nối giữa các vùng ngoại suy; kiểm tra UV wrap riêng.
- `quality_validation.py`: kiểm tra empty/degenerate geometry, finite vertex/UV, index bounds, winding so với normal, edge incidence sau weld và kích thước mesh thực. Kiểm tra thành trong không vượt bán kính/thân. Chưa có kiểm tra triangle self-intersection tổng quát; report ghi rõ.
- Normal map trung tính, không tuyên bố recovered relief. Roughness là giả định hiển thị trung tính, không phải kết quả đo men. Tangent giải tích giúp glTF Validator hết cảnh báo tangent-space. Compact vertex theo từng primitive giảm dung lượng.
- Bỏ confidence giả và nhãn quan sát 360°. Giữ engine thực tế `ceramic-cpu`, mode riêng `single-image` hoặc `limited-multiview`.

## Engine

`ai_adapter.py` từ chối AI chưa có inference/weights được kiểm chứng. Máy kiểm thử không có PyTorch/CUDA khả dụng. Không tải weights hoặc thuê GPU/API.

`multiview_reconstruction.py` + `high_fidelity_export.py` cung cấp đường chạy local độc lập: kiểm tra ≥12 ảnh không trùng → segmentation masks → feature extraction → matching → SfM → kiểm tra toàn bộ camera đăng ký cùng một model → undistortion → OpenMVS dense/mesh/refine/texture → Blender GLB. Mọi stage lỗi đều dừng, không fallback lathe. Đây là **adapter chưa được nghiệm thu end-to-end** vì thiếu toolchain và bộ ảnh chồng lấp; không bật lựa chọn này trên website/CPU worker.

Lệnh theo [COLMAP CLI](https://colmap.github.io/cli.html) và [OpenMVS Usage](https://github.com/cdcseacave/openMVS/blob/develop/docs/wiki/Usage.md). Scale và orientation của kết quả SfM còn phải hiệu chuẩn; adapter không gán số đo centimet như đã xác minh.

## Worker, API, UI và database

- `worker.mjs`, `source-views.mjs`: lấy toàn bộ 1–4 nguồn, giữ hướng, lỗi tải/segmentation của bất kỳ ảnh nào đều làm job thất bại. Manifest JSON truyền đến Python; không dùng ordinal làm camera pose. Report bắt buộc và phải khớp GLB. Model lưu private/pending_review, tắt AR mặc định, lưu quality_report theo từng asset.
- `apps/web/lib/model-source-views.ts`, `components/model-camera-fields.tsx`: FRONT/BACK/LEFT/RIGHT/TOP/BOTTOM/CUSTOM; CUSTOM cần góc. TOP/BOTTOM dùng đối chiếu, chưa chiếu texture lên nắp/đáy; report nêu rõ.
- Hai API seller tạo/sửa sản phẩm và `seller-3d-studio.tsx`: chuyển `sourceViews` song song với files, không tự suy ra hướng từ upload. Bỏ chỉ số mặc định giả và các lựa chọn hình học không hề được backend lưu. Mặc định giữ tỷ lệ ảnh; chế độ số đo vẫn có nhưng chất lượng đo trên geometry cuối.
- API admin models và `admin-3d-manager.tsx`: chặn publish generated model thiếu report hoặc `publicationBlocked=true`, hiển thị lý do và toàn bộ ảnh gốc. Giữ upload GLB thủ công và phê duyệt chủ động.
- Migration `202610250008_model_camera_and_quality.sql`: metadata góc camera, quality_report theo asset, review_state và DB trigger chặn publish không kiểm chứng. Không backfill hướng camera giả cho ảnh cũ. **Chưa áp dụng database nào.**
- State legacy vẫn tương thích: job processing/reconstructing = GENERATING; GLB tạo xong = GENERATED; validating = QUALITY_CHECKING; asset pending_review = NEEDS_REVIEW; admin phê duyệt/xuất bản là thao tác đã audit với approved_by/approved_at; rejected/published/failed giữ nghĩa cũ. `review_state` có vocabulary đầy đủ, nhưng các pha trước khi tạo asset vẫn nằm ở job, không tạo asset giả để biểu diễn chúng. APPROVED chưa tách thành một bước lưu độc lập trước PUBLISHED.
- Không thay route passport/QR. Không còn nhúng mã passport demo vào sản phẩm chưa có passport. Khi không có public code, QR bị tắt.
- `scripts/prepare-model-worker-cloud.mjs`, Dockerfile: đóng gói toàn bộ module mới, không copy credentials.

## Triển khai cần phối hợp

Áp dụng migration đã review trước khi deploy API/worker/UI mới. Ảnh nguồn cũ thiếu hướng phải được người bán khai báo lại qua thay ảnh; không tự gán hướng. Chưa deploy hoặc thay dữ liệu sản phẩm hiện có. Giữ kiểm duyệt chặn xuất bản các GLB còn thiếu hình học/texture; có thể upload bản GLB đã sửa thủ công để admin xem xét.

## File kiểm thử và bằng chứng

Python: `test_reconstruction.py`, `test_pipeline.py`, `test_cloud_runtime.py`, `test_engine_compatibility.py` (test có sẵn được chạy).
Node: `test_source_views.mjs`, test cấu hình Supabase có sẵn.
Web: `model-source-views.test.ts`, `model-review-api.test.ts`, cập nhật fixture `experiences-api.test.ts` theo API góc chụp mới.
Scripts: `audit_3d_inputs.py`, `audit_3d_environment.py`, `run_dragon_audit.py`, `render_3d_audit.mjs`, `validate_3d_audit.mjs`, `compose_3d_audit.py`. Bốn seed/E2E scripts có sẵn được thêm hướng FRONT cho ảnh fixture đã biết: `services/model-worker/{seed_demo_3d,test_e2e}.mjs`, `scripts/{seed_demo_3d_and_passport,test_3d_e2e}.mjs`; không chạy chúng vào database đang có dữ liệu.
