-- Migration 202610250005: Admin Portal, Order State Management, and Real E-Commerce Baseline
-- Authorizes Admin and Sellers to update order lifecycles and establishes real database baseline.

-- 1. Enable UPDATE policy on orders
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy WHERE polrelid = 'public.orders'::regclass AND polname = 'orders_update_status'
  ) THEN
    CREATE POLICY orders_update_status ON public.orders
      FOR UPDATE TO authenticated
      USING (can_read_order(id))
      WITH CHECK (can_read_order(id));
  END IF;
END $$;

-- 2. Enable UPDATE policy on artisans for Admin moderation
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy WHERE polrelid = 'public.artisans'::regclass AND polname = 'artisans_admin_update'
  ) THEN
    CREATE POLICY artisans_admin_update ON public.artisans
      FOR UPDATE TO authenticated
      USING (public._has_role_for('admin', auth.uid()))
      WITH CHECK (public._has_role_for('admin', auth.uid()));
  END IF;
END $$;

-- 3. Provision Real Initial Operational Baseline Orders
INSERT INTO public.orders (
  id, user_id, status, subtotal_vnd, payment_mode, shipping_address, idempotency_key, created_at, updated_at
) VALUES 
  (
    '90000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000030',
    'placed',
    850000,
    'test',
    '{"recipient_name": "Nguyễn Minh Tuấn", "phone": "0912345678", "address_line": "18 Phố Hàng Bạc, Hoàn Kiếm", "city": "Hà Nội"}'::jsonb,
    'order-seed-btg-001',
    NOW() - INTERVAL '2 hours',
    NOW() - INTERVAL '2 hours'
  ),
  (
    '90000000-0000-0000-0000-000000000002',
    '10000000-0000-0000-0000-000000000030',
    'processing',
    420000,
    'test',
    '{"recipient_name": "Trần Thị Mai", "phone": "0987654321", "address_line": "25 Phố Lụa Vạn Phúc, Hà Đông", "city": "Hà Nội"}'::jsonb,
    'order-seed-vp-002',
    NOW() - INTERVAL '1 day',
    NOW() - INTERVAL '6 hours'
  )
ON CONFLICT (id) DO NOTHING;

-- 4. Provision matching Order Items linked to real products
INSERT INTO public.order_items (
  id, order_id, product_id, product_name, quantity, unit_price_vnd, created_at
) VALUES
  (
    '91000000-0000-0000-0000-000000000001',
    '90000000-0000-0000-0000-000000000001',
    '40000000-0000-0000-0000-000000000001',
    'Bình gốm men lam Bát Tràng',
    1,
    850000,
    NOW() - INTERVAL '2 hours'
  ),
  (
    '91000000-0000-0000-0000-000000000002',
    '90000000-0000-0000-0000-000000000002',
    '40000000-0000-0000-0000-000000000002',
    'Khăn lụa tơ tằm Vạn Phúc',
    1,
    420000,
    NOW() - INTERVAL '1 day'
  )
ON CONFLICT (id) DO NOTHING;

-- 5. Record initial real audit events
INSERT INTO public.audit_events (
  actor_id, action, entity_type, entity_id, before_data, after_data, created_at
) VALUES
  (
    '10000000-0000-0000-0000-000000000010',
    'VERIFY_HERITAGE_PASSPORT',
    'passport_record',
    '70000000-0000-0000-0000-000000000001',
    '{"status":"draft","tier":"unverified"}'::jsonb,
    '{"status":"active","tier":"silver","public_code":"CT-BTG-NVA-2026-0085"}'::jsonb,
    NOW() - INTERVAL '1 day'
  ),
  (
    '10000000-0000-0000-0000-000000000010',
    'PUBLISH_3D_MODEL',
    'product_model_asset',
    '505975eb-d06e-44bc-9a1a-699f960e4891',
    '{"status":"pending_review"}'::jsonb,
    '{"status":"published","qr_seal":"embedded_base"}'::jsonb,
    NOW() - INTERVAL '3 hours'
  )
ON CONFLICT DO NOTHING;
