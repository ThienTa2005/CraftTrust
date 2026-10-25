# Ảnh trước/sau và artifact bàn giao

Tất cả render do Chromium chạy **cùng @google/model-viewer đang được website sử dụng**, đọc GLB thật từ đĩa. Không dùng ImageGen hoặc mô hình có sẵn. Bản gốc/bản sửa có cùng camera 0/180/270/90°, elevation 90°, environment neutral, exposure 1; có thêm top/bottom và mobile. Material baseline giữ nguyên; material mới bỏ bump từ độ sáng và dùng roughness giả định trung tính. Mảng nền được xử lý ở segmentation/projection, không tô màu để che lỗi.

![Bốn góc trước và sau](../../outputs/3d-audit/before-after.png)

![Ảnh gốc đối chiếu](../../outputs/3d-audit/reference-comparison.png)

Ảnh gốc trong sheet chỉ được crop để trình bày; pipeline nhận file nguyên gốc. Front/back có cải thiện rõ; left/right vẫn có kéo dài và đường nối do thiếu quan sát. **Chưa đạt nghiệm thu hình ảnh toàn bộ 360°.**

| Artifact | Liên kết |
|---|---|
| GLB mới Web | [model.glb](../../outputs/3d-audit/after/model.glb) |
| GLB Master, cùng thuật toán — không phải scan độ chính xác cao hơn | [model-master.glb](../../outputs/3d-audit/after/model-master.glb) |
| Baseline | [model.glb](../../outputs/3d-audit/baseline/model.glb) |
| Chỉ dùng t1 | [model.glb](../../outputs/3d-audit/single/model.glb) |
| Bản giữ số đo khai báo 100 × 80 cm | [model.glb](../../outputs/3d-audit/after-measured/model.glb) |
| Front / Back | [Front](../../outputs/3d-audit/after/render-front.png), [Back](../../outputs/3d-audit/after/render-back.png) |
| Left / Right | [Left](../../outputs/3d-audit/after/render-left.png), [Right](../../outputs/3d-audit/after/render-right.png) |
| Top / Bottom | [Top](../../outputs/3d-audit/after/render-top.png), [Bottom](../../outputs/3d-audit/after/render-bottom.png) |
| Texture / provenance | [Texture](../../outputs/3d-audit/after/model-texture.png), [Provenance](../../outputs/3d-audit/after/model-provenance.png) |
| Mask trước/sau sửa | [Comparison](../../outputs/3d-audit/segmentation-comparison.png) |
| Kiểm tra viewer | [JSON](../../outputs/3d-audit/viewer-results.json) |

Provenance: 0 = ngoại suy/không đủ hỗ trợ; 50 = FRONT; 100 = BACK. Coverage tính trên thân ngoài, không bao gồm các bề mặt trong/đáy suy diễn.

Artifacts lớn nằm trong `outputs/3d-audit/`, đã bị `.gitignore` loại trừ. Khi bàn giao qua Git cần chuyển thư mục artifacts riêng hoặc chạy lại script từ hai ảnh nguyên gốc.

## Chạy lại local

```powershell
rtk proxy services/model-worker/.venv/Scripts/python.exe scripts/run_dragon_audit.py
rtk proxy node scripts/validate_3d_audit.mjs
rtk proxy node scripts/render_3d_audit.mjs baseline after after-measured
rtk proxy services/model-worker/.venv/Scripts/python.exe scripts/audit_3d_inputs.py after
rtk proxy services/model-worker/.venv/Scripts/python.exe scripts/compose_3d_audit.py
```

Validator nằm ở `outputs/3d-audit/tools/node_modules/gltf-validator`, cài bằng `npm install --prefix outputs/3d-audit/tools gltf-validator --ignore-scripts --no-audit --no-fund`. Cần Chromium của Playwright đã cài. Baseline code được giữ riêng ở `outputs/3d-audit/baseline/{generate.py,ai_adapter.py}` từ checkpoint; chạy baseline trước khi so sánh nếu chuyển sang máy mới.
