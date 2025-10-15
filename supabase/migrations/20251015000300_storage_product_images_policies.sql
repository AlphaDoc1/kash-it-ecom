-- Ensure product-images bucket exists and is public
DO $$
BEGIN
  PERFORM 1 FROM storage.buckets WHERE id = 'product-images';
  IF NOT FOUND THEN
    PERFORM storage.create_bucket('product-images', public => true);
  END IF;
END $$;

-- RLS policies for storage.objects on product-images
-- Allow anyone to read (bucket is public), but keep explicit just in case
DROP POLICY IF EXISTS "Public read product-images" ON storage.objects;
CREATE POLICY "Public read product-images" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'product-images');

-- Allow authenticated vendors to upload files under their own vendor-id folder
DROP POLICY IF EXISTS "Vendors can upload own product images" ON storage.objects;
CREATE POLICY "Vendors can upload own product images" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'product-images'
    AND EXISTS (
      SELECT 1 FROM public.vendors v
      WHERE v.user_id = auth.uid()
        AND split_part(name, '/', 1) = v.id::text
    )
  );

-- Allow vendors to update/delete only their own files
DROP POLICY IF EXISTS "Vendors can modify own product images" ON storage.objects;
CREATE POLICY "Vendors can modify own product images" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'product-images'
    AND EXISTS (
      SELECT 1 FROM public.vendors v
      WHERE v.user_id = auth.uid()
        AND split_part(name, '/', 1) = v.id::text
    )
  )
  WITH CHECK (
    bucket_id = 'product-images'
    AND EXISTS (
      SELECT 1 FROM public.vendors v
      WHERE v.user_id = auth.uid()
        AND split_part(name, '/', 1) = v.id::text
    )
  );

DROP POLICY IF EXISTS "Vendors can delete own product images" ON storage.objects;
CREATE POLICY "Vendors can delete own product images" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'product-images'
    AND EXISTS (
      SELECT 1 FROM public.vendors v
      WHERE v.user_id = auth.uid()
        AND split_part(name, '/', 1) = v.id::text
    )
  );


