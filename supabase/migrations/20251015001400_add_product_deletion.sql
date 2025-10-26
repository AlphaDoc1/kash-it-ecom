-- Add soft delete functionality to products table
-- This allows vendors to delete products while keeping them in the database for history/analytics

-- Add is_deleted field to products table
ALTER TABLE public.products ADD COLUMN is_deleted BOOLEAN DEFAULT false;

-- Add deleted_at timestamp for tracking when products were deleted
ALTER TABLE public.products ADD COLUMN deleted_at TIMESTAMPTZ;

-- Create index for efficient filtering of non-deleted products
CREATE INDEX IF NOT EXISTS idx_products_not_deleted ON public.products (is_deleted) WHERE is_deleted = false;

-- Create index for efficient filtering of deleted products (for admin analytics)
CREATE INDEX IF NOT EXISTS idx_products_deleted ON public.products (is_deleted, deleted_at) WHERE is_deleted = true;

-- Update existing products to ensure they are not marked as deleted
UPDATE public.products SET is_deleted = false WHERE is_deleted IS NULL;

-- Create RPC function for vendor product deletion (soft delete with file cleanup)
CREATE OR REPLACE FUNCTION public.vendor_delete_product(p_product_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _vendor_id UUID;
  _product_image_url TEXT;
BEGIN
  -- Ensure caller is a vendor and get their vendor ID
  SELECT id INTO _vendor_id FROM public.vendors WHERE user_id = auth.uid();
  IF _vendor_id IS NULL THEN
    RAISE EXCEPTION 'Vendor profile not found' USING ERRCODE = '42501';
  END IF;

  -- Verify vendor owns this product
  IF NOT EXISTS (
    SELECT 1 FROM public.products 
    WHERE id = p_product_id AND vendor_id = _vendor_id AND is_deleted = false
  ) THEN
    RAISE EXCEPTION 'Product not found or access denied' USING ERRCODE = '42501';
  END IF;

  -- Get the product image URL before marking as deleted
  SELECT image_url INTO _product_image_url 
  FROM public.products 
  WHERE id = p_product_id;

  -- Soft delete the product (mark as deleted, don't remove from database)
  UPDATE public.products 
  SET 
    is_deleted = true,
    deleted_at = now(),
    is_active = false  -- Also deactivate the product
  WHERE id = p_product_id;

  -- Log the deletion for potential file cleanup
  -- Note: The actual file deletion will be handled by the frontend/edge function
  -- This is because Supabase RPC functions cannot directly access storage
  RAISE NOTICE 'Product % marked as deleted. Image URL: %. File cleanup should be handled by frontend.', p_product_id, _product_image_url;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.vendor_delete_product(UUID) TO authenticated;

-- Update RLS policies to handle deleted products
-- Products should not be visible to customers if they are deleted
CREATE POLICY "Products visible to customers only if not deleted" ON public.products
  FOR SELECT USING (
    is_deleted = false AND 
    is_active = true AND 
    is_approved = true
  );

-- Vendors can see their own products even if deleted (for history)
CREATE POLICY "Vendors can see their own products including deleted" ON public.products
  FOR SELECT USING (
    vendor_id IN (
      SELECT id FROM public.vendors WHERE user_id = auth.uid()
    )
  );

-- Admins can see all products including deleted ones
CREATE POLICY "Admins can see all products including deleted" ON public.products
  FOR SELECT USING (
    public.has_role(auth.uid(), 'admin')
  );

-- Vendors can only update their own non-deleted products
CREATE POLICY "Vendors can update their own non-deleted products" ON public.products
  FOR UPDATE USING (
    vendor_id IN (
      SELECT id FROM public.vendors WHERE user_id = auth.uid()
    ) AND is_deleted = false
  );

-- Vendors can only delete their own products (soft delete)
CREATE POLICY "Vendors can delete their own products" ON public.products
  FOR UPDATE USING (
    vendor_id IN (
      SELECT id FROM public.vendors WHERE user_id = auth.uid()
    )
  );
