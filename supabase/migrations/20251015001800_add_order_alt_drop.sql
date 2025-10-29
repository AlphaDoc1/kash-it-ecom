-- Add alternate drop fields and flag for orders
-- Safe to run multiple times due to IF NOT EXISTS checks

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS is_order_for_someone_else boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS alt_drop_latitude double precision,
  ADD COLUMN IF NOT EXISTS alt_drop_longitude double precision;

-- Optional indexes for lookups and filtering
CREATE INDEX IF NOT EXISTS idx_orders_is_order_for_someone_else ON public.orders (is_order_for_someone_else);
CREATE INDEX IF NOT EXISTS idx_orders_alt_drop_lat ON public.orders (alt_drop_latitude);
CREATE INDEX IF NOT EXISTS idx_orders_alt_drop_lon ON public.orders (alt_drop_longitude);

-- Comment for clarity
COMMENT ON COLUMN public.orders.is_order_for_someone_else IS 'True when user chose a different drop location for someone else';
COMMENT ON COLUMN public.orders.alt_drop_latitude IS 'Alternate drop latitude (if order is for someone else)';
COMMENT ON COLUMN public.orders.alt_drop_longitude IS 'Alternate drop longitude (if order is for someone else)';

