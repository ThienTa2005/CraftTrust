-- Digital Heritage Passport, Traceability & 3D Worker Hardening Migration

-- 1. Hardening model_jobs for robust asynchronous execution, heartbeat, and step progression
ALTER TABLE public.model_jobs
  ADD COLUMN IF NOT EXISTS worker_id text,
  ADD COLUMN IF NOT EXISTS heartbeat_at timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS current_step text NOT NULL DEFAULT 'queued',
  ADD COLUMN IF NOT EXISTS progress smallint NOT NULL DEFAULT 0;

-- Function to claim the next job with worker identifier and initial heartbeat
CREATE OR REPLACE FUNCTION public.claim_model_job(p_worker_id text DEFAULT 'worker-default')
RETURNS SETOF public.model_jobs
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN QUERY
  UPDATE public.model_jobs
  SET status = 'processing',
      current_step = 'preprocessing',
      worker_id = p_worker_id,
      heartbeat_at = now(),
      started_at = now(),
      error = null
  WHERE id = (
    SELECT queued.id
    FROM public.model_jobs AS queued
    WHERE queued.status = 'queued'
    ORDER BY queued.created_at
    FOR UPDATE SKIP LOCKED
    LIMIT 1
  )
  RETURNING *;
END;
$$;

-- Function for worker heartbeat and step tracking
CREATE OR REPLACE FUNCTION public.heartbeat_model_job(
  p_job_id uuid,
  p_worker_id text,
  p_step text,
  p_progress smallint DEFAULT 0
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  UPDATE public.model_jobs
  SET heartbeat_at = now(),
      worker_id = p_worker_id,
      current_step = p_step,
      progress = p_progress
  WHERE id = p_job_id;
  RETURN FOUND;
END;
$$;

-- Function to reap stale / abandoned jobs (timeout detection)
CREATE OR REPLACE FUNCTION public.reap_stale_model_jobs(p_timeout_minutes integer DEFAULT 5)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_count integer;
BEGIN
  WITH timed_out AS (
    UPDATE public.model_jobs
    SET status = 'failed',
        finished_at = now(),
        error = 'Xử lý vượt quá giới hạn thời gian (Worker timeout hoặc mất kết nối sau ' || p_timeout_minutes || ' phút)'
    WHERE status = 'processing'
      AND (heartbeat_at < now() - (p_timeout_minutes || ' minutes')::interval)
    RETURNING product_id
  )
  UPDATE public.products p
  SET model_status = 'failed',
      model_error = 'Quá thời gian xử lý dựng mô hình 3D. Vui lòng bấm Thử tạo lại.'
  FROM timed_out t
  WHERE p.id = t.product_id;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_model_job(text) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_model_job(text) TO service_role;

REVOKE ALL ON FUNCTION public.heartbeat_model_job(uuid, text, text, smallint) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.heartbeat_model_job(uuid, text, text, smallint) TO service_role;

REVOKE ALL ON FUNCTION public.reap_stale_model_jobs(integer) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reap_stale_model_jobs(integer) TO service_role;

-- 2. Digital Passport Traceability & Public Identifiers
ALTER TABLE public.passport_records
  ADD COLUMN IF NOT EXISTS public_code text,
  ADD COLUMN IF NOT EXISTS artifact_id text,
  ADD COLUMN IF NOT EXISTS batch_code text,
  ADD COLUMN IF NOT EXISTS qr_placement jsonb DEFAULT '{"enabled":true,"sizePercent":60,"rotation":0,"position":[0,0]}'::jsonb;

CREATE UNIQUE INDEX IF NOT EXISTS passport_records_public_code_idx ON public.passport_records(public_code) WHERE public_code IS NOT NULL;

-- Enable public lookup of passport records by public_code
CREATE POLICY passport_records_public_trace ON public.passport_records
  FOR SELECT TO anon, authenticated
  USING (status = 'active' OR public_code IS NOT NULL);

-- Seed DEMO Passport CT-BTG-NVA-2026-0085
DO $$
DECLARE
  v_product_id uuid := '40000000-0000-0000-0000-000000000001';
  v_demo_code text := 'CT-BTG-NVA-2026-0085';
  v_passport_id uuid;
BEGIN
  SELECT id INTO v_passport_id FROM public.passport_records WHERE product_id = v_product_id;

  IF v_passport_id IS NOT NULL THEN
    UPDATE public.passport_records
    SET public_code = v_demo_code,
        artifact_id = 'ART-BTG-2026-0085',
        batch_code = 'BATCH-2026-Q2-01',
        tier = 'silver',
        status = 'active',
        updated_at = now()
    WHERE id = v_passport_id;
  ELSE
    v_passport_id := '70000000-0000-0000-0000-000000000085';
    INSERT INTO public.passport_records (
      id, product_id, public_id, public_code, artifact_id, batch_code, tier, status, issued_at
    ) VALUES (
      v_passport_id,
      v_product_id,
      '71000000-0000-0000-0000-000000000085',
      v_demo_code,
      'ART-BTG-2026-0085',
      'BATCH-2026-Q2-01',
      'silver',
      'active',
      now()
    );
  END IF;

  INSERT INTO public.qr_identifiers (
    passport_id, token_hash, status, issued_at
  ) VALUES (
    v_passport_id,
    encode(digest(v_demo_code, 'sha256'), 'hex'),
    'active',
    now()
  )
  ON CONFLICT DO NOTHING;
END $$;

-- 3. Seed Verified Real Coordinates for Craft Villages
INSERT INTO public.villages(id, slug, name, district, summary, story, coordinates, cover_image_url, is_published)
VALUES
  ('20000000-0000-0000-0000-000000000021', 'lang-phu-vinh', 'Làng mây tre đan Phú Vinh', 'Chương Mỹ',
   'Làng nghề mây tre đan hơn 400 năm tuổi nổi tiếng với kỹ thuật chẻ nan mỏng như sợi chỉ và đan hoa văn tinh xảo.',
   'Nghệ nhân Phú Vinh sáng tạo ra hàng trăm mẫu sản phẩm mây tre đan mỹ nghệ độc đáo, từ đồ gia dụng đến các tác phẩm nghệ thuật xuất khẩu quốc tế.',
   '{"latitude": 20.8936, "longitude": 105.6983}'::jsonb,
   'https://images.unsplash.com/photo-1544816155-12df9643f363', true),
  ('20000000-0000-0000-0000-000000000022', 'lang-chang-son', 'Làng mộc mỹ nghệ Chàng Sơn', 'Thạch Thất',
   'Cái nôi chạm khắc gỗ cổ truyền xứ Đoài với kỹ thuật mộng gỗ tinh xảo và nghề làm quạt giấy thủ công thanh tao.',
   'Làng mộc Chàng Sơn gắn bó với kiến trúc chùa Tây Phương, nổi danh với kỹ thuật ghép mộng không cần đinh kim loại và các pho tượng Phật tinh xảo.',
   '{"latitude": 21.0345, "longitude": 105.5892}'::jsonb,
   'https://images.unsplash.com/photo-1513519245088-0e12902e5a38', true),
  ('20000000-0000-0000-0000-000000000023', 'lang-quang-phu-cau', 'Làng tăm hương Quảng Phú Cầu', 'Ứng Hòa',
   'Làng nghề tăm hương truyền thống hơn 100 năm tuổi với sắc đỏ rực rỡ và hương thơm thảo mộc tự nhiên.',
   'Quảng Phú Cầu là điểm đến văn hóa di sản nổi tiếng quốc tế, nơi những bó tăm hương xòe rộng như đóa hoa sen nhuộm thắm các sân đình.',
   '{"latitude": 20.7381, "longitude": 105.8087}'::jsonb,
   'https://images.unsplash.com/photo-1606293926075-69a00dbfde81', true),
  ('20000000-0000-0000-0000-000000000024', 'lang-non-chuong', 'Làng nón Chuông', 'Thanh Oai',
   'Làng nghề làm nón lá truyền thống hơn 300 năm bên dòng sông Đáy, tinh hoa nón lá kinh kỳ.',
   'Chiếc nón Chuông được chuốt từ lá lụi, khâu bằng sợi móc tinh tế, là biểu tượng duyên dáng của người phụ nữ Thăng Long - Hà Nội.',
   '{"latitude": 20.8497, "longitude": 105.7788}'::jsonb,
   'https://images.unsplash.com/photo-1583417319070-4a69db38a482', true)
ON CONFLICT (id) DO UPDATE SET
  coordinates = EXCLUDED.coordinates,
  summary = EXCLUDED.summary;

-- Update existing villages with verified coordinates
UPDATE public.villages
SET coordinates = '{"latitude": 20.9786, "longitude": 105.9085}'::jsonb
WHERE slug IN ('bat-trang', 'demo-bat-trang');

UPDATE public.villages
SET coordinates = '{"latitude": 20.9772, "longitude": 105.7725}'::jsonb
WHERE slug IN ('van-phuc', 'demo-van-phuc');

NOTIFY pgrst, 'reload schema';
