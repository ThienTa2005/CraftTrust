-- Production Seed Migration: Provisions standard demo and production role accounts,
-- villages, artisan profiles, and default heritage passport records.

-- 1. Create or update core auth accounts
INSERT INTO auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, email_change, recovery_token, email_change_token_new
) VALUES
  ('00000000-0000-0000-0000-000000000000', '10000000-0000-0000-0000-000000000010', 'authenticated', 'authenticated', 'admin@crafttrust.vn', extensions.crypt('12345678', extensions.gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"display_name":"Quản Trị Viên & Thẩm Định"}', now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '10000000-0000-0000-0000-000000000020', 'authenticated', 'authenticated', 'seller@crafttrust.vn', extensions.crypt('12345678', extensions.gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"display_name":"Nghệ Nhân Bát Tràng"}', now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '10000000-0000-0000-0000-000000000030', 'authenticated', 'authenticated', 'buyer@crafttrust.vn', extensions.crypt('12345678', extensions.gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"display_name":"Khách Mua Hàng"}', now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '10000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'demo.seller@example.invalid', extensions.crypt('12345678', extensions.gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"display_name":"[DEMO] Seller"}', now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '10000000-0000-0000-0000-000000000002', 'authenticated', 'authenticated', 'demo.verifier@example.invalid', extensions.crypt('12345678', extensions.gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"display_name":"[DEMO] Verifier"}', now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '10000000-0000-0000-0000-000000000003', 'authenticated', 'authenticated', 'demo.customer@example.invalid', extensions.crypt('12345678', extensions.gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"display_name":"[DEMO] Customer"}', now(), now(), '', '', '', '')
ON CONFLICT (id) DO UPDATE SET encrypted_password = extensions.crypt('12345678', extensions.gen_salt('bf'));

-- 2. Profiles
INSERT INTO public.profiles(id, display_name)
VALUES
  ('10000000-0000-0000-0000-000000000010', 'Quản Trị Viên & Thẩm Định'),
  ('10000000-0000-0000-0000-000000000020', 'Nghệ Nhân Bát Tràng (Nguyễn An)'),
  ('10000000-0000-0000-0000-000000000030', 'Khách Mua Hàng'),
  ('10000000-0000-0000-0000-000000000001', '[DEMO] Seller'),
  ('10000000-0000-0000-0000-000000000002', '[DEMO] Verifier'),
  ('10000000-0000-0000-0000-000000000003', '[DEMO] Customer')
ON CONFLICT (id) DO NOTHING;

-- 3. User Roles
INSERT INTO public.user_roles(user_id, role)
VALUES
  ('10000000-0000-0000-0000-000000000010', 'customer'),
  ('10000000-0000-0000-0000-000000000010', 'verifier'),
  ('10000000-0000-0000-0000-000000000010', 'admin'),
  ('10000000-0000-0000-0000-000000000020', 'customer'),
  ('10000000-0000-0000-0000-000000000020', 'artisan'),
  ('10000000-0000-0000-0000-000000000020', 'seller'),
  ('10000000-0000-0000-0000-000000000030', 'customer'),
  ('10000000-0000-0000-0000-000000000001', 'customer'),
  ('10000000-0000-0000-0000-000000000001', 'artisan'),
  ('10000000-0000-0000-0000-000000000001', 'seller'),
  ('10000000-0000-0000-0000-000000000002', 'customer'),
  ('10000000-0000-0000-0000-000000000002', 'verifier'),
  ('10000000-0000-0000-0000-000000000002', 'admin'),
  ('10000000-0000-0000-0000-000000000003', 'customer')
ON CONFLICT DO NOTHING;

-- 4. Villages
INSERT INTO public.villages(id, slug, name, district, summary, story, coordinates, cover_image_url, is_published)
VALUES
  ('20000000-0000-0000-0000-000000000001', 'demo-bat-trang', '[DEMO] Bát Tràng', 'Gia Lâm',
   'Làng gốm cổ truyền ven sông Hồng với bề dày hơn 500 năm.',
   'Lịch sử hơn 5 thế kỷ của làng gốm Bát Tràng gắn liền với phù sa sông Hồng.',
   '{"latitude":20.976,"longitude":105.912}'::jsonb,
   'https://images.unsplash.com/photo-1610701596007-11502861dcfa', true),
  ('20000000-0000-0000-0000-000000000002', 'demo-van-phuc', '[DEMO] Vạn Phúc', 'Hà Đông',
   'Tiếng thoi dệt lụa tơ tằm rộn vang khắp ngõ ngách, nổi danh với lụa vân mỏng nhẹ.',
   'Làng lụa Vạn Phúc có truyền thống hơn 1000 năm tuổi.',
   '{"latitude":20.980,"longitude":105.775}'::jsonb,
   'https://images.unsplash.com/photo-1603376335934-d50e8f8e4716', true),
  ('20000000-0000-0000-0000-000000000011', 'bat-trang', 'Làng gốm Bát Tràng', 'Gia Lâm',
   'Làng gốm cổ truyền ven sông Hồng với bề dày hơn 500 năm, nơi tinh hoa đất sét và kỹ thuật men rạn được truyền thừa qua nhiều thế hệ.',
   'Lịch sử hơn 5 thế kỷ của làng gốm Bát Tràng gắn liền với phù sa sông Hồng và bàn tay tài hoa của các thế hệ nghệ nhân.',
   '{"latitude":20.976,"longitude":105.912}'::jsonb,
   'https://images.unsplash.com/photo-1610701596007-11502861dcfa', true),
  ('20000000-0000-0000-0000-000000000012', 'van-phuc', 'Làng lụa Vạn Phúc', 'Hà Đông',
   'Tiếng thoi dệt lụa tơ tằm rộn vang khắp ngõ ngách, nổi danh với lụa vân mỏng nhẹ, thoáng mát và bền đẹp bậc nhất đất kinh kỳ.',
   'Làng lụa Vạn Phúc có truyền thống hơn 1000 năm tuổi, gìn giữ tơ tằm tự nhiên và hoa văn dệt cổ truyền Thăng Long.',
   '{"latitude":20.980,"longitude":105.775}'::jsonb,
   'https://images.unsplash.com/photo-1603376335934-d50e8f8e4716', true)
ON CONFLICT (id) DO NOTHING;

-- 5. Artisans
INSERT INTO public.artisans(id, village_id, owner_id, slug, name, bio, portrait_url, years_practicing, is_published)
VALUES
  ('30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'demo-nguyen-an', 'Nghệ nhân Nguyễn An', 'Nghệ nhân gốm ưu tú Bát Tràng với hơn 18 năm chế tác gốm sứ độc bản.', null, 18, true),
  ('30000000-0000-0000-0000-000000000010', '20000000-0000-0000-0000-000000000011', '10000000-0000-0000-0000-000000000020', 'xuong-gom-bat-trang', 'Xưởng Gốm Nghệ Nhân Bát Tràng', 'Xưởng gốm cổ truyền Bát Tràng, chế tác thủ công ấm chén men tro, bình hút lộc men lam và gốm hỏa biến.', null, 25, true)
ON CONFLICT (slug) DO UPDATE SET owner_id = EXCLUDED.owner_id;

-- 6. Products
INSERT INTO public.products(id, artisan_id, slug, name, description, price_vnd, stock_quantity, status, poster_url)
VALUES
  ('40000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', 'demo-men-lam-binh', 'Bình gốm men lam Bát Tràng', 'Tác phẩm bình gốm vuốt tay thủ công men lam truyền thống Bát Tràng.', 850000, 12, 'active', 'https://images.unsplash.com/photo-1578749556568-bc2c40e68b61'),
  ('40000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000001', 'demo-khan-lua', 'Khăn lụa tơ tằm Vạn Phúc', 'Khăn lụa dệt thủ công từ tơ tằm tự nhiên Vạn Phúc mềm mại thoáng khí.', 420000, 20, 'active', 'https://images.unsplash.com/photo-1601924994987-69e26d50dc26')
ON CONFLICT (id) DO NOTHING;

-- 7. Passport Records
INSERT INTO public.passport_records(id, product_id, public_id, tier, status, issued_at)
VALUES
  ('70000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', '71000000-0000-0000-0000-000000000001', 'bronze', 'active', now())
ON CONFLICT (id) DO NOTHING;

NOTIFY pgrst, 'reload schema';
