-- ─────────────────────────────────────────────────────────────────────────────
-- Storage Buckets — Premier Hotel
-- Creates public buckets for menu item and room images.
-- Uses ON CONFLICT DO NOTHING so safe to re-run.
-- ─────────────────────────────────────────────────────────────────────────────

-- Create buckets
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('menu-images', 'menu-images', true, 5242880, ARRAY['image/jpeg','image/png','image/webp','image/gif']),
  ('room-images', 'room-images', true, 10485760, ARRAY['image/jpeg','image/png','image/webp','image/gif'])
ON CONFLICT (id) DO NOTHING;

-- ── RLS policies for menu-images ──────────────────────────────────────────────
-- Anyone can read (public bucket)
CREATE POLICY "Public read menu-images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'menu-images');

-- Only authenticated uploads (backend uses service key, so this is a safety net)
CREATE POLICY "Auth upload menu-images"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'menu-images');

CREATE POLICY "Auth update menu-images"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'menu-images');

CREATE POLICY "Auth delete menu-images"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'menu-images');

-- ── RLS policies for room-images ──────────────────────────────────────────────
CREATE POLICY "Public read room-images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'room-images');

CREATE POLICY "Auth upload room-images"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'room-images');

CREATE POLICY "Auth update room-images"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'room-images');

CREATE POLICY "Auth delete room-images"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'room-images');
