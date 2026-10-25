# Hanoi Craft-Trust

Nền tảng khám phá di sản và thương mại thủ công dành cho các làng nghề Hà Nội. Repository này là một pnpm monorepo gồm website Next.js, ứng dụng Expo, Zalo Mini App, các package TypeScript dùng chung và backend Supabase/PostgreSQL.

## Chạy nhanh website

Chế độ này không cần Docker hoặc Supabase. Website sử dụng dữ liệu demo và luôn hiển thị nhãn để không bị nhầm với dữ liệu thật.

### Yêu cầu

- Node.js 22 trở lên
- Corepack đi kèm Node.js
- Git

### Các bước

```powershell
corepack enable
corepack pnpm install
corepack pnpm dev:web
```

Mở <http://localhost:3000>.

Muốn dừng server, nhấn `Ctrl+C` trong terminal đang chạy.

## Chạy đầy đủ với Supabase local

Chế độ này cung cấp PostgreSQL, Supabase Auth, REST API, RLS, migrations và dữ liệu demo cho các luồng đăng nhập, giỏ hàng, đơn hàng và xác minh hộ chiếu sản phẩm.

### Yêu cầu bổ sung

- Docker Desktop đang chạy
- Docker Engine dùng Linux containers
- Các cổng `55320` đến `55326` chưa bị ứng dụng khác sử dụng

### 1. Cài dependencies

Tại thư mục gốc của repository:

```powershell
corepack enable
corepack pnpm install
```

### 2. Khởi động Supabase

```powershell
corepack pnpm supabase:start
corepack pnpm supabase:reset
corepack pnpm supabase:status
```

- `supabase:start` khởi động PostgreSQL, Auth, API và Supabase Studio.
- `supabase:reset` áp dụng migrations rồi nạp `supabase/seed.sql`.
- `supabase:status` hiển thị API URL, anon key và địa chỉ Studio.

Thiết lập mặc định của repository:

| Dịch vụ         | Địa chỉ                  |
| --------------- | ------------------------ |
| Supabase API    | `http://127.0.0.1:55321` |
| PostgreSQL      | `127.0.0.1:55322`        |
| Supabase Studio | `http://127.0.0.1:55323` |
| Mailpit         | `http://127.0.0.1:55324` |
| Website         | `http://localhost:3000`  |

### 3. Cấu hình website

Tạo file cấu hình từ mẫu:

```powershell
Copy-Item .env.example apps/web/.env.local
```

Mở `apps/web/.env.local`, sau đó điền URL và anon key lấy từ `corepack pnpm supabase:status`:

```env
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:55321
NEXT_PUBLIC_SUPABASE_ANON_KEY=ANON_KEY_TU_SUPABASE_STATUS
NEXT_PUBLIC_SITE_URL=http://localhost:3000
ENABLE_TEST_CHECKOUT=true
```

Các biến còn lại có thể để trống khi chỉ chạy chức năng cơ bản. Nếu muốn sử dụng trợ lý AI, bổ sung khóa và model mà tài khoản của bạn có quyền truy cập:

```env
OPENAI_API_KEY=YOUR_SERVER_ONLY_KEY
OPENAI_MODEL=YOUR_AVAILABLE_MODEL
```

Không đưa `SUPABASE_SERVICE_ROLE_KEY` hoặc `OPENAI_API_KEY` vào mã nguồn, browser bundle hay Git.

### 4. Chạy website

Mở terminal mới tại thư mục gốc:

```powershell
corepack pnpm dev:web
```

Mở <http://localhost:3000>. Website mặc định dùng tiếng Việt và cho phép chuyển sang tiếng Anh.

### 4.1. Bật quy trình tạo sản phẩm 3D

**Web chạy một mình không xử lý hàng đợi 3D.** Sau khi cấu hình Python và worker bên dưới, dùng `corepack pnpm dev:3d` để chạy cả web và worker trong cùng terminal. Với bản đã build, dùng `corepack pnpm start:3d`. Hai lệnh này dành cho máy có cài Python và cấu hình service-role; môi trường demo chỉ xem web vẫn dùng `dev:web`.

Chức năng 3D cần thêm Python worker vì việc tách nền và dựng GLB không chạy trong tiến trình Next.js. Cài Python 3.11+ rồi tạo môi trường riêng:

```powershell
py -3 -m venv services/model-worker/.venv
services/model-worker/.venv/Scripts/python -m pip install -r services/model-worker/requirements.txt
```

Tạo `.env.local` ở thư mục gốc của repository và điền service-role key lấy từ `corepack pnpm supabase:status`:

```env
SUPABASE_URL=http://127.0.0.1:55321
SUPABASE_SERVICE_ROLE_KEY=SERVICE_ROLE_KEY_TU_SUPABASE_STATUS
PYTHON_BIN=.venv/Scripts/python.exe
MODEL_WORKER_POLL_MS=3000
```

Mở terminal thứ ba tại thư mục gốc:

```powershell
corepack pnpm dev:model-worker
```

Sau đó đăng nhập tài khoản người bán, mở <http://localhost:3000/seller>, tải 1–4 ảnh và nhập thông số. Luồng hoàn chỉnh là:

1. sản phẩm được lưu ở trạng thái bản nháp;
2. ảnh nguồn riêng tư được worker dùng để dựng GLB;
3. nghệ nhân xoay, phóng to và kiểm tra bản 3D;
4. chỉ khi bấm **Duyệt & xuất bản**, sản phẩm mới hiện cho người mua.

Máy dựng hiện tối ưu cho bình, lọ, chén và đồ gốm gần đối xứng quanh trục. Mặt sau, lòng gốm và độ dày thành là dữ liệu suy diễn; ảnh phụ được lưu để đối chiếu nhưng chưa phải photogrammetry đa góc. Xem chi tiết tại [Quy trình sản phẩm 3D](docs/3D-MODEL-PIPELINE.md).

### 5. Tài khoản demo

Sau `supabase:reset`, có thể đăng nhập bằng các tài khoản sau:

| Vai trò        | Email                           | Mật khẩu                         |
| -------------- | ------------------------------- | -------------------------------- |
| Người bán      | `demo.seller@example.invalid`   | `demo-password-never-production` |
| Người xác minh | `demo.verifier@example.invalid` | `demo-password-never-production` |
| Khách hàng     | `demo.customer@example.invalid` | `demo-password-never-production` |

Đây chỉ là fixture local. Không dùng các tài khoản hoặc mật khẩu này trong production.

Trang `/auth` hỗ trợ đăng nhập và đăng ký bằng email/mật khẩu. Khi đăng ký:

- chọn **Mua hàng** để nhận quyền khách hàng;
- chọn **Bán hàng** để nhận cả quyền mua hàng, quyền người bán và một hồ sơ nghệ nhân Bát Tràng;
- sau khi đăng nhập, header hiển thị tài khoản cùng nút **Đăng xuất**;
- production có thể bật xác nhận email trong Supabase; local hiện đăng nhập ngay để kiểm thử thuận tiện.

### 5.1. Luồng sàn thương mại điện tử

**Người mua** dùng giao diện cửa hàng tại `/marketplace`: xem ảnh và mô hình 3D, thêm sản phẩm vào giỏ, đổi số lượng, xóa khỏi giỏ, checkout thử nghiệm và theo dõi đơn tại `/orders`.

**Người bán** dùng dashboard riêng tại `/seller`:

- xem thống kê sản phẩm, tiến độ tạo 3D, đơn bán và doanh thu thử nghiệm;
- thêm sản phẩm với mô tả, giá, tồn kho, kích thước và 1–4 ảnh;
- sửa thông tin; nếu thay ảnh, hệ thống tự đưa sản phẩm về bản nháp và tạo lại 3D;
- xóa sản phẩm chưa phát sinh đơn; sản phẩm đã có đơn chỉ được lưu trữ để không làm mất lịch sử mua bán;
- chỉ đọc và quản lý dữ liệu thuộc gian hàng của mình nhờ Supabase RLS.

Checkout hiện là chế độ nội bộ `test`, chưa thu tiền thật. Trước khi triển khai production cần tích hợp cổng thanh toán và webhook xác nhận giao dịch.

### 6. Dừng Supabase

```powershell
corepack pnpm supabase:stop
```

## Chạy ứng dụng mobile

Ứng dụng mobile không tự chuyển sang dữ liệu demo khi thiếu cấu hình. Nó phải kết nối tới cùng Supabase project với website.

### Cấu hình

```powershell
Copy-Item apps/mobile/.env.example apps/mobile/.env
```

Điền các giá trị:

```env
EXPO_PUBLIC_SUPABASE_URL=http://127.0.0.1:55321
EXPO_PUBLIC_SUPABASE_ANON_KEY=ANON_KEY_TU_SUPABASE_STATUS
EXPO_PUBLIC_PASSPORT_BASE_URL=http://localhost:3000/passport
```

### Khởi động

```powershell
corepack pnpm dev:mobile
```

Trong Expo CLI:

- nhấn `w` để mở bản web;
- nhấn `a` để mở Android emulator;
- quét QR bằng Expo Go hoặc development build để mở trên thiết bị thật.

Có thể chạy thẳng bản web bằng:

```powershell
corepack pnpm --filter @craft-trust/mobile web
```

Khi chạy trên điện thoại thật, `127.0.0.1` và `localhost` trỏ tới chính điện thoại, không phải máy tính. Cách đơn giản nhất là dùng một Supabase project trên cloud; nếu dùng backend local, hãy thay các URL bằng địa chỉ LAN mà điện thoại truy cập được và bảo đảm firewall cho phép kết nối.

## Chạy Zalo Mini App preview

### Cấu hình

```powershell
Copy-Item apps/zalo-mini-app/.env.example apps/zalo-mini-app/.env
```

Điền các biến sau:

```env
VITE_SUPABASE_URL=http://127.0.0.1:55321
VITE_SUPABASE_ANON_KEY=ANON_KEY_TU_SUPABASE_STATUS
VITE_PASSPORT_BASE_URL=http://localhost:3000/passport
VITE_ZALO_APP_ID=YOUR_ZALO_MINI_APP_ID
```

Nếu chỉ xem giao diện trong browser, có thể dùng một App ID thử nghiệm. Để đóng gói và phát hành thật, cần App ID được cấp cùng quy trình review của Zalo.

### Khởi động browser preview

```powershell
corepack pnpm dev:zalo
```

Mở URL mà Vite in ra terminal, thường là <http://localhost:5173>.

Browser preview không chứng minh ứng dụng đã được đóng gói hoặc chấp thuận trên nền tảng Zalo.

## Chạy nhiều thành phần cùng lúc

Nên dùng các terminal riêng để log dễ đọc:

```text
Terminal 1: corepack pnpm supabase:start
Terminal 2: corepack pnpm dev:web
Terminal 3: corepack pnpm dev:model-worker
Terminal 4: corepack pnpm dev:mobile
Terminal 5: corepack pnpm dev:zalo
```

Có thể dùng `corepack pnpm dev` để chạy đồng thời tất cả workspace có script `dev`, nhưng cách này tạo nhiều log xen kẽ.

## Kiểm tra chất lượng

Chạy toàn bộ lint, typecheck, unit test và production build:

```powershell
corepack pnpm check
```

Hoặc chạy riêng từng bước:

```powershell
corepack pnpm lint
corepack pnpm typecheck
corepack pnpm test
corepack pnpm build
corepack pnpm test:e2e
```

Kiểm tra database/RLS khi Supabase local đang chạy:

```powershell
corepack pnpm exec supabase test db
```

## Các lệnh thường dùng

| Lệnh                              | Mục đích                                       |
| --------------------------------- | ---------------------------------------------- |
| `corepack pnpm dev:web`           | Chạy website Next.js                           |
| `corepack pnpm dev:model-worker`  | Chạy worker tạo mô hình gốm 3D                 |
| `corepack pnpm model-worker:once` | Xử lý một job 3D rồi thoát                     |
| `corepack pnpm dev:mobile`        | Chạy Expo development server                   |
| `corepack pnpm dev:zalo`          | Chạy Zalo browser preview                      |
| `corepack pnpm supabase:start`    | Khởi động Supabase local                       |
| `corepack pnpm supabase:reset`    | Tạo lại database, chạy migrations và seed demo |
| `corepack pnpm supabase:status`   | Xem URL, keys và trạng thái dịch vụ            |
| `corepack pnpm supabase:stop`     | Dừng Supabase local                            |
| `corepack pnpm check`             | Chạy toàn bộ quality gates                     |

## Cấu trúc workspace

```text
apps/web             Website Next.js
apps/mobile          Ứng dụng Expo Router
apps/zalo-mini-app   Zalo Mini App React/Vite shell
services/model-worker Worker Python/Node dựng và tải mô hình GLB
packages/contracts   Domain types và Zod schemas dùng chung
packages/api-client  Supabase client và test adapter
supabase             Migrations, RLS, RPC, database tests và demo seed
tests/e2e            Playwright smoke tests
docs                 Tài liệu kiến trúc và trạng thái kiểm thử
```

## Xử lý lỗi thường gặp

### `supabase:start` không chạy

- Mở Docker Desktop và chờ Docker Engine sẵn sàng.
- Kiểm tra các cổng `55320`–`55326` có đang bị chiếm không.
- Chạy lại `corepack pnpm supabase:start`.

### Website vẫn hiển thị `DEMO DATA`

- Kiểm tra `apps/web/.env.local` đã tồn tại.
- So sánh URL và anon key với kết quả `corepack pnpm supabase:status`.
- Khởi động lại Next.js sau khi sửa biến môi trường.
- Đảm bảo đã chạy `corepack pnpm supabase:reset` ít nhất một lần.

### Mobile hoặc Zalo báo thiếu cấu hình

- Đặt `.env` đúng trong `apps/mobile` hoặc `apps/zalo-mini-app`.
- Khởi động lại Expo/Vite sau khi sửa file.
- Trên điện thoại thật, không dùng `localhost` để truy cập máy tính.

### Đăng nhập được nhưng không thấy đúng chức năng

Quyền truy cập được kiểm soát bằng PostgreSQL Row Level Security. Hãy đăng nhập đúng tài khoản demo tương ứng với vai trò cần kiểm thử.

## Lưu ý về dữ liệu và thanh toán

- Tất cả bản ghi trong `supabase/seed.sql` đều là dữ liệu demo.
- Checkout hiện chỉ tạo giao dịch thử nghiệm; không có tiền thật được chuyển.
- Evidence upload production cần cấu hình private Storage bucket và signed-upload policy.
- Không dùng demo seed làm dữ liệu di sản thật.

## Tài liệu liên quan

- [Kiến trúc hệ thống](docs/ARCHITECTURE.md)
- [Kết quả kiểm thử](docs/VALIDATION.md)
- [Điều kiện bên ngoài để phát hành](docs/EXTERNAL-PREREQUISITES.md)
- [Quy trình sản phẩm 3D](docs/3D-MODEL-PIPELINE.md)
- [Backend Supabase](supabase/README.md)
- [Ứng dụng mobile](apps/mobile/README.md)
- [Zalo Mini App](apps/zalo-mini-app/README.md)
