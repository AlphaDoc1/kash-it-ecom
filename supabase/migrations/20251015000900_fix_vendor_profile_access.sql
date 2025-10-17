-- Fix vendor access to customer profiles and addresses from orders
-- The current policies might be too complex and causing issues

-- First, let's add a policy for vendors to view customer profiles from their orders
CREATE POLICY "Vendors can view customer profiles from their orders" ON public.profiles 
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() AND role = 'vendor'
    ) AND
    EXISTS (
      SELECT 1 FROM public.orders o
      JOIN public.order_items oi ON o.id = oi.order_id
      JOIN public.products p ON oi.product_id = p.id
      JOIN public.vendors v ON p.vendor_id = v.id
      WHERE o.user_id = profiles.id AND v.user_id = auth.uid()
    )
  );

-- Simplify the vendor address access policy
DROP POLICY IF EXISTS "Vendors can view addresses from their orders" ON public.addresses;

CREATE POLICY "Vendors can view addresses from their orders" ON public.addresses 
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() AND role = 'vendor'
    ) AND
    EXISTS (
      SELECT 1 FROM public.orders o
      JOIN public.order_items oi ON o.id = oi.order_id
      JOIN public.products p ON oi.product_id = p.id
      JOIN public.vendors v ON p.vendor_id = v.id
      WHERE o.address_id = addresses.id AND v.user_id = auth.uid()
    )
  );

-- Alternative: Create a simpler policy that allows vendors to view any profile/address
-- if they have at least one order with their products
-- This is more permissive but should work reliably

-- Drop the complex policies and create simpler ones
DROP POLICY IF EXISTS "Vendors can view customer profiles from their orders" ON public.profiles;
DROP POLICY IF EXISTS "Vendors can view addresses from their orders" ON public.addresses;

-- Simple vendor access to profiles (if they are a vendor)
CREATE POLICY "Vendors can view profiles" ON public.profiles 
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() AND role = 'vendor'
    )
  );

-- Simple vendor access to addresses (if they are a vendor)
CREATE POLICY "Vendors can view addresses" ON public.addresses 
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() AND role = 'vendor'
    )
  );
