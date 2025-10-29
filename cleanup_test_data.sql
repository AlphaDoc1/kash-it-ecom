-- CAUTION: This will DELETE ALL ORDERS and related data permanently!
-- Only run this if you want to start fresh for testing

-- Delete all delivery requests (will cascade delete tracking data)
DELETE FROM public.delivery_requests;

-- Delete all order items (must be deleted before orders due to foreign keys)
DELETE FROM public.order_items;

-- Delete all order visibility records
DELETE FROM public.order_visibility;

-- Delete all orders
DELETE FROM public.orders;

-- Verify deletion
SELECT COUNT(*) as remaining_orders FROM public.orders;
SELECT COUNT(*) as remaining_order_items FROM public.order_items;
SELECT COUNT(*) as remaining_delivery_requests FROM public.delivery_requests;

