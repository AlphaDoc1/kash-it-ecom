-- Fix order history deletion bug: implement per-user order visibility
-- Instead of hard deleting orders, we'll track which users have hidden orders from their history

-- Create order_visibility table to track per-user order visibility
CREATE TABLE IF NOT EXISTS public.order_visibility (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  user_type TEXT NOT NULL CHECK (user_type IN ('customer', 'vendor', 'delivery_partner', 'admin')),
  is_visible BOOLEAN NOT NULL DEFAULT true,
  hidden_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(order_id, user_id, user_type)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_order_visibility_order ON public.order_visibility(order_id);
CREATE INDEX IF NOT EXISTS idx_order_visibility_user ON public.order_visibility(user_id);
CREATE INDEX IF NOT EXISTS idx_order_visibility_type ON public.order_visibility(user_type);

-- Enable RLS
ALTER TABLE public.order_visibility ENABLE ROW LEVEL SECURITY;

-- RLS Policies for order_visibility
CREATE POLICY "Users can manage own order visibility" ON public.order_visibility
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all order visibility" ON public.order_visibility
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- Create RPC functions for proper order deletion (hiding from history)

-- 1) User delete order (hide from customer history)
CREATE OR REPLACE FUNCTION public.user_delete_order(p_order_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id UUID;
BEGIN
  -- Ensure caller is authenticated
  _user_id := auth.uid();
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'User not authenticated' USING ERRCODE = '42501';
  END IF;

  -- Verify user owns this order
  IF NOT EXISTS (
    SELECT 1 FROM public.orders 
    WHERE id = p_order_id AND user_id = _user_id
  ) THEN
    RAISE EXCEPTION 'Order not found or access denied' USING ERRCODE = '42501';
  END IF;

  -- Hide order from customer's history
  INSERT INTO public.order_visibility (order_id, user_id, user_type, is_visible, hidden_at)
  VALUES (p_order_id, _user_id, 'customer', false, now())
  ON CONFLICT (order_id, user_id, user_type) 
  DO UPDATE SET is_visible = false, hidden_at = now();
END;
$$;

-- 2) Vendor delete order (hide from vendor history)
CREATE OR REPLACE FUNCTION public.vendor_delete_order_fixed(p_order_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _vendor_id UUID;
  _user_id UUID;
BEGIN
  -- Ensure caller is a vendor and get their vendor ID
  SELECT id, user_id INTO _vendor_id, _user_id FROM public.vendors WHERE user_id = auth.uid();
  IF _vendor_id IS NULL THEN
    RAISE EXCEPTION 'Vendor profile not found' USING ERRCODE = '42501';
  END IF;

  -- Verify vendor owns products in this order
  IF NOT EXISTS (
    SELECT 1 FROM public.order_items oi
    JOIN public.products p ON oi.product_id = p.id
    WHERE oi.order_id = p_order_id AND p.vendor_id = _vendor_id
  ) THEN
    RAISE EXCEPTION 'Order does not contain your products' USING ERRCODE = '42501';
  END IF;

  -- Hide order from vendor's history
  INSERT INTO public.order_visibility (order_id, user_id, user_type, is_visible, hidden_at)
  VALUES (p_order_id, _user_id, 'vendor', false, now())
  ON CONFLICT (order_id, user_id, user_type) 
  DO UPDATE SET is_visible = false, hidden_at = now();
END;
$$;

-- 3) Delivery partner delete order (hide from delivery partner history)
CREATE OR REPLACE FUNCTION public.delivery_delete_order(p_order_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _partner_id UUID;
  _user_id UUID;
BEGIN
  -- Ensure caller is a delivery partner and get their partner ID
  SELECT id, user_id INTO _partner_id, _user_id FROM public.delivery_partners WHERE user_id = auth.uid();
  IF _partner_id IS NULL THEN
    RAISE EXCEPTION 'Delivery partner profile not found' USING ERRCODE = '42501';
  END IF;

  -- Verify delivery partner is assigned to this order
  IF NOT EXISTS (
    SELECT 1 FROM public.delivery_requests 
    WHERE order_id = p_order_id AND assigned_partner_id = _partner_id
  ) THEN
    RAISE EXCEPTION 'Order not assigned to you' USING ERRCODE = '42501';
  END IF;

  -- Hide order from delivery partner's history
  INSERT INTO public.order_visibility (order_id, user_id, user_type, is_visible, hidden_at)
  VALUES (p_order_id, _user_id, 'delivery_partner', false, now())
  ON CONFLICT (order_id, user_id, user_type) 
  DO UPDATE SET is_visible = false, hidden_at = now();
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.user_delete_order(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.vendor_delete_order_fixed(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delivery_delete_order(UUID) TO authenticated;

-- Drop the old problematic vendor_delete_order function
DROP FUNCTION IF EXISTS public.vendor_delete_order(UUID);
