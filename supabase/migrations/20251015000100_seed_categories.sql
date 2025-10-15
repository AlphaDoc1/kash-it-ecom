-- Seed standard categories (idempotent)
INSERT INTO public.categories (name, description, is_active)
VALUES
  ('Fruits & Vegetables', NULL, true),
  ('Chips', NULL, true),
  ('Dairy, Bread & Eggs', NULL, true),
  ('Atta, Rice, Sugar, Oil & Dals', NULL, true),
  ('Masala & Dry Fruits', NULL, true),
  ('Juice & Cold Drink', NULL, true),
  ('Biscuits', NULL, true),
  ('Stationery', NULL, true),
  ('Soap, Detergents & Shampoo', NULL, true),
  ('Home Essentials', NULL, true),
  ('Tea, Coffee & More', NULL, true),
  ('Ice Creams & More', NULL, true),
  ('Smart Home', NULL, true),
  ('Tools', NULL, true),
  ('Chocolates, Chew Gums & Candy', NULL, true),
  ('Kids Care', NULL, true),
  ('Feminine Hygiene', NULL, true),
  ('IoT Tools', NULL, true)
ON CONFLICT (name) DO UPDATE SET is_active = EXCLUDED.is_active;


