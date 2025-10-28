-- Allow vendors to update only stock and price of their own products
DO $$ BEGIN
  CREATE TYPE public.vendor_update_result AS (
    success BOOLEAN,
    message TEXT
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE OR REPLACE FUNCTION public.vendor_update_product_stock_price(
  p_product_id UUID,
  p_vendor_id UUID,
  p_new_stock INTEGER,
  p_new_price NUMERIC
)
RETURNS public.vendor_update_result
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _res public.vendor_update_result;
  _owned BOOLEAN;
BEGIN
  -- Basic validation
  IF p_new_stock IS NULL OR p_new_stock < 0 THEN
    _res := (FALSE, 'Invalid stock');
    RETURN _res;
  END IF;
  IF p_new_price IS NULL OR p_new_price < 0 THEN
    _res := (FALSE, 'Invalid price');
    RETURN _res;
  END IF;

  -- Ensure the product belongs to the vendor and is not soft-deleted
  SELECT EXISTS (
    SELECT 1 FROM public.products pr
    WHERE pr.id = p_product_id
      AND pr.vendor_id = p_vendor_id
      AND COALESCE(pr.is_deleted, FALSE) = FALSE
  ) INTO _owned;

  IF NOT _owned THEN
    _res := (FALSE, 'Not authorized for this product or product deleted');
    RETURN _res;
  END IF;

  UPDATE public.products
  SET stock = p_new_stock,
      price = p_new_price,
      updated_at = NOW()
  WHERE id = p_product_id;

  _res := (TRUE, 'Updated');
  RETURN _res;
END;
$$;

REVOKE ALL ON FUNCTION public.vendor_update_product_stock_price(UUID, UUID, INTEGER, NUMERIC) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.vendor_update_product_stock_price(UUID, UUID, INTEGER, NUMERIC) TO authenticated;


