-- Add email column to profiles to allow safe matching without service role access to auth.users
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS email TEXT;

-- Backfill existing profiles.email from auth.users where possible (requires SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.backfill_profiles_email()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles p
  SET email = u.email
  FROM auth.users u
  WHERE p.id = u.id AND (p.email IS NULL OR p.email <> u.email);
END;
$$;

SELECT public.backfill_profiles_email();

-- Ensure profiles email kept in sync on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, phone, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'),
    NEW.raw_user_meta_data->>'phone',
    NEW.email
  );

  -- Assign default 'user' role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user')
  ON CONFLICT DO NOTHING;

  -- If there's a pending vendor invitation for this email, auto-link vendor and role
  PERFORM 1 FROM public.vendor_invitations WHERE email = NEW.email AND status = 'pending' LIMIT 1;
  IF FOUND THEN
    -- Create vendor profile using invitation details
    INSERT INTO public.vendors (user_id, business_name, business_description, business_address, gstin, is_approved, is_active)
    SELECT NEW.id, vi.business_name, vi.business_description, vi.business_address, vi.gstin, true, true
    FROM public.vendor_invitations vi
    WHERE vi.email = NEW.email AND vi.status = 'pending'
    LIMIT 1;

    -- Grant vendor role
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'vendor')
    ON CONFLICT DO NOTHING;

    -- Mark invitation linked
    UPDATE public.vendor_invitations
    SET status = 'linked', linked_user_id = NEW.id, accepted_at = now()
    WHERE email = NEW.email AND status = 'pending';
  END IF;

  RETURN NEW;
END;
$$;

-- Create vendor_invitations table for admin-managed vendor onboarding
DO $$ BEGIN
  CREATE TYPE public.vendor_invitation_status AS ENUM ('pending', 'linked', 'revoked');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.vendor_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  business_name TEXT NOT NULL,
  business_description TEXT,
  business_address TEXT,
  gstin TEXT,
  invited_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  status public.vendor_invitation_status NOT NULL DEFAULT 'pending',
  linked_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(email, status) DEFERRABLE INITIALLY IMMEDIATE
);

-- Keep updated_at current
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_vendor_invitations_updated_at ON public.vendor_invitations;
CREATE TRIGGER trg_vendor_invitations_updated_at
BEFORE UPDATE ON public.vendor_invitations
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- RLS
ALTER TABLE public.vendor_invitations ENABLE ROW LEVEL SECURITY;

-- Only admins can view/manage invitations
DROP POLICY IF EXISTS "Admins can manage vendor invitations" ON public.vendor_invitations;
CREATE POLICY "Admins can manage vendor invitations" ON public.vendor_invitations
  FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Users can see their own invitation record (optional, read-only)
DROP POLICY IF EXISTS "Users can view own invitations" ON public.vendor_invitations;
CREATE POLICY "Users can view own invitations" ON public.vendor_invitations
  FOR SELECT
  USING (email = (SELECT email FROM public.profiles WHERE id = auth.uid()));


