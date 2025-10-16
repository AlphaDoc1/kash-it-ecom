import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { Navbar } from '@/components/Navbar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Package, TrendingUp, PlusCircle, Upload, Check, Truck } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const VendorDashboard = () => {
  const { userRoles, user, loading } = useAuth();
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center"><span className="text-sm text-muted-foreground">Loading…</span></div>
    );
  }

  if (!userRoles.includes('vendor')) {
    navigate('/vendor/auth');
    return (
      <div className="min-h-screen flex items-center justify-center">
        <a href="/vendor/auth" className="text-sm text-primary underline">Go to vendor login</a>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold mb-8">Vendor Dashboard</h1>
        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Package className="h-8 w-8 text-primary" />
                  <CardTitle>My Products</CardTitle>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <VendorProductsList userId={user?.id ?? null} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <PlusCircle className="h-8 w-8 text-primary" />
                <CardTitle>Add New Product</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <AddProductForm userId={user?.id ?? null} />
            </CardContent>
          </Card>

          <Card className="md:col-span-2">
            <CardHeader>
              <div className="flex items-center gap-2"><TrendingUp className="h-8 w-8 text-primary" /><CardTitle>Stats</CardTitle></div>
            </CardHeader>
            <CardContent><p className="text-3xl font-bold">₹0</p></CardContent>
          </Card>

          <Card className="md:col-span-2">
            <CardHeader>
              <div className="flex items-center gap-2"><Truck className="h-8 w-8 text-primary" /><CardTitle>Orders</CardTitle></div>
            </CardHeader>
            <CardContent>
              <VendorOrders userId={user?.id ?? null} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default VendorDashboard;

const AddProductForm = ({ userId }: { userId: string | null }) => {
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [categoryId, setCategoryId] = useState<string>('');
  const [unit, setUnit] = useState('piece');
  const [stock, setStock] = useState('0');
  const [description, setDescription] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('id, name')
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return data as Array<{ id: string; name: string }>;
    },
  });

  const { data: vendor } = useQuery({
    queryKey: ['vendor-profile', userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vendors')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();
      if (error) throw error;
      return data as { id: string } | null;
    },
  });

  const createProduct = useMutation({
    mutationFn: async () => {
      if (!userId) throw new Error('Not authenticated');
      if (!vendor?.id) throw new Error('Vendor profile not found');
      if (!categoryId) throw new Error('Select a category');
      if (!name || !price) throw new Error('Name and price are required');

      let imageUrl: string | null = null;
      if (imageFile) {
        const fileExt = imageFile.name.split('.').pop();
        const path = `${vendor.id}/${Date.now()}.${fileExt}`;
        const { error: uploadErr } = await supabase.storage
          .from('product-images')
          .upload(path, imageFile, {
            cacheControl: '3600',
            upsert: false,
          });
        if (uploadErr) throw uploadErr;
        const { data } = supabase.storage.from('product-images').getPublicUrl(path);
        imageUrl = data.publicUrl;
      }

      const { error } = await (supabase as any).rpc('create_product', {
        p_category_id: categoryId || null,
        p_name: name.trim(),
        p_description: description.trim() || null,
        p_price: Number(price),
        p_stock: Number(stock || '0'),
        p_unit: unit.trim() || null,
        p_image_url: imageUrl,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Product submitted for approval');
      setName('');
      setPrice('');
      setCategoryId('');
      setUnit('piece');
      setStock('0');
      setDescription('');
      setImageFile(null);
      queryClient.invalidateQueries({ queryKey: ['vendor-products'] });
    },
    onError: (err: any) => toast.error(err?.message || 'Failed to add product'),
  });

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createProduct.mutate();
  };

  return (
    <form className="space-y-4" onSubmit={onSubmit}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Product Name</label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Tomatoes" required />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Price</label>
          <Input value={price} onChange={(e) => setPrice(e.target.value)} type="number" min="0" step="0.01" placeholder="100" required />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Category</label>
          <Select value={categoryId} onValueChange={setCategoryId}>
            <SelectTrigger>
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              {categories?.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Unit</label>
          <Input value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="piece / kg / pack" />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Stock</label>
          <Input value={stock} onChange={(e) => setStock(e.target.value)} type="number" min="0" step="1" />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Image</label>
          <Input type="file" accept="image/*" onChange={(e) => setImageFile(e.target.files?.[0] || null)} />
        </div>
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium">Description</label>
        <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe your product" />
      </div>
      <Button type="submit" disabled={createProduct.isPending}>
        <Upload className="h-4 w-4 mr-2" /> {createProduct.isPending ? 'Saving…' : 'Submit for Approval'}
      </Button>
    </form>
  );
};

const VendorOrders = ({ userId }: { userId: string | null }) => {
  const { data: vendor } = useQuery({
    queryKey: ['vendor-profile', userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vendors')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();
      if (error) throw error;
      return data as { id: string } | null;
    },
  });

  const { data: orders, isLoading, refetch } = useQuery({
    queryKey: ['vendor-orders', vendor?.id],
    enabled: !!vendor?.id,
    queryFn: async () => {
      // Fetch orders that contain products from this vendor
      const { data, error } = await supabase
        .from('orders')
        .select('id, created_at, delivery_status, final_amount, order_items(id, product_id, quantity, snapshot_name, snapshot_price, products(vendor_id))')
        .order('created_at', { ascending: false });
      if (error) throw error;
      // Filter on client to ensure any order_items -> products.vendor_id matches this vendor
      const filtered = (data as any[]).filter((o) => (o.order_items || []).some((oi: any) => oi.products?.vendor_id === vendor!.id));
      return filtered as Array<{
        id: string;
        created_at: string;
        delivery_status: string | null;
        final_amount: number;
        order_items: Array<{ id: string; product_id: string | null; quantity: number; snapshot_name: string; snapshot_price: number; products: { vendor_id: string } | null }>;
      }>;
    },
  });

  const queryClient = useQueryClient();
  const updateStatus = useMutation({
    mutationFn: async ({ orderId, status }: { orderId: string; status: 'assigned' | 'out_for_delivery' | 'delivered' }) => {
      const { error } = await supabase
        .from('orders')
        .update({ delivery_status: status })
        .eq('id', orderId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendor-orders', vendor?.id] });
      toast.success('Order status updated');
    },
    onError: (err: any) => toast.error(err?.message || 'Failed to update order'),
  });

  if (!vendor?.id) return <p className="text-sm text-muted-foreground">Vendor profile not found.</p>;
  if (isLoading) return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (!orders || orders.length === 0) return <p className="text-sm text-muted-foreground">No orders for your products yet.</p>;

  return (
    <div className="space-y-4">
      {orders.map((o) => (
        <div key={o.id} className="p-4 border rounded-md">
          <div className="flex items-center justify-between mb-2">
            <div>
              <div className="font-semibold">Order #{o.id.slice(0, 8)}</div>
              <div className="text-xs text-muted-foreground">{new Date(o.created_at).toLocaleString()}</div>
            </div>
            <div className="text-sm">Status: <span className="uppercase">{o.delivery_status || 'pending'}</span></div>
          </div>
          <div className="space-y-1 mb-3">
            {o.order_items.map((oi) => (
              <div key={oi.id} className="flex justify-between text-sm">
                <span>{oi.snapshot_name} × {oi.quantity}</span>
                <span>₹{(oi.snapshot_price * oi.quantity).toFixed(2)}</span>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between">
            <div className="font-bold">Total: ₹{o.final_amount}</div>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={() => updateStatus.mutate({ orderId: o.id, status: 'assigned' })}><Check className="h-4 w-4 mr-1" /> Approve</Button>
              <Button size="sm" onClick={() => updateStatus.mutate({ orderId: o.id, status: 'out_for_delivery' })}><Truck className="h-4 w-4 mr-1" /> Mark Shipped</Button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

const VendorProductsList = ({ userId }: { userId: string | null }) => {
  const { data: vendor } = useQuery({
    queryKey: ['vendor-profile', userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vendors')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();
      if (error) throw error;
      return data as { id: string } | null;
    },
  });

  const { data: products, isLoading } = useQuery({
    queryKey: ['vendor-products', vendor?.id],
    enabled: !!vendor?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('id, name, price, stock, unit, is_approved, image_url')
        .eq('vendor_id', vendor!.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Array<{ id: string; name: string; price: number; stock: number; unit: string | null; is_approved: boolean | null; image_url: string | null }>;
    },
  });

  if (!vendor?.id) return <p className="text-sm text-muted-foreground">Vendor profile not found.</p>;
  if (isLoading) return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (!products || products.length === 0) return <p className="text-sm text-muted-foreground">No products yet.</p>;

  return (
    <div className="grid sm:grid-cols-2 gap-4">
      {products.map((p) => (
        <div key={p.id} className="p-4 border rounded-md flex gap-3 items-center">
          <div className="w-16 h-16 bg-muted rounded overflow-hidden flex items-center justify-center">
            {p.image_url ? (
              <img src={p.image_url} alt={p.name} className="object-cover w-full h-full" />
            ) : (
              <Package className="h-6 w-6 text-muted-foreground" />
            )}
          </div>
          <div className="flex-1">
            <div className="font-semibold">
              {p.name}
              {p.is_approved ? (
                <span className="ml-2 text-xs text-green-600">Approved</span>
              ) : (
                <span className="ml-2 text-xs text-yellow-600">Pending</span>
              )}
            </div>
            <div className="text-sm text-muted-foreground">₹{p.price} • Stock {p.stock}{p.unit ? ` ${p.unit}` : ''}</div>
          </div>
        </div>
      ))}
    </div>
  );
};
