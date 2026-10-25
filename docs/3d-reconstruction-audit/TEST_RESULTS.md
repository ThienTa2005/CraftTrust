# Kết quả kiểm thử — 25/10/2026

## PASS

- Python regressions: **13 tests PASS**, gồm nền xám/trắng/alpha, alpha holes, bắt lỗi thiếu back mask, alignment ảnh sau lệch tâm, camera sau không phản chiếu, đóng góp của bốn nguồn, UV lỗi, AI unavailable không fallback, thiếu ảnh SfM, normals/manifold/dimensions, loại relief outlier khỏi vòng thân, report trung thực, chính hai ảnh bình rồng.
- `test_pipeline.py`: single/multi-view, Web <2 MB, GLB và Master thực. Fixture có số đo khai báo sai tỷ lệ phải cho IoU thấp và cảnh báo; không tăng điểm để pass.
- `test_cloud_runtime.py`: single/two-photo local runtime; không chạy cloud deployment.
- `test_engine_compatibility.py`: 2 tests, gồm CLI thực cho legacy `ceramic-cpu`.
- Worker Node: 8 tests gồm source metadata/report validation và cấu hình Supabase có sẵn.
- Web: 48 tests / 10 files PASS, gồm API upload theo vai trò, sourceViews, chặn publish generated report sai/thiếu và giữ upload GLB thủ công. Packages contracts 4, API client 5, mobile 3, Zalo 2 tests PASS.
- Typecheck toàn workspace PASS.
- Build toàn workspace PASS (Next.js web, Expo web export, Zalo, packages).
- Đóng gói worker cloud local PASS; không deploy.
- Khronos glTF Validator 2.0.0-dev.3.10: GLB mới Web và Master đều **0 errors / 0 warnings**, 4 thông tin không nghiêm trọng (UV material trong chưa dùng và texture NPOT). Baseline 0 errors / 1 warning tangent-space.
- Viewer harness dùng module model-viewer thật: baseline, after, after-measured đều load, rotate, zoom; render front/back/left/right/top/bottom, ảnh mobile; 0 page errors. Xem [kết quả](../../outputs/3d-audit/viewer-results.json).

## FAIL / chưa nghiệm thu

- **Visual fidelity toàn bộ hiện vật: FAIL.** Texture hai hông còn kéo dài/đường nối; relief chưa có geometry thật. Chặn publish. Front/back cải thiện không biến thành kết luận đạt chuẩn 360°.
- **Lint workspace: FAIL**, mobile thiếu module `semver/functions/valid` trong cây dependency ESLint. Web lint có lỗi sẵn ở `app/api/assistant/route.ts` (prefer-const) và `components/real-interactive-map.tsx` (hook/self reference), cùng warnings có sẵn. Không sửa lan sang assistant/map/mobile trong tác vụ 3D. Warning mới do bỏ control `Layers` và ảnh đối chiếu đã được xử lý.
- **Database integration/migration: chưa chạy.** Không áp dụng vào Supabase production hoặc reset dữ liệu. Tests API dùng mocks; không coi đó là kiểm chứng RLS/SQL trên database thật.
- **High-fidelity/AI inference: chưa nghiệm thu.** Không có PyTorch/CUDA, COLMAP/OpenMVS/Blender và bộ ảnh overlapping phù hợp. Kiểm thử xác nhận thiếu đầu vào/hạ tầng không fallback; chưa xác minh output SfM/MVS thực.
- **Authenticated Seller→Worker→Admin→Buyer E2E: chưa chạy trên database thật.** Viewer kiểm thử trên GLB local và runtime cùng website; không giả nhận đã kiểm tra phiên đăng nhập production, WebXR AR hoặc QR vật lý.
- **Self-intersection tổng quát:** chưa chạy thuật toán triangle-intersection. Đã kiểm tra cấu trúc lathe, thành trong/bán kính và winding/edge manifold.

## Các lỗi đã gặp và xử lý khi kiểm thử

Sandbox Windows chặn child process/temp ACL: chạy lại các kiểm thử local tương ứng qua quyền thực thi được cho phép. Lượt render chạy cùng build bị timeout screenshot; chạy lại độc lập thành công. Hai fixture API cũ thiếu camera direction được cập nhật theo contract mới. Test IoU cũ đo trước scale được sửa để phát hiện số đo lệch ảnh, không còn chấp nhận điểm giả.
