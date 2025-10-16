-- Delivery applications table to collect delivery personnel registrations

DO $$ BEGIN
  CREATE TYPE public.delivery_application_status AS ENUM ('pending', 'approved', 'rejected', 'linked');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.delivery_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  vehicle_type TEXT,
  vehicle_number TEXT,
  status public.delivery_application_status NOT NULL DEFAULT 'pending',
  linked_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(email)
);

CREATE OR REPLACE FUNCTION public.touch_updated_at_delivery_app()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_delivery_app_updated_at ON public.delivery_applications;
CREATE TRIGGER trg_delivery_app_updated_at
BEFORE UPDATE ON public.delivery_applications
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at_delivery_app();

ALTER TABLE public.delivery_applications ENABLE ROW LEVEL SECURITY;

-- Allow anyone (even anon) to submit an application
DROP POLICY IF EXISTS "Anyone can submit delivery application" ON public.delivery_applications;
CREATE POLICY "Anyone can submit delivery application" ON public.delivery_applications
  FOR INSERT
  WITH CHECK (true);

-- Admin can manage all
DROP POLICY IF EXISTS "Admins can manage delivery applications" ON public.delivery_applications;
CREATE POLICY "Admins can manage delivery applications" ON public.delivery_applications
  FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Users can view their application by email if logged in
DROP POLICY IF EXISTS "Users can view own delivery application" ON public.delivery_applications;
CREATE POLICY "Users can view own delivery application" ON public.delivery_applications
  FOR SELECT
  USING (email = (SELECT email FROM public.profiles WHERE id = auth.uid()));

-- Extend signup trigger to link approved delivery applications
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

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user')
  ON CONFLICT DO NOTHING;

  -- Vendor auto-link
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

  -- Delivery application auto-link: only if pre-approved by admin
  PERFORM 1 FROM public.delivery_applications WHERE email = NEW.email AND status = 'approved' LIMIT 1;
  IF FOUND THEN
    INSERT INTO public.delivery_partners (user_id, vehicle_type, vehicle_number, is_verified, is_active)
    SELECT NEW.id, da.vehicle_type, da.vehicle_number, true, true
    FROM public.delivery_applications da
    WHERE da.email = NEW.email AND da.status = 'approved'
    LIMIT 1;

    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'delivery')
    ON CONFLICT DO NOTHING;

    UPDATE public.delivery_applications
    SET status = 'linked', linked_user_id = NEW.id
    WHERE email = NEW.email AND status = 'approved';
  END IF;

  RETURN NEW;
END;
$$;


