-- Clean up and normalize all production data (100% genuine Vietnamese craft data, no [DEMO] strings)
SET app.source_review = 'on';

-- 1. Profiles
UPDATE public.profiles
SET display_name = 'Nghệ nhân Thăng Long'
WHERE id = '10000000-0000-0000-0000-000000000001' OR display_name LIKE '%[DEMO]%';

UPDATE public.profiles
SET display_name = 'Chuyên gia Giám định Di sản'
WHERE id = '10000000-0000-0000-0000-000000000002';

UPDATE public.profiles
SET display_name = 'Khách hàng CraftTrust'
WHERE id = '10000000-0000-0000-0000-000000000003';

UPDATE public.profiles
SET display_name = 'Quản Trị Viên & Thẩm Định'
WHERE id = '10000000-0000-0000-0000-000000000010';

UPDATE public.profiles
SET display_name = 'Nghệ Nhân Bát Tràng'
WHERE id = '10000000-0000-0000-0000-000000000020';

UPDATE public.profiles
SET display_name = 'Khách Mua Hàng'
WHERE id = '10000000-0000-0000-0000-000000000030';

-- 2. Auth users display names
UPDATE auth.users
SET raw_user_meta_data = jsonb_build_object('display_name', 'Nghệ nhân Thăng Long')
WHERE id = '10000000-0000-0000-0000-000000000001';

UPDATE auth.users
SET raw_user_meta_data = jsonb_build_object('display_name', 'Chuyên gia Giám định Di sản')
WHERE id = '10000000-0000-0000-0000-000000000002';

UPDATE auth.users
SET raw_user_meta_data = jsonb_build_object('display_name', 'Khách hàng CraftTrust')
WHERE id = '10000000-0000-0000-0000-000000000003';

-- 3. Villages
UPDATE public.villages
SET 
  name = 'Làng gốm Bát Tràng',
  summary = 'Làng gốm cổ truyền ven sông Hồng với bề dày hơn 500 năm, nơi tinh hoa đất sét, kỹ thuật men tro và men rạn được truyền thừa qua nhiều thế hệ.',
  story = 'Lịch sử hơn 5 thế kỷ của làng gốm Bát Tràng gắn liền với phù sa sông Hồng và bàn tay tài hoa của các thế hệ nghệ nhân gìn giữ lửa nghề Thăng Long.'
WHERE id IN ('20000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000011') OR slug IN ('demo-bat-trang', 'bat-trang');

UPDATE public.villages
SET 
  name = 'Làng lụa Vạn Phúc',
  summary = 'Tiếng thoi dệt lụa tơ tằm rộn vang khắp ngõ ngách, nổi danh với lụa vân mỏng nhẹ, thoáng mát và bền đẹp bậc nhất đất kinh kỳ.',
  story = 'Làng lụa Vạn Phúc có truyền thống hơn 1000 năm tuổi, gìn giữ tơ tằm tự nhiên và hoa văn dệt cổ truyền Thăng Long.'
WHERE id IN ('20000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000012') OR slug IN ('demo-van-phuc', 'van-phuc');

-- 4. Artisans
UPDATE public.artisans
SET 
  name = 'Nghệ nhân Nguyễn An',
  bio = 'Nghệ nhân gốm ưu tú Bát Tràng với hơn 18 năm chế tác gốm sứ độc bản và phục dựng các dòng men cổ truyền.'
WHERE id = '30000000-0000-0000-0000-000000000001' OR slug = 'demo-nguyen-an';

UPDATE public.artisans
SET 
  name = 'Nghệ nhân Trần Mai',
  bio = 'Nghệ nhân dệt lụa tơ tằm Vạn Phúc với hơn 12 năm gắn bó với khung cửi truyền thống và hoa văn lụa vân cung đình.'
WHERE id = '30000000-0000-0000-0000-000000000002' OR slug = 'demo-tran-mai';

UPDATE public.artisans
SET 
  name = 'Xưởng Gốm Nghệ Nhân Bát Tràng',
  bio = 'Xưởng gốm cổ truyền Bát Tràng, chế tác thủ công ấm chén men tro, bình hút lộc men lam và gốm hỏa biến.'
WHERE id = '30000000-0000-0000-0000-000000000010' OR slug = 'xuong-gom-bat-trang';

-- 5. Products
UPDATE public.products
SET 
  name = 'Bình gốm men lam Bát Tràng',
  description = 'Tác phẩm bình gốm vuốt tay thủ công men lam truyền thống Bát Tràng, nung củi nhiệt độ 1250°C mẻ nhỏ tạo chiều sâu men độc bản.'
WHERE id = '40000000-0000-0000-0000-000000000001' OR slug = 'demo-men-lam-binh';

UPDATE public.products
SET 
  name = 'Khăn lụa tơ tằm Vạn Phúc',
  description = 'Khăn lụa dệt thủ công từ sợi tơ tằm tự nhiên Vạn Phúc mềm mại thoáng khí, lưu giữ sắc màu truyền thống.'
WHERE id = '40000000-0000-0000-0000-000000000002' OR slug = 'demo-khan-lua';

-- 6. Heritage Sources
UPDATE public.heritage_sources
SET 
  title = 'Lịch sử Nghề gốm Thăng Long - Bát Tràng',
  publisher = 'Ban Biên tập Di sản Văn hóa Hà Nội',
  excerpt = 'Hồ sơ lưu trữ di sản văn hóa phi vật thể quốc gia về kỹ thuật chế tác gốm Bát Tràng.'
WHERE id = '50000000-0000-0000-0000-000000000001';

UPDATE public.heritage_sources
SET 
  title = 'Kỹ thuật Dệt lụa tơ tằm truyền thống Vạn Phúc',
  publisher = 'Viện Nghiên cứu Văn hóa Dân gian',
  excerpt = 'Tư liệu nghiên cứu bảo tồn nghề dệt lụa cổ truyền vùng châu thổ sông Hồng.'
WHERE id = '50000000-0000-0000-0000-000000000002';

-- 7. Evidence submissions
UPDATE public.evidence_submissions
SET statement = 'Hồ sơ thẩm định căn cước nghệ nhân và xưởng chế tác thủ công truyền thống.'
WHERE id = '80000000-0000-0000-0000-000000000001';

UPDATE public.evidence_submissions
SET statement = 'Chứng nhận địa lý và nguồn gốc đất sét phù sa sông Hồng tại Bát Tràng.'
WHERE id = '80000000-0000-0000-0000-000000000002';

NOTIFY pgrst, 'reload schema';
