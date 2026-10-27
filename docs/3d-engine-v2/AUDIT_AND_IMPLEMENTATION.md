# Báo cáo audit Pixal3D Modal Image — 27/10/2026

## 1. Kết luận

Quy trình build đã được sửa theo hướng tái lập được và fail-closed. Lỗi Step 14
đã được loại bỏ ở cấp resolver: `o-voxel` không còn quyền tự cài lại CuMesh hoặc
FlexGEMM. Các source, model phụ và NAF đều được ghim revision/hash; kiểm tra Image
không còn import CUDA/Triton trong CPU builder; không còn chỉnh trực tiếp
`dist-info/METADATA` để làm giả kết quả `pip check`.

Trạng thái hiện tại là **sẵn sàng cho một lượt Image build/deploy sau khi được
chấp thuận**, không phải “Pixal3D đã hoạt động hoàn chỉnh”. Chưa build Modal Image,
chưa cấp phát L40S, chưa chạy inference, chưa tạo GLB thật, chưa deploy và chưa áp
dụng migration production trong đợt audit này.

## 2. Nguyên nhân gốc của lỗi Step 14

Tại TRELLIS.2 commit `75fbf0183001ed9876c8dbb35de6b68552ee08bd`,
`o-voxel/pyproject.toml` khai báo trực tiếp hai dependency Git **không ghim commit**:

- `cumesh @ git+https://github.com/JeffreyXiang/CuMesh.git`
- `flex_gemm @ git+https://github.com/JeffreyXiang/FlexGEMM.git`

Lệnh cũ `pip install . --no-build-isolation` vẫn bật dependency resolution. Vì
vậy, dù CuMesh đã build thành công ở Step 12, pip tại Step 14 vẫn clone CuMesh lần
hai, chạy recursive submodule và lại truy cập Eigen trên GitLab. GitLab quá tải
làm clone Eigen thất bại. Đây là lỗi deterministic trong installation graph,
không phải CuMesh Step 12 bị mất.

Sửa đúng là cài và xác minh trước toàn bộ dependency, sau đó cài o-voxel bằng:

```text
python -m pip install . --no-build-isolation --no-deps
```

`--no-build-isolation` dùng bộ PyTorch/CUDA đã pin để compile; `--no-deps` chặn
resolver clone hoặc thay thế CuMesh, FlexGEMM, PyTorch và Triton.

## 3. Dependency graph đã audit

```text
CUDA 12.4.1 devel / Python 3.10
└─ torch 2.6.0+cu124 ─ torchvision 0.21.0+cu124 ─ triton 3.2.0
   ├─ nvdiffrast @ 253ac4f...                 [native CUDA]
   ├─ nvdiffrec_render @ b296927...           [native CUDA]
   ├─ CuMesh @ 12289e1...
   │  └─ cubvh + Eigen @ e63d9f6...           [native CUDA/C++]
   ├─ FlexGEMM @ 6dd94a8...                   [Triton/GPU import]
   ├─ o-voxel (TRELLIS.2 @ 75fbf01...)
   │  ├─ CuMesh Git URL không pin ở upstream  [bị chặn bởi --no-deps]
   │  ├─ FlexGEMM Git URL không pin upstream  [bị chặn bởi --no-deps]
   │  └─ Eigen @ 21e4582...                   [native CUDA/C++]
   ├─ NATTEN 0.21.0                           [native CUDA]
   └─ Pixal3D source @ f7cf384...
      ├─ checkpoint @ b0cb2e1...
      ├─ MoGe package @ 74fbce0... / MoGe-2 weights @ 39c4d5e...
      ├─ DINOv3 weights @ 3c276ed...
      ├─ BiRefNet weights @ e2bf8e4...
      ├─ NAF source @ 37f2dfc... + weight SHA-256 c096c1ab...
      ├─ utils3d-moge @ 62f09d5...
      ├─ pipeline @ 1c51139...
      └─ diffusers 0.37.1 / transformers 4.57.3 / HF Hub 0.36.0
```

### Các vấn đề phát hiện trên toàn chuỗi

1. `o-voxel` có hai Git dependency không pin và gây clone lặp; đã vô hiệu hóa
   resolver ở bước cài local.
2. CuMesh và o-voxel đều có Eigen submodule phụ thuộc GitLab; retry, mirror và
   xác minh commit vẫn được giữ. Commit Eigen của hai cây là khác nhau và đều được
   kiểm tra riêng.
3. Các package native cài sau có thể khiến pip thay torch/triton; tất cả bước
   CuMesh, FlexGEMM, nvdiffrast, nvdiffrec, o-voxel, NATTEN và wheel utils3d nay
   dùng `--no-deps`; build native dùng `--no-build-isolation`.
4. Image verifier cũ import `flex_gemm` trong container build không có GPU và gây
   Triton `0 active drivers`; verifier mới chỉ đọc metadata và dùng `find_spec`.
   Import thật được chuyển vào GPU smoke test có chủ đích.
5. Cách sửa `moge*.dist-info/METADATA` cũ che lỗi thay vì giải quyết; đã bỏ hoàn
   toàn. `pip check` nay fail nếu có lỗi ngoài ba ngoại lệ MoGe đã liệt kê rõ.
6. MoGe 3 metadata yêu cầu `gradio>=6`, `starlette`, `trimesh>=4.11`, trong khi
   runtime chỉ dùng `moge.model.v2` và Pixal3D pin `trimesh==4.10.1`. Ba xung đột
   này được báo cáo, không bị xóa khỏi metadata. CLI/UI của MoGe không được hỗ trợ
   trong Image này.
7. MoGe 3 yêu cầu `click>=8.3.1`; pin `8.3.0` đã được nâng thành `8.3.1` để tránh
   lỗi `pip check` ở bước cuối.
8. MoGe metadata tham chiếu FlexGEMM commit `b2fadb...`, khác nhánh với commit
   Pixal3D đang dùng `6dd94a...`. Không tự đổi commit khi chưa có bằng chứng GPU;
   verifier xác minh đúng checkout đã chọn và rủi ro được giữ mở cho smoke test.
9. Pixal3D runtime từng tải NAF qua `torch.hub` không pin và model phụ từ Hugging
   Face theo tên nhánh. NAF code/weight và mọi snapshot phụ nay được ghim, tải vào
   Volume rồi truyền bằng đường dẫn local.
10. Checkpoint Pixal3D tham chiếu BRIA RMBG-2.0 có quyền truy cập/license hạn chế.
    Runner dùng BiRefNet public, giấy phép MIT, qua đúng API `BiRefNet` của Pixal3D.
    Tính tương thích cú pháp đã kiểm tra; chất lượng mask vẫn cần GPU/ảnh thật.
11. Reaper cũ có thể giải phóng job `spawning` chưa có `call_id`, trong khi request
    spawn có thể đã tới Modal nhưng phản hồi bị mất. Việc retry có thể tạo hai GPU
    call. Reaper nay không tự kết luận trạng thái mơ hồ này đã chết.
12. Callback trước đây đọc body không giới hạn. Route nay giới hạn streaming 64 KiB,
    từ chối UTF-8 lỗi trước HMAC/JSON và trả 413/400 rõ ràng.

## 4. Thay đổi theo file

| File / dòng | Thay đổi | Lý do |
|---|---|---|
| `services/3d-engine/modal_app.py:13-20` | Pin source, checkpoint, model phụ, NAF và SHA-256 | Loại bỏ tải latest/ngầm thay đổi |
| `services/3d-engine/modal_app.py:36-117` | Xác minh checkout/submodule; CuMesh build có retry/mirror | Ổn định clone Eigen và provenance |
| `services/3d-engine/modal_app.py:121-159` | Cài dependency theo thứ tự; native packages dùng `--no-deps`; chạy verifier cuối Image | Chặn clone lặp và pin drift |
| `services/3d-engine/modal_app.py:166-177` | `min_containers=0`, `max_containers=1`, `retries=0`, single-use | Không giữ GPU nóng hoặc retry phát sinh phí |
| `services/3d-engine/modal_app.py:334-397` | GPU smoke test riêng, import CUDA modules và init pipeline | Tách CPU build validation khỏi GPU runtime |
| `services/3d-engine/pixal3d_runner.py:28-188` | NAF/model local; chặn network fallback sau snapshot download | Không có model loader unpinned ở runtime |
| `services/3d-engine/model_artifacts.py:1-87` | Xác minh config, weight, remote code và model path trong snapshot | Fail trước pipeline init nếu artifact thiếu |
| `services/3d-engine/image_dependency_audit.py:20-302` | Kiểm tra version, MoGe Requires-Dist, PEP 610, Git HEAD, hash, `pip check` | Xác minh Image mà không khởi tạo GPU |
| `supabase/migrations/202610260001_pixal3d_modal_engine.sql:404-496` | Không auto-reap ambiguous spawn; thêm quarantine có row lock | Tránh duplicate dispatch và có đường xử lý job kẹt |
| `apps/web/app/api/internal/3d-callback/route.ts:7-33` | Body cap 64 KiB và UTF-8 fatal decode | Giảm DoS/memory abuse trước auth |
| `services/3d-engine/tests/test_modal_build.py` | Assertion `--no-deps`, thứ tự install, model pins, CPU-safe audit, cost bounds | Chứng minh invariant của Image definition |
| `services/3d-engine/tests/test_dispatch.py` | Regression test cho ambiguous spawn | Không tái xuất hiện duplicate GPU |
| `apps/web/__tests__/model-callback-auth.test.ts` | Test body callback quá giới hạn | Khóa hành vi 413 |

Không reset repository, không xóa asset/data cũ và không thay đổi luồng Seller →
Admin review → Buyer. Migration chỉ được sửa dưới dạng file, chưa apply.

## 5. Vì sao CuMesh/FlexGEMM không còn bị clone lần hai

Thứ tự Image hiện tại là:

1. Cài PyTorch/torchvision đúng CUDA index.
2. Clone TRELLIS.2 và xác minh Eigen của o-voxel, nhưng chưa cài o-voxel.
3. Cài pure-Python dependencies và Git packages đã pin bằng `--no-deps`.
4. Clone/build CuMesh từ commit pin bằng `--no-build-isolation --no-deps`.
5. Clone/build FlexGEMM từ commit pin bằng `--no-build-isolation --no-deps`.
6. Chỉ sau đó cài `/opt/TRELLIS.2/o-voxel` với cả hai cờ trên.
7. Verifier xác minh distribution/version, Git checkout và chạy `pip check`.

Test tĩnh xác nhận cả cờ lẫn thứ tự. Vì resolver bị tắt tại bước 6, hai URL Git
trong metadata upstream không thể phát sinh clone mới.

## 6. Kết quả kiểm thử

| Kiểm tra | Trạng thái | Kết quả thực tế |
|---|---|---|
| Python unit tests | **PASS** | 22/22 (`pytest`, preflight cuối) |
| Web Vitest | **PASS** | 11 files, 52/52 tests |
| Web TypeScript | **PASS** | `tsc --noEmit` exit 0 |
| Python compile nội bộ | **PASS** | `modal_app.py`, runner, verifier |
| Syntax source pin | **PASS** | Pixal3D `inference.py`, `inference_mv.py`, MoGe v2, o-voxel setup |
| Package index pin | **PASS** | PyPI có Click 8.3.1; không cài package |
| Modal definition import | **PASS** | app `crafttrust-pixal3d`; không build/deploy/GPU khi import |
| `git diff --check` | **PASS** | exit 0 |
| ESLint toàn web | **FAIL** | 3 errors, 48 warnings; lỗi chặn nằm ở assistant/map ngoài dependency pipeline; callback mới không có lint error |
| Modal Image build + verifier bên trong Image | **NOT RUN** | cần quyền build/deploy và có thể tải artifact lớn |
| GPU imports / pipeline init trên L40S | **NOT RUN** | đúng yêu cầu không phát sinh chi phí |
| Inference + GLB thật | **NOT RUN** | chưa thể tuyên bố runtime/quality PASS |
| Supabase migration/integration | **NOT RUN** | không thay đổi production database |
| Modal/Vercel deploy | **NOT RUN** | chờ chấp thuận |

Không coi kiểm tra static là bằng chứng native extension hoạt động trên GPU.

## 7. Rủi ro còn lại chỉ có thể chốt khi build/GPU

- CUDA extension ABI và codegen cho L40S (SM 8.9) của CuMesh, o-voxel,
  nvdiffrast, nvdiffrec_render và NATTEN chỉ được chứng minh sau Image build và
  import trên L40S.
- FlexGEMM commit Pixal3D dùng khác commit trong MoGe 3 metadata; cần pipeline init
  và một inference thật để kết luận tương thích.
- BiRefNet MIT thay cho BRIA gated tránh token/license blocker, nhưng mask và chất
  lượng GLB cần review trực quan trên sản phẩm thủ công thật.
- Snapshot/model downloads vẫn phụ thuộc GitHub/Hugging Face ở lần cache miss đầu;
  revision/hash bảo đảm nội dung nhưng không loại bỏ outage mạng.
- Pipeline init có thể vượt memory/time hoặc lộ symbol/ABI error dù metadata và
  Python syntax đều đúng.
- Ambiguous spawn được giữ fail-closed để tránh duplicate GPU; operator cần reconcile
  thủ công nếu Modal nhận call nhưng call ID không được ghi về database.
- ESLint repository hiện không sạch; không ảnh hưởng kết luận dependency build nhưng
  vẫn là quality gate riêng cần xử lý.

## 8. Modal Image cache

Không bật `force_build=True`. Các layer base image, apt/toolchain và PyTorch trước
điểm thay đổi vẫn có thể tái sử dụng nếu Modal còn cache. Những command đã thay đổi
từ layer TRELLIS/dependency trở xuống sẽ bị rebuild theo content-addressed cache;
không thể cam kết giữ toàn bộ cache cũ. Verifier được thêm sau các layer cài đặt để
sửa logic kiểm tra không buộc compile lại native package nếu các layer trước không
đổi. Model weights tiếp tục dùng Volume `crafttrust-pixal3d-models`.

## 9. Lệnh dành cho giai đoạn được chấp thuận

Các lệnh dưới đây **chưa được chạy**. Trước deploy, xác nhận profile đang trỏ tới
workspace `thienta2005` và chỉ chạy đúng một lệnh deploy foreground:

```powershell
services\3d-engine\.venv\Scripts\modal.exe profile current
$env:PYTHONIOENCODING = "utf-8"
$env:PYTHONUTF8 = "1"
services\3d-engine\.venv\Scripts\modal.exe deploy --env main --stream-logs services/3d-engine/modal_app.py
```

Sau deploy, kiểm tra app và endpoint không dùng GPU:

```powershell
services\3d-engine\.venv\Scripts\modal.exe app list --env main
services\3d-engine\.venv\Scripts\modal.exe app logs crafttrust-pixal3d --env main --tail 200 --timestamps
Invoke-RestMethod "https://<workspace>--crafttrust-pixal3d-api.modal.run/health"
```

Chỉ khi có chấp thuận riêng cho GPU smoke test:

```powershell
services\3d-engine\.venv\Scripts\modal.exe run --env main services/3d-engine/modal_app.py::smoke_gpu
```

Inference job/GLB thật, cấu hình Vercel và apply migration là các bước riêng, không
được gộp ngầm vào deploy. Emergency stop sau khi migration đã được apply:

```sql
UPDATE public.model_compute_limits
SET enabled = false
WHERE singleton = true;
```

## 10. Preflight cuối trước deploy — 27/10/2026

### 10.1 MoGe 3.0

Đối chiếu local trực tiếp `MoGe/pyproject.toml` tại commit pin với
`EXPECTED_MOGE_REQUIREMENTS` cho kết quả **17/17 exact match**, không thiếu và
không thừa requirement.

| Ràng buộc | Kết quả | Cách xử lý |
|---|---|---|
| `click>=8.3.1` | **PASS** | Image pin `click==8.3.1`; verifier kiểm tra cả exact version và specifier |
| `gradio>=6.0` | **EXPECTED CONFLICT** | Chỉ thuộc CLI/UI MoGe, không nằm trên import path `moge.model.v2`; không cài để tránh dependency surface. `pip check` bắt buộc phải báo dòng thiếu này |
| `starlette` | **EXPECTED CONFLICT** | Chỉ dùng bởi MoGe web app; xử lý giống Gradio |
| `trimesh>=4.11` | **EXPECTED CONFLICT** | Pixal3D pin `4.10.1`; verifier bắt buộc xác nhận đúng conflict này. Không sửa metadata |
| `flex-gemm@b2fadb...` | **PASS static / GPU NOT RUN** | Dùng commit Pixal3D `6dd94a...`, xác minh checkout và công khai divergence; chỉ GPU test mới chốt ABI/runtime |
| 12 requirement còn lại | **PASS** | Package tồn tại; version constraint được kiểm tra; Git URL utils3d/pipeline khớp commit |

`image_dependency_audit.py` nay fail nếu: tập `Requires-Dist` thay đổi, một trong ba
conflict dự kiến biến mất, xuất hiện conflict mới, version pin lệch, PEP 610/Git
HEAD/hash lệch. Ba dòng `pip check` được in thành evidence; không bị xóa và không có
thao tác với `dist-info/METADATA`.

### 10.2 Pip/Git installation graph

- **PASS:** CuMesh clone đúng một lần và FlexGEMM clone đúng một lần.
- **PASS:** mọi direct Git URL trong Image đều có SHA 40 ký tự.
- **PASS:** mọi native/local install dùng `--no-deps`; CuMesh và FlexGEMM được cài
  trước o-voxel.
- **PASS:** bỏ pip `cmake` không pin; CMake vẫn được cung cấp bởi layer `apt_install`.
- **PASS:** không có `force_build=True`, `sed -i` hay sửa metadata.
- Web image chỉ resolve FastAPI/httpx từ PyPI và không chứa Git/native dependency;
  nó tách biệt với GPU image.

### 10.3 Model snapshots/import paths

Preflight phát hiện và sửa lỗi đường dẫn MoGe: `snapshot_download()` trả về thư
mục, trong khi `MoGeModel.from_pretrained()` tại commit pin gọi `torch.load()` với
local path và cần file `model.pt`. Runner nay nhận chính xác `<snapshot>/model.pt`.

Trước pipeline init, code mới yêu cầu:

- Pixal3D: `pipeline.json`, `pipeline_mv.json`, mọi model path trong config và ít
  nhất một weight file;
- MoGe-2: `model.pt`;
- DINOv3: `config.json` và weight;
- BiRefNet: `config.json`, weight, `auto_map` và các file remote-code tương ứng;
- NAF: source commit pin và checkpoint SHA-256 đã xác minh.

Sau khi bốn snapshot pin được tải xong, runner bật offline mode và chặn trực tiếp
`hf_hub_download`; artifact thiếu sẽ fail thay vì tải fallback không pin. Source
local xác nhận các import path Pixal3D, MoGe v2, BiRefNet, NAF và DINO extractor tồn
tại. Nội dung snapshot thật chưa có trong cache local nên kiểm tra file thật trên
revision HF vẫn là **NOT RUN** cho tới Image/runtime download.

### 10.4 Reaper và job bị kẹt

- **PASS:** `begin_pixal3d_dispatch` giữ global lock khi có `spawning/running`;
  token chỉ chuyển `spawning → running` một lần.
- **PASS:** reaper không tự settle `spawning` không có `call_id`, nên không retry
  một spawn có thể đã được Modal nhận.
- **PASS:** `running` có `call_id` được reconciler kiểm tra; chỉ terminal evidence
  mới gọi `settle_pixal3d_call`.
- **PASS:** thêm RPC service-role-only `quarantine_pixal3d_spawn`. RPC khóa row,
  chỉ nhận `spawning + call_id IS NULL + queued/dispatched`, chuyển `settled` và
  fail job nhưng giữ budget reservation. Late worker sẽ fail token trước model/GPU.
- **NOT RUN:** migration chưa apply và RPC chưa chạy với database thật.

### 10.5 Ba lỗi ESLint

| Lỗi | Phân loại |
|---|---|
| `app/api/assistant/route.ts:103 prefer-const` | File không thay đổi trong nhánh preflight; ngoài Pixal3D |
| `app/api/assistant/route.ts:104 prefer-const` | File không thay đổi trong nhánh preflight; ngoài Pixal3D |
| `components/real-interactive-map.tsx:216 react-hooks/immutability` | File không thay đổi; ngoài Pixal3D |

ESLint riêng callback và test callback: **PASS, 0 warning**. ESLint toàn web vẫn
**FAIL: 3 errors/48 warnings** vì quality debt ngoài phạm vi Modal. Typecheck và
52/52 web tests đều PASS.

### 10.6 Ma trận cuối

| Kiểm tra | Trạng thái | Bằng chứng |
|---|---|---|
| MoGe metadata exact set | **PASS** | 17 requirements, missing `[]`, unexpected `[]` |
| Verifier policy unit tests | **PASS** | Reject metadata drift, conflict mới và conflict dự kiến bị thiếu |
| Python tests | **PASS** | 22/22 |
| Python compile | **PASS** | Modal app, runner, verifier, artifact validator |
| PostgreSQL parse | **PASS** | 77 statements |
| Modal definition import | **PASS** | `crafttrust-pixal3d`, không remote execution |
| Web tests/typecheck | **PASS** | 52/52; `tsc --noEmit` exit 0 |
| Targeted callback ESLint | **PASS** | 0 error, 0 warning |
| Full web ESLint | **FAIL** | 3 unrelated errors, 48 warnings |
| Modal Image build / in-image `pip check` | **NOT RUN** | Không dùng Modal Cloud |
| HF snapshot contents tại revision pin | **NOT RUN** | Không có snapshot Pixal3D trong cache local; runtime validator đã thêm |
| L40S imports/pipeline init/inference/GLB | **NOT RUN** | Không dùng GPU |
| Migration integration/apply | **NOT RUN** | Không chạm database |
| Deploy | **NOT RUN** | Chờ phê duyệt riêng |

## 11. Post-deploy Supabase DNS incident — 27/10/2026

### 11.1 Root cause và phạm vi xác minh

- **PASS:** Modal profile hiện tại là `thienta2005`; app `crafttrust-pixal3d` ở
  environment `main` đang deployed.
- **PASS:** Secret duy nhất đúng tên `crafttrust-3d` tồn tại trong `main`, đã được
  dùng gần thời điểm lỗi, và cùng `secrets=[engine_secret]` được gắn vào
  `dispatch_pending`, `reap_stale_jobs`, API và worker. Không đọc/in key.
- **PASS:** log của cả hai scheduled function dừng ở `httpx.ConnectError: [Errno
  -2] Name or service not known`. Dispatcher lỗi ở POST
  `begin_pixal3d_dispatch`; reaper lỗi ngay GET `model_dispatch_outbox`.
- **ROOT CAUSE CONFIRMED:** CPU-only preflight đọc Secret `crafttrust-3d` và fail
  trước network với hostname đã sanitize `your?project?ref.supabase.co`. Dấu `?`
  thay cho ký tự `_`, xác nhận `SUPABASE_URL` đã được tạo với literal placeholder
  `https://YOUR_PROJECT_REF.supabase.co`, không phải project ref thật.
- Project URL do owner xác minh là
  `https://uftgqculikjfsuhgzjcd.supabase.co`; local DNS trả `104.18.38.10` và
  `172.64.149.246`, TCP 443 PASS qua Cloudflare WARP. Lỗi production vì vậy nằm ở
  giá trị Secret, không phải DNS của hostname đúng.
- Lỗi xảy ra trước TCP/TLS/HTTP, nên chưa thể kết luận service-role key đúng/sai
  (401/403) hoặc migration/RPC đã có (HTTP/PostgREST/OpenAPI). `/health` không truy
  cập Supabase nên 200 không kiểm chứng kết nối DB.

### 11.2 Hardening đã thực hiện

- `CraftTrustStorage.from_environment()` là đường khởi tạo duy nhất cho API,
  dispatcher, reaper, smoke và GPU job handler.
- URL fail-fast trước network: chỉ chấp nhận
  `https://<20-char-project-ref>.supabase.co`, không credentials, port, path, query
  hay fragment; service-role key rỗng cũng fail-fast.
- Exception chỉ chứa error code, hostname công khai đã sanitize, operation và HTTP
  status. Không chứa key, request/response body hay URL có query.
- Reconciler không nuốt lỗi DNS/auth/schema: nó log các trường đã sanitize rồi
  fail scheduled run; lỗi kiểm tra trạng thái Modal không chắc chắn vẫn được giữ
  fail-closed và không settle/re-dispatch job.
- Phân loại riêng: `SUPABASE_DNS_RESOLUTION_FAILED`, connect/request timeout,
  `SUPABASE_AUTH_FAILED` (401/403), `SUPABASE_RPC_NOT_FOUND` (404) và HTTP khác.
- Thêm `supabase_preflight` dùng `web_image`, không GPU/schedule. Probe chỉ GET
  `/rest/v1/` OpenAPI, kiểm tra `model_dispatch_outbox`, `model_jobs` và sáu RPC;
  không gọi RPC, không tạo/lease job và không inference.

Sáu RPC của hai scheduled flow đều được định nghĩa và grant `service_role` trong
`202610260001_pixal3d_modal_engine.sql`: `begin_pixal3d_dispatch`,
`mark_pixal3d_dispatched`, `record_pixal3d_result`, `apply_pixal3d_result`,
`reap_stale_pixal3d_jobs`, `settle_pixal3d_call`.

### 11.3 Verification matrix

| Kiểm tra | Trạng thái | Bằng chứng |
|---|---|---|
| Secret name/environment/attachment | **PASS** | `crafttrust-3d`, `main`, cả hai scheduled functions dùng cùng Secret |
| DNS vs auth/RPC classification | **PASS** | Runtime fail trước HTTP; unit tests mô phỏng DNS, 401/403 và RPC 404 |
| URL/key fail-fast và redaction | **PASS** | Test placeholder/path/query/credentials/port/domain/key rỗng |
| Scheduled RPC ↔ migration contract | **PASS** | 6/6 function definitions và 6/6 grants được static test |
| CPU-only preflight purity | **PASS** | GET OpenAPI bằng `web_image`; không GPU/job/mutating RPC |
| Targeted Python tests | **PASS** | 32/32 |
| Python compile / Modal definition import | **PASS** | Không remote execution |
| Project hostname đúng | **PASS** | `uftgqculikjfsuhgzjcd.supabase.co`: DNS A và TCP 443 PASS |
| Hostname trong Modal Secret | **PASS** | Đã sửa thành `uftgqculikjfsuhgzjcd.supabase.co`; preflight đọc đúng host |
| Service credential | **PASS** | OpenAPI trả thành công với `authenticated: true`; không lộ key |
| Migration production (functional schema) | **PASS** | `model_dispatch_outbox`, `model_jobs` và 6/6 RPC đều hiện diện |
| Persistent deploy / GPU / inference | **NOT RUN** | Chủ động không thực hiện |

Thay đổi Python chỉ làm đổi source layer cuối của `web_image`/`gpu_image`. Các layer
apt, PyTorch, CuMesh, FlexGEMM, o-voxel và verifier phía trước giữ nguyên hash nên
Modal có thể tái sử dụng cache; không có `force_build=True`.

### 11.4 Kết quả CPU-only production preflight

Operator chạy `modal run --env main ...::check_supabase`; ephemeral app hoàn tất và
tự dừng. Kết quả: `ok: true`, `authenticated: true`, hostname đúng, `missingRpcs: []`
và `missingTables: []`. Việc này xác minh DNS/TLS/auth/PostgREST schema nhưng không
gọi GPU worker, không tạo/lease job, không inference và không persistent deploy.
