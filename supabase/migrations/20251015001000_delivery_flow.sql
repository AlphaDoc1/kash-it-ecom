-- Delivery flow schema: locations, requests, assignments, tracking, statuses

-- 1) Extend profiles, vendors, delivery_partners with location fields (nullable)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;

ALTER TABLE public.vendors ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION;
ALTER TABLE public.vendors ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;

ALTER TABLE public.delivery_partners ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION;
ALTER TABLE public.delivery_partners ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;

-- 2) Delivery status enum
DO $$ BEGIN
  CREATE TYPE public.delivery_flow_status AS ENUM (
    'pending',             -- created by user
    'approved',            -- approved by vendor
    'assigned',            -- partner assigned
    'rejected_by_partner', -- partner rejected
    'accepted',            -- partner accepted
    'picked_up',           -- picked up from vendor
    'out_for_delivery',    -- on the way to user
    'delivered',
    'cancelled'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- 3) Delivery requests table (one per order)
CREATE TABLE IF NOT EXISTS public.delivery_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID UNIQUE NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  vendor_id UUID NOT NULL REFERENCES public.vendors(id) ON DELETE RESTRICT,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  assigned_partner_id UUID REFERENCES public.delivery_partners(id) ON DELETE SET NULL,
  status public.delivery_flow_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  picked_up_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ
);

-- 4) Partner responses (audit)
CREATE TABLE IF NOT EXISTS public.delivery_partner_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES public.delivery_requests(id) ON DELETE CASCADE,
  partner_id UUID NOT NULL REFERENCES public.delivery_partners(id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (action IN ('accepted','rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5) Live tracking positions
CREATE TABLE IF NOT EXISTS public.delivery_tracking (
  id BIGSERIAL PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  partner_id UUID NOT NULL REFERENCES public.delivery_partners(id) ON DELETE CASCADE,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6) RLS
ALTER TABLE public.delivery_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_partner_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_tracking ENABLE ROW LEVEL SECURITY;

-- requests: user (owner), vendor (related), assigned partner, and admin can view
DROP POLICY IF EXISTS "Users can view own delivery request" ON public.delivery_requests;
CREATE POLICY "Users can view own delivery request" ON public.delivery_requests
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Vendors can view related delivery requests" ON public.delivery_requests;
CREATE POLICY "Vendors can view related delivery requests" ON public.delivery_requests
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.vendors v
      WHERE v.id = delivery_requests.vendor_id AND v.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Assigned partner can view delivery request" ON public.delivery_requests;
CREATE POLICY "Assigned partner can view delivery request" ON public.delivery_requests
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.delivery_partners dp
      WHERE dp.id = delivery_requests.assigned_partner_id AND dp.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Admins can view delivery requests" ON public.delivery_requests;
CREATE POLICY "Admins can view delivery requests" ON public.delivery_requests
  FOR SELECT USING (public.has_role(auth.uid(),'admin'));

-- updates: vendor updates on approve/assign, partner updates on accept/reject/progress, admin manage
DROP POLICY IF EXISTS "Vendors can update related delivery requests" ON public.delivery_requests;
CREATE POLICY "Vendors can update related delivery requests" ON public.delivery_requests
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.vendors v
      WHERE v.id = delivery_requests.vendor_id AND v.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Assigned partner can update delivery request" ON public.delivery_requests;
CREATE POLICY "Assigned partner can update delivery request" ON public.delivery_requests
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.delivery_partners dp
      WHERE dp.id = delivery_requests.assigned_partner_id AND dp.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Admins can manage delivery requests" ON public.delivery_requests;
CREATE POLICY "Admins can manage delivery requests" ON public.delivery_requests
  FOR ALL USING (public.has_role(auth.uid(),'admin'));

-- responses: partner can insert own, read own; admin read
DROP POLICY IF EXISTS "Partners can insert responses" ON public.delivery_partner_responses;
CREATE POLICY "Partners can insert responses" ON public.delivery_partner_responses
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.delivery_partners dp WHERE dp.id = partner_id AND dp.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Partners can view own responses" ON public.delivery_partner_responses;
CREATE POLICY "Partners can view own responses" ON public.delivery_partner_responses
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.delivery_partners dp WHERE dp.id = delivery_partner_responses.partner_id AND dp.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Admins can view responses" ON public.delivery_partner_responses;
CREATE POLICY "Admins can view responses" ON public.delivery_partner_responses
  FOR SELECT USING (public.has_role(auth.uid(),'admin'));

-- tracking: partner insert/select own; user/vendor/admin select by order linkage
DROP POLICY IF EXISTS "Partners can insert tracking" ON public.delivery_tracking;
CREATE POLICY "Partners can insert tracking" ON public.delivery_tracking
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.delivery_partners dp WHERE dp.id = partner_id AND dp.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Partners can view own tracking" ON public.delivery_tracking;
CREATE POLICY "Partners can view own tracking" ON public.delivery_tracking
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.delivery_partners dp WHERE dp.id = delivery_tracking.partner_id AND dp.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can view tracking for their order" ON public.delivery_tracking;
CREATE POLICY "Users can view tracking for their order" ON public.delivery_tracking
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.orders o WHERE o.id = delivery_tracking.order_id AND o.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Vendors can view tracking for related orders" ON public.delivery_tracking;
CREATE POLICY "Vendors can view tracking for related orders" ON public.delivery_tracking
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.orders o
      JOIN public.order_items oi ON oi.order_id = o.id
      JOIN public.products p ON p.id = oi.product_id
      JOIN public.vendors v ON v.id = p.vendor_id
      WHERE o.id = delivery_tracking.order_id AND v.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Admins can view tracking" ON public.delivery_tracking;
CREATE POLICY "Admins can view tracking" ON public.delivery_tracking
  FOR SELECT USING (public.has_role(auth.uid(),'admin'));

-- 7) Helper: haversine distance (km)
CREATE OR REPLACE FUNCTION public.haversine_km(lat1 DOUBLE PRECISION, lon1 DOUBLE PRECISION, lat2 DOUBLE PRECISION, lon2 DOUBLE PRECISION)
RETURNS DOUBLE PRECISION
LANGUAGE SQL
AS $$
  WITH const AS (
    SELECT 6371.0::double precision AS R
  )
  SELECT c.R * 2 * asin(sqrt(
    pow(sin(radians((lat2 - lat1) / 2)), 2) +
    cos(radians(lat1)) * cos(radians(lat2)) * pow(sin(radians((lon2 - lon1) / 2)), 2)
  ))
  FROM const c;
$$;

-- 8) RPC: assign nearest partner by vendor location
CREATE OR REPLACE FUNCTION public.assign_nearest_partner(p_order_id UUID)
RETURNS TABLE (assigned_partner_id UUID, distance_km DOUBLE PRECISION)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _vendor_id UUID;
  _v_lat DOUBLE PRECISION;
  _v_lon DOUBLE PRECISION;
  _partner_id UUID;
  _distance DOUBLE PRECISION;
BEGIN
  SELECT v.id, v.latitude, v.longitude INTO _vendor_id, _v_lat, _v_lon
  FROM public.vendors v
  JOIN public.products p ON p.vendor_id = v.id
  JOIN public.order_items oi ON oi.product_id = p.id
  WHERE oi.order_id = p_order_id
  LIMIT 1;

  IF _vendor_id IS NULL OR _v_lat IS NULL OR _v_lon IS NULL THEN
    RAISE EXCEPTION 'Vendor location not set';
  END IF;

  SELECT dp.id,
         public.haversine_km(_v_lat, _v_lon, dp.latitude, dp.longitude) AS dist
  INTO _partner_id, _distance
  FROM public.delivery_partners dp
  WHERE dp.is_active = true
    AND dp.latitude IS NOT NULL
    AND dp.longitude IS NOT NULL
  ORDER BY dist ASC
  LIMIT 1;

  IF _partner_id IS NULL THEN
    RAISE EXCEPTION 'No delivery partners available';
  END IF;

  -- Ensure request exists
  INSERT INTO public.delivery_requests (order_id, vendor_id, user_id, assigned_partner_id, status)
  SELECT o.id,
         _vendor_id,
         o.user_id,
         _partner_id,
         'assigned'
  FROM public.orders o
  WHERE o.id = p_order_id
  ON CONFLICT (order_id) DO UPDATE SET assigned_partner_id = EXCLUDED.assigned_partner_id, status = 'assigned', updated_at = now();

  RETURN QUERY SELECT _partner_id, _distance;
END;
$$;

GRANT EXECUTE ON FUNCTION public.assign_nearest_partner(UUID) TO authenticated;


