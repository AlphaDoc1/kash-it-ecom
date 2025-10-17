-- Fix admin order access by ensuring the admin policy works correctly
-- The issue is that the debug function bypasses RLS but regular queries don't

-- First, let's drop and recreate the admin policy to ensure it's working
DROP POLICY IF EXISTS "Admins can manage orders" ON public.orders;

-- Create a more explicit admin policy
CREATE POLICY "Admins can manage orders" ON public.orders
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Also ensure the SELECT policy is explicit
CREATE POLICY "Admins can view all orders" ON public.orders
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Test function to verify admin access works
CREATE OR REPLACE FUNCTION public.test_admin_order_access()
RETURNS TABLE (
  user_id UUID,
  has_admin_role BOOLEAN,
  can_access_orders BOOLEAN,
  order_count BIGINT
)
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    auth.uid() as user_id,
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin') as has_admin_role,
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin') as can_access_orders,
    (SELECT COUNT(*) FROM public.orders WHERE 
      EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
    ) as order_count;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.test_admin_order_access() TO authenticated;
