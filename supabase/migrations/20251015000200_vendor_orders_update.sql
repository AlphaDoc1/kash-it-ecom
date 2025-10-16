-- Allow vendors to update orders that contain their products
-- This supports actions like approving and marking as shipped

DROP POLICY IF EXISTS "Vendors can update orders with their products" ON public.orders;
CREATE POLICY "Vendors can update orders with their products" ON public.orders
  FOR UPDATE
  USING (
    public.has_role(auth.uid(), 'vendor') AND
    EXISTS (
      SELECT 1 FROM public.order_items oi
      JOIN public.products p ON oi.product_id = p.id
      JOIN public.vendors v ON p.vendor_id = v.id
      WHERE oi.order_id = orders.id AND v.user_id = auth.uid()
    )
  );


