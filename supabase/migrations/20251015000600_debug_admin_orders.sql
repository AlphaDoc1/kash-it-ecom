-- Debug migration to help troubleshoot admin order access
-- This creates a simple function to test admin role and order access

-- Function to check if current user has admin role
CREATE OR REPLACE FUNCTION public.debug_admin_access()
RETURNS TABLE (
  user_id UUID,
  has_admin_role BOOLEAN,
  total_orders BIGINT,
  accessible_orders BIGINT
)
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    auth.uid() as user_id,
    public.has_role(auth.uid(), 'admin') as has_admin_role,
    (SELECT COUNT(*) FROM public.orders) as total_orders,
    (SELECT COUNT(*) FROM public.orders WHERE 
      auth.uid() = user_id OR 
      public.has_role(auth.uid(), 'admin') OR
      (public.has_role(auth.uid(), 'vendor') AND EXISTS (
        SELECT 1 FROM public.order_items oi
        JOIN public.products p ON oi.product_id = p.id
        JOIN public.vendors v ON p.vendor_id = v.id
        WHERE oi.order_id = orders.id AND v.user_id = auth.uid()
      ))
    ) as accessible_orders;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.debug_admin_access() TO authenticated;
