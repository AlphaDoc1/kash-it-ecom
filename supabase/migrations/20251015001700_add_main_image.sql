-- Add main image URL to products and backfill from existing image_url
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS main_image_url TEXT;

-- Backfill once if empty
UPDATE public.products
SET main_image_url = image_url
WHERE (main_image_url IS NULL OR main_image_url = '') AND image_url IS NOT NULL;


