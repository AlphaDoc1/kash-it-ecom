-- Securely expose customer contact/address to assigned delivery partner only
DO $$ BEGIN
  CREATE TYPE public.delivery_order_details AS (
    full_name TEXT,
    phone TEXT,
    full_address TEXT,
    city TEXT,
    state TEXT,
    pincode TEXT,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    final_amount NUMERIC,
    subtotal NUMERIC,
    payment_status TEXT
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE OR REPLACE FUNCTION public.get_delivery_order_details(p_order_id UUID, p_partner_user_id UUID)
RETURNS public.delivery_order_details
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _details public.delivery_order_details;
  _assigned BOOLEAN;
BEGIN
  -- ensure the caller is the assigned partner for this order
  SELECT EXISTS (
    SELECT 1
    FROM public.delivery_requests dr
    JOIN public.delivery_partners dp ON dp.id = dr.assigned_partner_id
    WHERE dr.order_id = p_order_id
      AND dp.user_id = p_partner_user_id
  ) INTO _assigned;

  IF NOT _assigned THEN
    RAISE EXCEPTION 'Not authorized' USING ERRCODE = '42501';
  END IF;

  SELECT
    pr.full_name,
    COALESCE(addr.phone, pr.phone) AS phone,
    addr.full_address,
    addr.city,
    addr.state,
    addr.pincode,
    addr.latitude,
    addr.longitude,
    o.final_amount,
    o.subtotal,
    o.payment_status
  INTO _details
  FROM public.orders o
  LEFT JOIN public.profiles pr ON pr.id = o.user_id
  LEFT JOIN public.addresses addr ON addr.id = o.address_id
  WHERE o.id = p_order_id;

  RETURN _details;
END;
$$;

REVOKE ALL ON FUNCTION public.get_delivery_order_details(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_delivery_order_details(UUID, UUID) TO authenticated;


