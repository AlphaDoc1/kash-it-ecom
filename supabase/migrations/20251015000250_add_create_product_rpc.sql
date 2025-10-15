-- Create a SECURITY DEFINER function to safely insert products for the current vendor
-- This avoids brittle client-side RLS checks and ensures vendor ownership is enforced server-side.

CREATE OR REPLACE FUNCTION public.create_product(
  p_category_id UUID,
  p_name TEXT,
  p_description TEXT,
  p_price NUMERIC,
  p_stock INTEGER,
  p_unit TEXT,
  p_image_url TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_vendor_id UUID;
  v_product_id UUID;
BEGIN
  -- Ensure caller is a vendor and fetch their vendor id
  SELECT id INTO v_vendor_id FROM public.vendors WHERE user_id = auth.uid();
  IF v_vendor_id IS NULL THEN
    RAISE EXCEPTION 'Vendor profile not found for user %', auth.uid() USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- Basic validations
  IF p_name IS NULL OR btrim(p_name) = '' THEN
    RAISE EXCEPTION 'Product name is required' USING ERRCODE = 'invalid_parameter_value';
  END IF;
  IF p_price IS NULL OR p_price < 0 THEN
    RAISE EXCEPTION 'Price must be >= 0' USING ERRCODE = 'invalid_parameter_value';
  END IF;
  IF p_stock IS NULL OR p_stock < 0 THEN
    RAISE EXCEPTION 'Stock must be >= 0' USING ERRCODE = 'invalid_parameter_value';
  END IF;

  INSERT INTO public.products (
    vendor_id, category_id, name, description, price, stock, unit, image_url, is_active, is_approved
  ) VALUES (
    v_vendor_id, p_category_id, btrim(p_name), NULLIF(btrim(COALESCE(p_description, '')), ''), p_price, p_stock, NULLIF(btrim(COALESCE(p_unit, '')), ''), NULLIF(btrim(COALESCE(p_image_url, '')), ''), true, false
  ) RETURNING id INTO v_product_id;

  RETURN v_product_id;
END;
$$;

-- Restrict execution to vendors and admins
REVOKE ALL ON FUNCTION public.create_product(UUID, TEXT, TEXT, NUMERIC, INTEGER, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_product(UUID, TEXT, TEXT, NUMERIC, INTEGER, TEXT, TEXT) TO anon, authenticated;


