-- Fix address access for admins and vendors viewing orders
-- The current policy only allows users to see their own addresses
-- But admins and vendors need to see addresses from orders

-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "Users can manage own addresses" ON public.addresses;

-- Create separate policies for different access patterns
-- Users can manage their own addresses
CREATE POLICY "Users can manage own addresses" ON public.addresses 
  FOR ALL 
  USING (auth.uid() = user_id);

-- Admins can view all addresses (for order management)
CREATE POLICY "Admins can view all addresses" ON public.addresses 
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Vendors can view addresses from orders containing their products
CREATE POLICY "Vendors can view addresses from their orders" ON public.addresses 
  FOR SELECT 
  USING (
    public.has_role(auth.uid(), 'vendor') AND
    EXISTS (
      SELECT 1 FROM public.orders o
      JOIN public.order_items oi ON o.id = oi.order_id
      JOIN public.products p ON oi.product_id = p.id
      JOIN public.vendors v ON p.vendor_id = v.id
      WHERE o.address_id = addresses.id AND v.user_id = auth.uid()
    )
  );
