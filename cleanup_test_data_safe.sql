-- SAFER OPTIONS: Delete specific test data without removing everything

-- Option 1: Delete only test orders (by date - orders older than X days)
-- Uncomment and adjust the date as needed:
-- DELETE FROM public.order_items WHERE order_id IN (
--   SELECT id FROM public.orders WHERE created_at < NOW() - INTERVAL '7 days'
-- );
-- DELETE FROM public.delivery_requests WHERE order_id IN (
--   SELECT id FROM public.orders WHERE created_at < NOW() - INTERVAL '7 days'
-- );
-- DELETE FROM public.order_visibility WHERE order_id IN (
--   SELECT id FROM public.orders WHERE created_at < NOW() - INTERVAL '7 days'
-- );
-- DELETE FROM public.orders WHERE created_at < NOW() - INTERVAL '7 days';

-- Option 2: Delete orders by specific status (e.g., all cancelled orders)
-- DELETE FROM public.order_items WHERE order_id IN (
--   SELECT id FROM public.orders WHERE delivery_status = 'cancelled'
-- );
-- DELETE FROM public.delivery_requests WHERE order_id IN (
--   SELECT id FROM public.orders WHERE delivery_status = 'cancelled'
-- );
-- DELETE FROM public.order_visibility WHERE order_id IN (
--   SELECT id FROM public.orders WHERE delivery_status = 'cancelled'
-- );
-- DELETE FROM public.orders WHERE delivery_status = 'cancelled';

-- Option 3: List orders first to see what you'll delete (SAFE - no deletion)
SELECT 
  o.id,
  o.created_at,
  o.delivery_status,
  o.payment_status,
  o.final_amount,
  p.full_name as customer_name,
  COUNT(oi.id) as item_count
FROM public.orders o
LEFT JOIN public.profiles p ON p.id = o.user_id
LEFT JOIN public.order_items oi ON oi.order_id = o.id
GROUP BY o.id, o.created_at, o.delivery_status, o.payment_status, o.final_amount, p.full_name
ORDER BY o.created_at DESC;

-- Option 4: Delete specific order by ID (replace 'ORDER_ID_HERE' with actual order ID)
-- DELETE FROM public.order_items WHERE order_id = 'ORDER_ID_HERE';
-- DELETE FROM public.delivery_requests WHERE order_id = 'ORDER_ID_HERE';
-- DELETE FROM public.order_visibility WHERE order_id = 'ORDER_ID_HERE';
-- DELETE FROM public.orders WHERE id = 'ORDER_ID_HERE';

