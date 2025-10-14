-- Create app_role enum for RBAC
CREATE TYPE public.app_role AS ENUM ('user', 'admin', 'vendor', 'delivery');

-- Create profiles table (extends auth.users)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  phone TEXT,
  is_verified BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create user_roles table (CRITICAL: separate from profiles for security)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, role)
);

-- Create security definer function for role checking
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Create categories table
CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  image_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create vendors table
CREATE TABLE public.vendors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE UNIQUE NOT NULL,
  business_name TEXT NOT NULL,
  business_description TEXT,
  business_address TEXT,
  gstin TEXT,
  is_approved BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create products table
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID REFERENCES public.vendors(id) ON DELETE CASCADE NOT NULL,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL CHECK (price >= 0),
  stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
  unit TEXT DEFAULT 'piece',
  image_url TEXT,
  is_active BOOLEAN DEFAULT true,
  is_approved BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create addresses table
CREATE TABLE public.addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  label TEXT NOT NULL,
  full_address TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  pincode TEXT NOT NULL,
  phone TEXT NOT NULL,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create cart_items table
CREATE TABLE public.cart_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, product_id)
);

-- Create coupons table
CREATE TABLE public.coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
  discount_value DECIMAL(10,2) NOT NULL CHECK (discount_value > 0),
  min_order_amount DECIMAL(10,2) DEFAULT 0,
  max_discount DECIMAL(10,2),
  valid_from TIMESTAMPTZ NOT NULL,
  valid_until TIMESTAMPTZ NOT NULL,
  usage_limit INTEGER,
  usage_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create orders table
CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL NOT NULL,
  address_id UUID REFERENCES public.addresses(id) ON DELETE SET NULL,
  subtotal DECIMAL(10,2) NOT NULL,
  discount_amount DECIMAL(10,2) DEFAULT 0,
  final_amount DECIMAL(10,2) NOT NULL,
  coupon_code TEXT,
  payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'completed', 'failed', 'refunded')),
  payment_id TEXT,
  delivery_status TEXT DEFAULT 'pending' CHECK (delivery_status IN ('pending', 'assigned', 'out_for_delivery', 'delivered', 'cancelled')),
  delivery_partner_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create order_items table
CREATE TABLE public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  snapshot_name TEXT NOT NULL,
  snapshot_price DECIMAL(10,2) NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create delivery_partners table
CREATE TABLE public.delivery_partners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE UNIQUE NOT NULL,
  vehicle_type TEXT,
  vehicle_number TEXT,
  is_verified BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- IoT placeholders
CREATE TABLE public.iot_devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_name TEXT NOT NULL,
  device_type TEXT,
  location TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.sensor_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id UUID REFERENCES public.iot_devices(id) ON DELETE CASCADE NOT NULL,
  data_type TEXT NOT NULL,
  value DECIMAL(10,2) NOT NULL,
  recorded_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.iot_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sensor_data ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for user_roles
CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage all roles" ON public.user_roles FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for categories
CREATE POLICY "Anyone can view active categories" ON public.categories FOR SELECT USING (is_active = true);
CREATE POLICY "Admins can manage categories" ON public.categories FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for vendors
CREATE POLICY "Anyone can view approved vendors" ON public.vendors FOR SELECT USING (is_approved = true AND is_active = true);
CREATE POLICY "Vendors can view own profile" ON public.vendors FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Vendors can update own profile" ON public.vendors FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage vendors" ON public.vendors FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for products
CREATE POLICY "Anyone can view approved products" ON public.products FOR SELECT USING (is_approved = true AND is_active = true);
CREATE POLICY "Vendors can view own products" ON public.products FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.vendors WHERE vendors.id = products.vendor_id AND vendors.user_id = auth.uid())
);
CREATE POLICY "Vendors can insert own products" ON public.products FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.vendors WHERE vendors.id = vendor_id AND vendors.user_id = auth.uid())
);
CREATE POLICY "Vendors can update own products" ON public.products FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.vendors WHERE vendors.id = products.vendor_id AND vendors.user_id = auth.uid())
);
CREATE POLICY "Admins can view all products" ON public.products FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage products" ON public.products FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for addresses
CREATE POLICY "Users can manage own addresses" ON public.addresses FOR ALL USING (auth.uid() = user_id);

-- RLS Policies for cart_items
CREATE POLICY "Users can manage own cart" ON public.cart_items FOR ALL USING (auth.uid() = user_id);

-- RLS Policies for coupons
CREATE POLICY "Anyone can view active coupons" ON public.coupons FOR SELECT USING (is_active = true);
CREATE POLICY "Admins can manage coupons" ON public.coupons FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for orders
CREATE POLICY "Users can view own orders" ON public.orders FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create orders" ON public.orders FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Delivery partners can view assigned orders" ON public.orders FOR SELECT USING (auth.uid() = delivery_partner_id);
CREATE POLICY "Delivery partners can update assigned orders" ON public.orders FOR UPDATE USING (auth.uid() = delivery_partner_id);
CREATE POLICY "Admins can manage orders" ON public.orders FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Vendors can view orders with their products" ON public.orders FOR SELECT USING (
  public.has_role(auth.uid(), 'vendor') AND
  EXISTS (
    SELECT 1 FROM public.order_items oi
    JOIN public.products p ON oi.product_id = p.id
    JOIN public.vendors v ON p.vendor_id = v.id
    WHERE oi.order_id = orders.id AND v.user_id = auth.uid()
  )
);

-- RLS Policies for order_items
CREATE POLICY "Users can view own order items" ON public.order_items FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.orders WHERE orders.id = order_items.order_id AND orders.user_id = auth.uid())
);
CREATE POLICY "Admins can manage order items" ON public.order_items FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Vendors can view order items for their products" ON public.order_items FOR SELECT USING (
  public.has_role(auth.uid(), 'vendor') AND
  EXISTS (
    SELECT 1 FROM public.products p
    JOIN public.vendors v ON p.vendor_id = v.id
    WHERE p.id = order_items.product_id AND v.user_id = auth.uid()
  )
);

-- RLS Policies for delivery_partners
CREATE POLICY "Delivery partners can view own profile" ON public.delivery_partners FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Delivery partners can update own profile" ON public.delivery_partners FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage delivery partners" ON public.delivery_partners FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for IoT (placeholder - admin only)
CREATE POLICY "Admins can manage iot_devices" ON public.iot_devices FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage sensor_data" ON public.sensor_data FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Trigger function for updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_vendors_updated_at BEFORE UPDATE ON public.vendors FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger to create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, phone)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'),
    NEW.raw_user_meta_data->>'phone'
  );
  
  -- Assign default 'user' role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create indexes for performance
CREATE INDEX idx_products_vendor ON public.products(vendor_id);
CREATE INDEX idx_products_category ON public.products(category_id);
CREATE INDEX idx_orders_user ON public.orders(user_id);
CREATE INDEX idx_order_items_order ON public.order_items(order_id);
CREATE INDEX idx_cart_items_user ON public.cart_items(user_id);
CREATE INDEX idx_addresses_user ON public.addresses(user_id);