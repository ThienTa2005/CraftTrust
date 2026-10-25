# Deploy worker 3D miễn phí cho bản demo

Phương án: website hiện tại ở `craft-trust.vercel.app`; một project Vercel riêng chạy worker; cả hai dùng cùng Supabase cloud. Không thay Root Directory hoặc project liên kết của website đang chạy.

Gói triển khai được tạo từ mã nguồn hiện tại, chỉ chứa worker Node/Python và cấu hình Docker. Không sao chép `.env.local`, tài khoản hay khóa từ máy. Đây là bộ dựng gốm CPU hiện có, không cài mô hình AI cần GPU.

Kiểm tra local ngày 25/10/2026: Docker build thành công; smoke test dựng ảnh một mặt và hai mặt đạt trong container giới hạn 1 CPU/2 GiB. File GLB mẫu hợp lệ khoảng 2,4 MB, nằm dưới giới hạn bucket 50 MB. Bộ test chất lượng cũ `test_pipeline.py` vẫn không đạt mục tiêu tối ưu dưới 2 MB; chưa sửa mục tiêu hoặc thuật toán để che lỗi này. Các kiểm tra đó không thay thế kiểm thử trên Supabase/Vercel production.

## Điều kiện miễn phí

Theo tài liệu kiểm tra ngày 25/10/2026, Vercel Daemons đang public beta, hỗ trợ Hobby với 1 hoặc 2 GiB RAM và quota **5 Active CPU-hours/tháng/team**. Hết quota, daemon dừng đến tháng sau hoặc khi nâng gói. Hobby dành cho dự án cá nhân, phi thương mại; không coi cấu hình này là dịch vụ production miễn phí vô hạn. Kiểm tra tài khoản đang chọn là Hobby, không phải team Pro tính phí.

Nguồn: [Daemons](https://vercel.com/docs/daemons), [hạn mức](https://vercel.com/docs/daemons/limits), [Hobby](https://vercel.com/docs/plans/hobby).

## 1. Xác định đúng Supabase production

Trong Vercel, mở **project website** → Settings → Environment Variables. Xem `NEXT_PUBLIC_SUPABASE_URL` của Production và tìm đúng Supabase project tương ứng. Worker phải dùng cùng URL, dạng `https://<project-ref>.supabase.co`, không dùng `localhost` hoặc `127.0.0.1`.

Trong Supabase project đó, lấy URL và secret key ở phần Connect/API Keys. Worker hỗ trợ `SUPABASE_SECRET_KEY` (khóa mới) hoặc `SUPABASE_SERVICE_ROLE_KEY` (khóa legacy). Chỉ cấu hình một loại để tránh nhầm khóa cũ. Không đặt khóa này vào biến có tiền tố `NEXT_PUBLIC_`, không dán vào chat hoặc commit Git.

## 2. Kiểm tra database

Mở Supabase → SQL Editor. Dán và chạy file `supabase/diagnostics/model-worker-readiness.sql`. Đây là truy vấn chỉ đọc. Các dòng phải có `ready = true`.

Nếu có dòng `false`, chưa deploy worker nhận việc: đối chiếu schema production và áp dụng migration còn thiếu trước. Những migration liên quan gồm:

- `202610240001_product_3d_pipeline.sql`: bảng tác vụ, ảnh và Storage.
- `202610240006_upgrade_3d_pipeline.sql`: engine dựng hình.
- `202610250002_model_governance.sql`: tài sản mô hình và bucket riêng tư.
- `202610250004_digital_passport_trace_and_worker_hardening.sql`: worker ID, heartbeat, nhận tác vụ và timeout.

Không chạy lại cả thư mục migrations hoặc `supabase db reset` trên database có dữ liệu. Repo có `202610240005_production_seed.sql` tạo tài khoản mẫu và cập nhật mật khẩu mẫu. Schema kiểm tra đạt chỉ xác nhận các thành phần chính hiện diện; vẫn phải chạy thử upload thật để kiểm tra quyền và Storage.

## 3. Tạo gói deploy

Mở terminal PowerShell tại thư mục dự án:

```powershell
cd C:\Users\Admin\Downloads\CraftTrust
rtk proxy corepack pnpm model-worker:prepare-cloud
cd outputs\model-worker-cloud
```

Thư mục này có `vercel.json`, `worker/` và `public/`. Thư mục `public/` chỉ chứa trang nhận diện project, không phản ánh sức khỏe worker. Chỉ log và trạng thái job mới xác nhận worker hoạt động.

## 4. Tạo project Vercel riêng

Trong đúng terminal ở `outputs/model-worker-cloud`:

```powershell
rtk proxy npx --yes vercel@latest login
rtk proxy npx --yes vercel@latest link
```

Làm theo lời nhắc đăng nhập. Khi liên kết:

- Chọn tài khoản/team **Hobby** đủ điều kiện.
- Tạo **project mới** tên `crafttrust-model-worker`.
- Thư mục mã nguồn là `./`; nếu hỏi framework, chọn **Other**.
- Không chọn project website hiện có.

Gói đã đặt Output Directory là `public`, còn worker ở `worker/`. Vercel xây Dockerfile của worker và chạy một instance 2 GiB ở Singapore (`sin1`). Cấu hình cho phép tối đa 360 giây kết thúc công việc khi nhận tín hiệu dừng. Cách khai báo theo [Daemon configuration](https://vercel.com/docs/daemons/config-reference).

## 5. Thêm biến môi trường Production

Mở Vercel → **project `crafttrust-model-worker`** → Settings → Environment Variables. Thêm:

| Tên | Giá trị |
| --- | --- |
| `SUPABASE_URL` | URL cloud giống project website |
| `SUPABASE_SECRET_KEY` | Secret key của đúng Supabase project |
| `APP_BASE_URL` | `https://craft-trust.vercel.app` |

Nếu dùng legacy service-role key, thay dòng `SUPABASE_SECRET_KEY` bằng `SUPABASE_SERVICE_ROLE_KEY`. Chọn môi trường **Production**. Container đã đặt `PYTHON_BIN=/opt/venv/bin/python` và chu kỳ kiểm tra hàng đợi 3 giây; không sao chép đường dẫn Python Windows lên cloud. Một worker xử lý tuần tự, nên khi có tác vụ đang chạy thì yêu cầu mới vẫn phải chờ. Kiểm tra thường xuyên giúp nhận việc sớm hơn nhưng tăng số request Supabase và một phần CPU cho kết nối HTTPS.

Có thể thêm bằng CLI thay cho dashboard; lệnh hỏi giá trị tương tác để không ghi khóa vào lịch sử shell:

```powershell
rtk proxy npx --yes vercel@latest env add SUPABASE_URL production
rtk proxy npx --yes vercel@latest env add SUPABASE_SECRET_KEY production
rtk proxy npx --yes vercel@latest env add APP_BASE_URL production
```

Nguồn: [Vercel environment CLI](https://vercel.com/docs/cli/env).

## 6. Deploy Production

Sau khi biến môi trường và schema đã sẵn sàng:

```powershell
rtk proxy npx --yes vercel@latest --prod
```

Daemons beta chỉ chạy Production, nên phải có `--prod`. Kiểm tra CLI đang deploy project `crafttrust-model-worker`, không phải project website.

Mở Logs của project worker. Bình thường sẽ thấy thông báo dạng:

```text
[model-worker] ID: worker-... ready; polling every 3000 ms
```

Nếu tài khoản/API báo không hỗ trợ `daemons`, dừng tại đó và kiểm tra quyền dùng beta. Không tự đổi sang gói trả phí để tiếp tục. Hướng dẫn này không thể bảo đảm tính năng beta được bật trên mọi tài khoản.

## 7. Kiểm thử trên website thật

Mở `https://craft-trust.vercel.app/seller`, đăng nhập tài khoản người bán và tải một ảnh thử. Job cũ còn `queued` trong cùng database cũng sẽ được worker nhận tự động; job đã `failed` cần bấm Tạo lại 3D sau khi xử lý nguyên nhân.

Trong Vercel Logs phải xuất hiện lần lượt:

```text
[model-worker] claimed job ... for product ...
[model-worker] successfully completed job ...
```

Trong Supabase SQL Editor có thể kiểm tra:

```sql
select p.name, p.model_status,
       j.status as job_status, j.current_step, j.progress,
       j.started_at, j.finished_at, j.error
from public.model_jobs j
join public.products p on p.id = j.product_id
order by j.created_at desc
limit 10;
```

Kết quả mong đợi: job `completed`, progress `100`, sản phẩm `review`; người bán xem được GLB. `ready` trong log khởi động hoặc trang HTML trả HTTP 200 chưa đủ chứng minh dựng hình thành công.

Sau đó thử từ điện thoại hoặc máy khác. Không cần chạy `dev:model-worker` trên laptop. Tốc độ cloud phải đo thực tế; kết quả local trước đó không phải cam kết tốc độ cloud.

Nếu muốn dùng cảnh báo chờ lâu và tiến độ đã sửa, đưa những thay đổi web vào repo Git đang liên kết với Vercel và redeploy **project website** theo quy trình hiện có. Worker vẫn nhận hàng đợi mà không cần web gọi sang một URL worker mới.

## 8. Cập nhật và xử lý lỗi

Mỗi khi sửa code worker, chạy lại `model-worker:prepare-cloud` từ repo rồi deploy lại từ `outputs/model-worker-cloud`. Công cụ giữ liên kết `.vercel` trong thư mục đầu ra nhưng từ chối file lạ để tránh đóng gói nhầm bí mật. Các bản deploy CLI này không tự theo dõi Git; cần chủ động đóng gói/deploy lại.

| Lỗi | Kiểm tra |
| --- | --- |
| Không có log worker | Đúng project, đúng Production, daemon một instance, quota còn không |
| `PGRST202` | RPC trong database production và schema cache |
| `Invalid API key` / `401` | Secret key phải thuộc cùng project với URL |
| Worker chạy nhưng không nhận sản phẩm | Web và worker có đang dùng hai Supabase project khác nhau không |
| Thiếu bảng/bucket | Kết quả file kiểm tra schema và migrations liên quan |
| `Killed` / OOM | Đo mức dùng RAM và thử ảnh nhỏ hơn; không hứa 2 GiB đủ mọi ảnh |
| Hết quota Hobby | Worker sẽ ngừng cho đến khi quota được khôi phục; không bấm tạo lại liên tục |

Xem Usage của team Vercel để theo dõi CPU. Quota thuộc cả team, không phải từng project. Supabase Storage/băng thông có hạn mức riêng; không có gói miễn phí vô hạn cho toàn hệ thống.
