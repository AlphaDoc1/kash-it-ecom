-- Fix delivery status transition constraint to allow pending -> cancelled
-- This allows vendors to reject pending orders by marking them as cancelled

-- First, let's see what constraint names exist
-- Drop ALL possible constraint names that might exist
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_delivery_status_check;
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS delivery_status_check;
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS check_delivery_status;

-- Add a new constraint that includes ALL valid statuses used in the application
ALTER TABLE public.orders ADD CONSTRAINT orders_delivery_status_check 
CHECK (delivery_status IN ('pending', 'approved', 'assigned', 'picked_up', 'out_for_delivery', 'delivered', 'cancelled'));

-- The constraint now allows all these statuses, so transitions should work
