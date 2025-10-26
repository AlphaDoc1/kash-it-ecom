-- Add latitude and longitude columns to addresses table for better location tracking
ALTER TABLE public.addresses ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION;
ALTER TABLE public.addresses ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;

-- Add index for location-based queries
CREATE INDEX IF NOT EXISTS idx_addresses_location ON public.addresses(latitude, longitude);

-- Add constraint to ensure only one default address per user
CREATE UNIQUE INDEX IF NOT EXISTS idx_addresses_user_default ON public.addresses(user_id) WHERE is_default = true;
