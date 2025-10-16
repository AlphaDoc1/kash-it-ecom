-- Auto-verify profiles on signup and set default to true

-- 1) Set default true going forward
ALTER TABLE public.profiles
  ALTER COLUMN is_verified SET DEFAULT true;

-- 2) Backfill existing rows
UPDATE public.profiles
SET is_verified = true
WHERE is_verified IS DISTINCT FROM true;

-- 3) Ensure signup trigger sets is_verified = true
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, phone, email, is_verified)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'),
    NEW.raw_user_meta_data->>'phone',
    NEW.email,
    true
  );

  -- Assign default 'user' role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user')
  ON CONFLICT DO NOTHING;

  -- If vendor invitation exists, auto-link
  PERFORM 1 FROM public.vendor_invitations WHERE email = NEW.email AND status = 'pending' LIMIT 1;
  IF FOUND THEN
    INSERT INTO public.vendors (user_id, business_name, business_description, business_address, gstin, is_approved, is_active)
    SELECT NEW.id, vi.business_name, vi.business_description, vi.business_address, vi.gstin, true, true
    FROM public.vendor_invitations vi
    WHERE vi.email = NEW.email AND vi.status = 'pending'
    LIMIT 1;

    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'vendor')
    ON CONFLICT DO NOTHING;

    UPDATE public.vendor_invitations
    SET status = 'linked', linked_user_id = NEW.id, accepted_at = now()
    WHERE email = NEW.email AND status = 'pending';
  END IF;

  RETURN NEW;
END;
$$;


