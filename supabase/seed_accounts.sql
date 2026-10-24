-- 1. Update existing demo passwords to '12345678'
UPDATE auth.users
SET encrypted_password = extensions.crypt('12345678', extensions.gen_salt('bf'))
WHERE email IN (
  'demo.seller@example.invalid',
  'demo.verifier@example.invalid',
  'demo.customer@example.invalid'
);

-- 2. Make sure demo.verifier has both 'verifier' and 'admin' roles
INSERT INTO public.user_roles(user_id, role)
VALUES
  ('10000000-0000-0000-0000-000000000002', 'admin')
ON CONFLICT DO NOTHING;

-- 3. Create friendly accounts (using ON CONFLICT (id))
INSERT INTO auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, email_change, recovery_token, email_change_token_new
) VALUES
  ('00000000-0000-0000-0000-000000000000', '10000000-0000-0000-0000-000000000010', 'authenticated', 'authenticated', 'admin@crafttrust.vn', extensions.crypt('12345678', extensions.gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"display_name":"Quản Trị Viên & Thẩm Định"}', now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '10000000-0000-0000-0000-000000000020', 'authenticated', 'authenticated', 'seller@crafttrust.vn', extensions.crypt('12345678', extensions.gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"display_name":"Nghệ Nhân Bát Tràng"}', now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '10000000-0000-0000-0000-000000000030', 'authenticated', 'authenticated', 'buyer@crafttrust.vn', extensions.crypt('12345678', extensions.gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"display_name":"Khách Mua Hàng"}', now(), now(), '', '', '', '')
ON CONFLICT (id) DO UPDATE SET encrypted_password = extensions.crypt('12345678', extensions.gen_salt('bf'));

-- Profiles
INSERT INTO public.profiles(id, display_name)
VALUES
  ('10000000-0000-0000-0000-000000000010', 'Quản Trị Viên & Thẩm Định'),
  ('10000000-0000-0000-0000-000000000020', 'Nghệ Nhân Bát Tràng (Nguyễn An)'),
  ('10000000-0000-0000-0000-000000000030', 'Khách Mua Hàng')
ON CONFLICT (id) DO NOTHING;

-- User Roles
INSERT INTO public.user_roles(user_id, role)
VALUES
  ('10000000-0000-0000-0000-000000000010', 'customer'),
  ('10000000-0000-0000-0000-000000000010', 'verifier'),
  ('10000000-0000-0000-0000-000000000010', 'admin'),
  ('10000000-0000-0000-0000-000000000020', 'customer'),
  ('10000000-0000-0000-0000-000000000020', 'artisan'),
  ('10000000-0000-0000-0000-000000000020', 'seller'),
  ('10000000-0000-0000-0000-000000000030', 'customer')
ON CONFLICT DO NOTHING;

-- Link seller@crafttrust.vn to artisan record
INSERT INTO public.artisans(id, village_id, owner_id, slug, name, bio, years_practicing, is_published)
VALUES (
  '30000000-0000-0000-0000-000000000010',
  '20000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000020',
  'xuong-gom-bat-trang',
  'Xưởng Gốm Nghệ Nhân Bát Tràng',
  'Xưởng gốm cổ truyền Bát Tràng, chế tác thủ công ấm chén men tro, bình hút lộc men lam và gốm hỏa biến.',
  25,
  true
)
ON CONFLICT (slug) DO UPDATE SET owner_id = '10000000-0000-0000-0000-000000000020';
