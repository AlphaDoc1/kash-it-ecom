-- Update RPC to return alternate drop coordinates when present
-- Drop the previous signature to allow return type changes
DROP FUNCTION IF EXISTS public.get_delivery_order_details(uuid, uuid);

CREATE FUNCTION public.get_delivery_order_details(p_order_id uuid, p_partner_user_id uuid)
RETURNS TABLE (
  full_name text,
  phone text,
  full_address text,
  city text,
  state text,
  pincode text,
  latitude double precision,
  longitude double precision,
  final_amount numeric,
  subtotal numeric,
  payment_status text,
  is_order_for_someone_else boolean
) AS $$
BEGIN
  -- Ensure the caller is the assigned partner for this order
  IF NOT EXISTS (
    SELECT 1 FROM public.delivery_requests dr
    JOIN public.delivery_partners dp ON dp.id = dr.assigned_partner_id
    WHERE dr.order_id = p_order_id AND dp.user_id = p_partner_user_id
  ) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  RETURN QUERY
  SELECT 
    pr.full_name,
    COALESCE(addr.phone, pr.phone) AS phone,
    addr.full_address,
    addr.city,
    addr.state,
    addr.pincode,
    COALESCE(o.alt_drop_latitude, addr.latitude) AS latitude,
    COALESCE(o.alt_drop_longitude, addr.longitude) AS longitude,
    o.final_amount,
    o.subtotal,
    o.payment_status,
    COALESCE(o.is_order_for_someone_else, false) AS is_order_for_someone_else
  FROM public.orders o
  LEFT JOIN public.addresses addr ON addr.id = o.address_id
  LEFT JOIN public.profiles pr ON pr.id = o.user_id
  WHERE o.id = p_order_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Optional: grant execute to authenticated
GRANT EXECUTE ON FUNCTION public.get_delivery_order_details(uuid, uuid) TO authenticated;

