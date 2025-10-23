import { useEffect, useMemo, useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { Navbar } from '@/components/Navbar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Package, TrendingUp, PlusCircle, Upload, Check, Truck, Download, MapPin, X, Trash2, Images } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { getCurrentPosition } from '@/lib/utils';
import { STATUS_LABEL, ORDER_STATUSES } from '@/lib/orderStatus';

const VendorDashboard = () => {
  const { userRoles, user, loading } = useAuth();
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center"><span className="text-sm text-muted-foreground">Loading…</span></div>
    );
  }

  if (!loading && !userRoles.includes('vendor')) {
    return <Navigate to="/vendor/auth" replace />;
  }

  const [activeSection, setActiveSection] = useState<string>('vendor-orders');

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-2 sm:px-4 py-4 sm:py-8">
        <div className="mb-4 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold">Vendor Dashboard</h1>
        </div>
        <VendorSectionNav activeSection={activeSection} onChange={setActiveSection} />
        <div className="h-2 sm:h-4" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          {activeSection === 'vendor-location' && (
          <Card id="vendor-location" className="lg:col-span-2">
            <CardHeader>
              <div className="flex items-center gap-2">
                <MapPin className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
                <CardTitle className="text-lg sm:text-xl">Shop Location</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <VendorLocationCard userId={user?.id ?? null} />
            </CardContent>
          </Card>
          )}

          {activeSection === 'vendor-products' && (
          <Card id="vendor-products" className="lg:col-span-2">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Package className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
                  <CardTitle className="text-lg sm:text-xl">My Products</CardTitle>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <VendorProductsList userId={user?.id ?? null} />
            </CardContent>
          </Card>
          )}

          {activeSection === 'vendor-add-product' && (
          <Card id="vendor-add-product" className="lg:col-span-2">
            <CardHeader>
              <div className="flex items-center gap-2">
                <PlusCircle className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
                <CardTitle className="text-lg sm:text-xl">Add New Product</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <AddProductForm userId={user?.id ?? null} />
            </CardContent>
          </Card>
          )}

          {activeSection === 'vendor-stats' && (
          <Card id="vendor-stats" className="lg:col-span-2">
            <CardHeader>
              <div className="flex items-center gap-2">
                <TrendingUp className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
                <CardTitle className="text-lg sm:text-xl">Stats</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-2xl sm:text-3xl font-bold">₹0</p>
            </CardContent>
          </Card>
          )}

          {activeSection === 'vendor-orders' && (
          <Card id="vendor-orders" className="lg:col-span-2">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Truck className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
                <CardTitle className="text-lg sm:text-xl">Orders</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <VendorOrders userId={user?.id ?? null} view="live" />
            </CardContent>
          </Card>
          )}

          {activeSection === 'vendor-orders-history' && (
          <Card id="vendor-orders-history" className="lg:col-span-2">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Truck className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
                <CardTitle className="text-lg sm:text-xl">Order History</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <VendorOrders userId={user?.id ?? null} view="history" />
            </CardContent>
          </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default VendorDashboard;

const VendorSectionNav = ({ activeSection, onChange }: { activeSection: string; onChange: (id: string) => void }) => {
  const sections = [
    { id: 'vendor-location', label: 'Location', icon: MapPin },
    { id: 'vendor-products', label: 'Products', icon: Package },
    { id: 'vendor-add-product', label: 'Add', icon: PlusCircle },
    { id: 'vendor-orders', label: 'Orders', icon: Truck },
    { id: 'vendor-orders-history', label: 'History', icon: Truck },
    { id: 'vendor-stats', label: 'Stats', icon: TrendingUp },
  ];
  return (
    <div className="sticky top-16 z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="rounded-xl border bg-card shadow-sm p-2 sm:p-3">
        <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-1 sm:gap-2">
          {sections.map((s) => {
            const Icon = s.icon;
            return (
              <Button
                key={s.id}
                variant={activeSection === s.id ? 'default' : 'outline'}
                size="sm"
                onClick={() => onChange(s.id)}
                className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-3 py-2 h-auto"
              >
                <Icon className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden xs:inline sm:inline">{s.label}</span>
              </Button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

const VendorLocationCard = ({ userId }: { userId: string | null }) => {
  const queryClient = useQueryClient();
  const { data: vendor, isLoading } = useQuery({
    queryKey: ['vendor-location', userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('vendors')
        .select('id, latitude, longitude')
        .eq('user_id', userId)
        .maybeSingle();
      if (error) throw error;
      return data as { id: string; latitude: number | null; longitude: number | null } | null;
    },
  });

  const setLocation = useMutation({
    mutationFn: async () => {
      if (!vendor?.id) throw new Error('Vendor profile not found');
      const pos = await getCurrentPosition();
      if (!pos) throw new Error('Unable to get current location');
      const { error } = await (supabase as any)
        .from('vendors')
        .update({ latitude: pos.lat, longitude: pos.lon })
        .eq('id', vendor.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Shop location updated');
      queryClient.invalidateQueries({ queryKey: ['vendor-location', userId] });
      queryClient.invalidateQueries({ queryKey: ['vendor-orders', vendor?.id] });
    },
    onError: (e: any) => toast.error(e?.message || 'Failed to set location'),
  });

  if (!userId) return <p className="text-sm text-muted-foreground">Sign in to manage location.</p>;
  if (isLoading) return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (!vendor) return <p className="text-sm text-muted-foreground">No vendor profile found.</p>;

  const hasLocation = vendor.latitude != null && vendor.longitude != null;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4">
        <div className="text-sm">
          <div className="font-medium">Status: {hasLocation ? 'Location set' : 'Not set'}</div>
          {hasLocation ? (
            <div className="text-xs text-muted-foreground break-all">
              Lat: {vendor.latitude} • Lon: {vendor.longitude}
              <br />
              <span className="text-green-600">✓ Ready for delivery assignment</span>
            </div>
          ) : (
            <div className="text-xs text-destructive">Vendor location is required for assignment</div>
          )}
        </div>
        <Button 
          size="sm" 
          onClick={() => setLocation.mutate()} 
          disabled={setLocation.isPending} 
          title="Update your current location"
          className="w-full sm:w-auto"
        >
          {hasLocation ? 'Update Location' : 'Set Current Location'}
        </Button>
      </div>
    </div>
  );
}

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

const VendorOrders = ({ userId, view = 'live' }: { userId: string | null; view?: 'live' | 'history' }) => {
  const { data: vendor } = useQuery({
    queryKey: ['vendor-location', userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('vendors')
        .select('id, latitude, longitude')
        .eq('user_id', userId)
        .maybeSingle();
      if (error) throw error;
      return data as { id: string; latitude: number | null; longitude: number | null } | null;
    },
  });

  const { data: orders, isLoading, refetch } = useQuery({
    queryKey: ['vendor-orders', vendor?.id],
    enabled: !!vendor?.id,
    queryFn: async () => {
      console.log('Fetching vendor orders...');
      
      if (!vendor?.id) {
        console.log('No vendor ID available');
        return [];
      }
      
      // Get vendor's product IDs first to avoid recursion
      const { data: vendorProducts, error: productsError } = await supabase
        .from('products')
        .select('id')
        .eq('vendor_id', vendor.id);
      
      if (productsError) {
        console.error('Error fetching vendor products:', productsError);
        throw productsError;
      }
      
      if (!vendorProducts || vendorProducts.length === 0) {
        console.log('No products found for vendor');
        return [];
      }
      
      const productIds = vendorProducts.map(p => p.id);
      console.log('Vendor product IDs:', productIds);
      
      // Get orders that have items from this vendor's products
      const { data: orderItems, error: orderItemsError } = await supabase
        .from('order_items')
        .select(`
          order_id,
          id, 
          product_id, 
          quantity, 
          snapshot_name, 
          snapshot_price
        `)
        .in('product_id', productIds);
      
      if (orderItemsError) {
        console.error('Error fetching order items:', orderItemsError);
        throw orderItemsError;
      }
      
      if (!orderItems || orderItems.length === 0) {
        console.log('No order items found for vendor products');
        return [];
      }
      
      // Get unique order IDs
      const orderIds = [...new Set(orderItems.map(oi => oi.order_id))];
      console.log('Order IDs with vendor products:', orderIds);
      
      // Get the actual orders
      const { data: basicOrders, error: basicError } = await supabase
        .from('orders')
        .select('*')
        .in('id', orderIds)
        .order('created_at', { ascending: false });
      
      console.log('Basic orders query result:', { data: basicOrders, error: basicError });
      
      if (basicError) {
        console.error('Basic orders query error:', basicError);
        throw basicError;
      }
      
      if (!basicOrders || basicOrders.length === 0) {
        console.log('No orders found');
        return [];
      }
      
      // Process orders with details
      const ordersWithDetails = await Promise.all(
        basicOrders.map(async (order) => {
          // Get order items for this order
          const orderOrderItems = orderItems.filter(oi => oi.order_id === order.id);
          
          // Get user profile
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('id, full_name, phone')
            .eq('id', order.user_id)
            .single();
          
          if (profileError) {
            console.error('Profile query error for order', order.id, ':', profileError);
          }
          
          // Get address
          const { data: address, error: addressError } = await supabase
            .from('addresses')
            .select('id, label, full_address, city, state, pincode, phone')
            .eq('id', order.address_id)
            .single();
          
          if (addressError) {
            console.error('Address query error for order', order.id, ':', addressError);
          }
          
          // Get delivery request status for this order
          const { data: dr, error: drErr } = await (supabase as any)
            .from('delivery_requests')
            .select('status')
            .eq('order_id', order.id)
            .maybeSingle();
          if (drErr) {
            console.error('Delivery request query error for order', order.id, ':', drErr);
          }

          console.log('Order', order.id, 'profile:', profile, 'address:', address);
          
          return {
            ...order,
            profiles: profile,
            addresses: address,
            order_items: orderOrderItems.map(oi => ({
              ...oi,
              products: { vendor_id: vendor.id }
            })),
            delivery_requests: dr || null,
          };
        })
      );
      
      // Don't filter out any orders - let the UI handle live vs history split
      const filtered = ordersWithDetails;
      
      console.log('Vendor orders with details:', filtered);
      return filtered as Array<{
        id: string;
        created_at: string;
        delivery_status: string | null;
        final_amount: number;
        user_id: string;
        address_id: string;
        profiles: { id: string; full_name: string; phone: string | null } | null;
        addresses: { id: string; label: string; full_address: string; city: string; state: string; pincode: string; phone: string | null } | null;
        order_items: Array<{ id: string; product_id: string | null; quantity: number; snapshot_name: string; snapshot_price: number; products: { vendor_id: string } | null }>;
      }>;
    },
    // Fallback polling to reflect delivery partner updates quickly
    refetchInterval: 5000,
  });

  const queryClient = useQueryClient();
  useEffect(() => {
    if (!vendor?.id) return;
    
    // Use a more targeted approach to avoid RLS recursion
    // Only listen to order_items and delivery_requests changes
    // and use polling for orders to avoid the problematic RLS policy
    const channel = supabase
      .channel(`orders-vendor-${vendor.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'order_items' }, () => {
        queryClient.invalidateQueries({ queryKey: ['vendor-orders', vendor.id] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'delivery_requests' }, () => {
        queryClient.invalidateQueries({ queryKey: ['vendor-orders', vendor.id] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [vendor?.id, queryClient]);
  const [hiddenOrderIds, setHiddenOrderIds] = useState<string[]>([] as string[]);
  const HIDDEN_VENDOR_ORDERS_KEY = 'hiddenVendorOrderIds';

  // Persist hidden orders across refresh so deleted items don't reappear
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(HIDDEN_VENDOR_ORDERS_KEY) || '[]');
      if (Array.isArray(saved)) setHiddenOrderIds(saved);
    } catch {}
  }, []);

  const persistHidden = (next: string[]) => {
    setHiddenOrderIds(next);
    try { localStorage.setItem(HIDDEN_VENDOR_ORDERS_KEY, JSON.stringify(next)); } catch {}
  };
  const assignNearest = useMutation({
    mutationFn: async (orderId: string) => {
      // Then, request backend to assign nearest partner (should set assigned server-side)
      const { data: rpcData, error: rpcErr } = await (supabase as any).rpc('assign_nearest_partner', { p_order_id: orderId });
      if (rpcErr) throw rpcErr;

      // After assignment, set orders.delivery_partner_id so partner can update order per RLS
      // 1) Get assigned partner (delivery_partners.id)
      const { data: reqRow, error: reqErr } = await (supabase as any)
        .from('delivery_requests')
        .select('assigned_partner_id')
        .eq('order_id', orderId)
        .maybeSingle();
      if (reqErr) throw reqErr;
      const assignedPartnerId = (reqRow as any)?.assigned_partner_id;
      if (assignedPartnerId) {
        // 2) Map to profiles.id (delivery_partners.user_id)
        const { data: partnerRow, error: partnerErr } = await supabase
          .from('delivery_partners')
          .select('user_id')
          .eq('id', assignedPartnerId)
          .maybeSingle();
        if (partnerErr) throw partnerErr;
        if (partnerRow?.user_id) {
          const { error: updOrderErr } = await supabase
            .from('orders')
            .update({ delivery_partner_id: partnerRow.user_id as any, delivery_status: 'assigned' as any })
            .eq('id', orderId);
          if (updOrderErr) throw updOrderErr;
        }
      }

      return { ok: true } as const;
    },
    onMutate: async (orderId: string) => {
      await queryClient.cancelQueries({ queryKey: ['vendor-orders', vendor?.id] });
      const prev = queryClient.getQueryData<any[]>(['vendor-orders', vendor?.id]) || [];
      // Optimistically leave status unchanged; assignment will reflect after RPC
      const next = prev;
      queryClient.setQueryData(['vendor-orders', vendor?.id], next);
      return { prev } as { prev: any[] };
    },
    onError: (err: any, _orderId, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(['vendor-orders', vendor?.id], ctx.prev);
      console.error('Assign nearest error:', err);
      toast.error(err?.message || 'Failed to assign partner');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['vendor-orders', vendor?.id] });
      toast.success('Assigned to nearest delivery partner');
    },
  });

  const rejectOrder = useMutation({
    mutationFn: async (orderId: string) => {
      console.log('Rejecting order via RPC:', orderId);
      const { error } = await (supabase as any).rpc('vendor_reject_order', { p_order_id: orderId });
      if (error) {
        console.error('vendor_reject_order RPC error:', error);
        throw error;
      }
      console.log('vendor_reject_order RPC success for:', orderId);
    },
    onMutate: async (orderId: string) => {
      await queryClient.cancelQueries({ queryKey: ['vendor-orders', vendor?.id] });
      const prevVendorOrders = queryClient.getQueryData<any[]>(['vendor-orders', vendor?.id]) || [];
      
      // Always mark as cancelled (never remove) - rejected orders should appear in history
      const nextVendorOrders = prevVendorOrders.map(order => 
        order.id === orderId ? { ...order, delivery_status: 'cancelled' } : order
      );
      queryClient.setQueryData(['vendor-orders', vendor?.id], nextVendorOrders);
      
      // Update order status in all user orders
      queryClient.setQueriesData({ queryKey: ['orders'] }, (oldData: any) => {
        if (!oldData) return oldData;
        return oldData.map((order: any) => 
          order.id === orderId ? { ...order, delivery_status: 'cancelled' } : order
        );
      });
      
      return { prevVendorOrders };
    },
    onSuccess: (_, orderId) => {
      console.log('Order rejection successful, invalidating queries for order:', orderId);
      
      // Invalidate vendor orders
      queryClient.invalidateQueries({ queryKey: ['vendor-orders', vendor?.id] });
      
      // Invalidate all user orders queries (for all users)
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      
      // Invalidate any delivery tracking queries
      queryClient.invalidateQueries({ queryKey: ['delivery-tracking', orderId] });
      
      // Invalidate any delivery requests queries
      queryClient.invalidateQueries({ queryKey: ['delivery-requests'] });
      
      // Force refetch of all order-related queries
      queryClient.refetchQueries({ queryKey: ['orders'] });
      queryClient.refetchQueries({ queryKey: ['vendor-orders'] });
      
      console.log('Queries invalidated and refetched');
      toast.success('Order rejected successfully.');
    },
    onError: (e: any, orderId, context) => {
      // Revert optimistic updates on error
      if (context?.prevVendorOrders) {
        queryClient.setQueryData(['vendor-orders', vendor?.id], context.prevVendorOrders);
        
        // Revert user orders as well
        queryClient.setQueriesData({ queryKey: ['orders'] }, (oldData: any) => {
          if (!oldData) return oldData;
          return oldData.map((order: any) => 
            order.id === orderId ? context.prevVendorOrders.find(o => o.id === orderId) || order : order
          );
        });
      }
      toast.error(e?.message || 'Failed to reject order');
    },
  });

  const deleteOrder = useMutation({
    mutationFn: async (orderId: string) => {
      console.log('Deleting order via RPC:', orderId);
      const { error } = await (supabase as any).rpc('vendor_delete_order', { p_order_id: orderId });
      if (error) {
        console.error('vendor_delete_order RPC error:', error);
        throw error;
      }
      console.log('vendor_delete_order RPC success for:', orderId);
    },
    onSuccess: (_, orderId) => {
      toast.success('Order deleted successfully');
      persistHidden(Array.from(new Set([...(hiddenOrderIds || []), orderId as string])));
      queryClient.invalidateQueries({ queryKey: ['vendor-orders', vendor?.id] });
    },
    onError: async (e: any, orderId) => {
      try {
        await supabase.from('orders').delete().eq('id', orderId as string);
        persistHidden(Array.from(new Set([...(hiddenOrderIds || []), orderId as string])));
        toast.success('Order deleted successfully');
        queryClient.invalidateQueries({ queryKey: ['vendor-orders', vendor?.id] });
      } catch (err: any) {
        toast.error(e?.message || 'Failed to delete order');
      }
    },
  });

  const testVendorAccess = useMutation({
    mutationFn: async () => {
      // Test profile access
      const { data: profileTest, error: profileError } = await supabase
        .from('profiles')
        .select('id, full_name, phone')
        .limit(1);
      
      // Test address access
      const { data: addressTest, error: addressError } = await supabase
        .from('addresses')
        .select('id, label, full_address')
        .limit(1);
      
      return {
        profileTest: { data: profileTest, error: profileError },
        addressTest: { data: addressTest, error: addressError }
      };
    },
    onSuccess: (data) => {
      console.log('Vendor access test:', data);
      toast.success(`Profile access: ${data.profileTest.error ? 'FAILED' : 'SUCCESS'}, Address access: ${data.addressTest.error ? 'FAILED' : 'SUCCESS'}`);
    },
    onError: (error: any) => {
      console.error('Vendor access test error:', error);
      toast.error('Vendor access test failed');
    },
  });

  const downloadReceipt = (order: any) => {
    // Get vendor details
    const vendorDetails = {
      businessName: "KashIT E-Commerce", // Your company name
      address: "123 Business Street, Tech City, TC 12345",
      phone: "+1 (555) 123-4567",
      email: "orders@kashit.com",
      website: "www.kashit.com"
    };

    // Create receipt HTML
    const receiptHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Invoice - Order ${order.id.slice(0, 8)}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
          .receipt { max-width: 800px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
          .header { text-align: center; border-bottom: 3px solid #2563eb; padding-bottom: 20px; margin-bottom: 30px; }
          .company-name { font-size: 28px; font-weight: bold; color: #2563eb; margin-bottom: 10px; }
          .company-details { color: #666; font-size: 14px; }
          .invoice-title { font-size: 24px; font-weight: bold; color: #333; margin: 20px 0; }
          .order-info { display: flex; justify-content: space-between; margin-bottom: 30px; }
          .order-details, .customer-details { flex: 1; }
          .section-title { font-size: 18px; font-weight: bold; color: #333; margin-bottom: 15px; border-bottom: 2px solid #e5e7eb; padding-bottom: 5px; }
          .info-row { margin-bottom: 8px; }
          .label { font-weight: bold; color: #555; }
          .value { color: #333; }
          .items-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          .items-table th, .items-table td { padding: 12px; text-align: left; border-bottom: 1px solid #e5e7eb; }
          .items-table th { background-color: #f8fafc; font-weight: bold; color: #374151; }
          .items-table tr:nth-child(even) { background-color: #f9fafb; }
          .total-section { margin-top: 30px; text-align: right; }
          .total-row { font-size: 18px; font-weight: bold; color: #2563eb; margin-top: 10px; }
          .footer { margin-top: 40px; text-align: center; color: #666; font-size: 12px; border-top: 1px solid #e5e7eb; padding-top: 20px; }
          .status-badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: bold; text-transform: uppercase; }
          .status-pending { background-color: #fef3c7; color: #92400e; }
          .status-assigned { background-color: #dbeafe; color: #1e40af; }
          .status-out_for_delivery { background-color: #e0e7ff; color: #5b21b6; }
          .status-delivered { background-color: #d1fae5; color: #065f46; }
        </style>
      </head>
      <body>
        <div class="receipt">
          <div class="header">
            <div class="company-name">${vendorDetails.businessName}</div>
            <div class="company-details">
              ${vendorDetails.address}<br>
              Phone: ${vendorDetails.phone} | Email: ${vendorDetails.email}<br>
              Website: ${vendorDetails.website}
            </div>
          </div>

          <div class="invoice-title">INVOICE</div>

          <div class="order-info">
            <div class="order-details">
              <div class="section-title">Order Information</div>
              <div class="info-row"><span class="label">Order ID:</span> <span class="value">#${order.id.slice(0, 8)}</span></div>
              <div class="info-row"><span class="label">Order Date:</span> <span class="value">${new Date(order.created_at).toLocaleDateString()}</span></div>
              <div class="info-row"><span class="label">Order Time:</span> <span class="value">${new Date(order.created_at).toLocaleTimeString()}</span></div>
              <div class="info-row"><span class="label">Status:</span> <span class="value status-badge status-${order.delivery_status || 'pending'}">${order.delivery_status || 'pending'}</span></div>
            </div>
            <div class="customer-details">
              <div class="section-title">Customer Information</div>
              <div class="info-row"><span class="label">Name:</span> <span class="value">${order.profiles?.full_name || 'N/A'}</span></div>
              <div class="info-row"><span class="label">Phone:</span> <span class="value">${order.profiles?.phone || 'N/A'}</span></div>
              <div class="info-row"><span class="label">Address:</span> <span class="value">${order.addresses?.label || 'N/A'}</span></div>
              <div class="info-row"><span class="label">Location:</span> <span class="value">${order.addresses?.full_address || 'N/A'}</span></div>
              <div class="info-row"><span class="label">City:</span> <span class="value">${order.addresses?.city || 'N/A'}, ${order.addresses?.state || 'N/A'} - ${order.addresses?.pincode || 'N/A'}</span></div>
            </div>
          </div>

          <div class="section-title">Order Items</div>
          <table class="items-table">
            <thead>
              <tr>
                <th>Item</th>
                <th>Quantity</th>
                <th>Unit Price</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              ${order.order_items.map((item: any) => `
                <tr>
                  <td>${item.snapshot_name}</td>
                  <td>${item.quantity}</td>
                  <td>₹${item.snapshot_price.toFixed(2)}</td>
                  <td>₹${(item.snapshot_price * item.quantity).toFixed(2)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="total-section">
            <div class="total-row">Total Amount: ₹${order.final_amount.toFixed(2)}</div>
          </div>

          <div class="footer">
            <p>Thank you for your business!</p>
            <p>This is a computer-generated invoice. No signature required.</p>
            <p>Generated on ${new Date().toLocaleString()}</p>
          </div>
        </div>
      </body>
      </html>
    `;

    // Create and download the file
    const blob = new Blob([receiptHTML], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `invoice-${order.id.slice(0, 8)}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast.success('Receipt downloaded successfully!');
  };

  if (!vendor?.id) return <p className="text-sm text-muted-foreground">Vendor profile not found.</p>;
  if (isLoading) return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (!orders || orders.length === 0) return <p className="text-sm text-muted-foreground">No orders for your products yet.</p>;

  const splitByStatus = (list: any[]) => {
    const live: any[] = [];
    const history: any[] = [];
    for (const o of list) {
      const deliveryRequestStatus = (o as any).delivery_requests?.status as string | null;
      const orderStatus = o.delivery_status as string | null;
      
      // Check both delivery_requests.status and orders.delivery_status for delivered/cancelled
      const isDelivered = deliveryRequestStatus === 'delivered' || orderStatus === 'delivered';
      const isCancelled = deliveryRequestStatus === 'cancelled' || orderStatus === 'cancelled';
      
      if (isDelivered || isCancelled) {
        history.push(o);
      } else {
        live.push(o);
      }
    }
    return { live, history };
  };
  const { live: liveOrders, history: historyOrders } = splitByStatus(orders);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 mb-4">
        <h3 className="text-lg font-semibold">Orders with Your Products</h3>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => testVendorAccess.mutate()}
          disabled={testVendorAccess.isPending}
          className="w-full sm:w-auto"
        >
          Test Access
        </Button>
      </div>
      <div className="max-h-[600px] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
        {(view === 'live' ? liveOrders : historyOrders).filter((o) => !hiddenOrderIds.includes(o.id)).map((o) => {
        const deliveryRequestStatus = (o as any).delivery_requests?.status as string | null;
        const orderStatus = o.delivery_status as string | null;
        const effectiveStatus = deliveryRequestStatus || orderStatus;
        const delivered = deliveryRequestStatus === 'delivered' || orderStatus === 'delivered';
        return (
        <div key={o.id} className={`p-3 sm:p-4 border rounded-md ${delivered ? 'border-green-500 bg-green-50' : ''}`}>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
            <div>
              <div className="font-semibold text-sm sm:text-base">Order #{o.id.slice(0, 8)}</div>
              <div className="text-xs text-muted-foreground">{new Date(o.created_at).toLocaleString()}</div>
            </div>
            <div className="text-xs sm:text-sm">Status: <span className={`uppercase ${delivered ? 'text-green-700' : ''}`}>{STATUS_LABEL[(effectiveStatus || 'pending') as any] || (effectiveStatus || 'pending')}</span></div>
          </div>

          {/* Customer Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-3">
            <div>
              <h4 className="font-medium text-sm mb-1">Customer</h4>
              <p className="text-sm text-muted-foreground">
                {o.profiles?.full_name || 'N/A'}
              </p>
              <p className="text-sm text-muted-foreground">
                {o.profiles?.phone || 'N/A'}
              </p>
            </div>
            <div>
              <h4 className="font-medium text-sm mb-1">Delivery Address</h4>
              <p className="text-sm text-muted-foreground">
                {o.addresses?.label || 'N/A'}
              </p>
              <p className="text-sm text-muted-foreground break-words">
                {o.addresses?.full_address || 'N/A'}
              </p>
              <p className="text-sm text-muted-foreground">
                {o.addresses?.city}, {o.addresses?.state} - {o.addresses?.pincode}
              </p>
            </div>
          </div>

          {/* Order Items */}
          <div className="space-y-1 mb-3">
            <h4 className="font-medium text-sm mb-1">Order Items</h4>
            {o.order_items.map((oi) => (
              <div key={oi.id} className="flex justify-between text-sm">
                <span className="break-words">{oi.snapshot_name} × {oi.quantity}</span>
                <span className="whitespace-nowrap">₹{(oi.snapshot_price * oi.quantity).toFixed(2)}</span>
              </div>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="font-bold text-sm sm:text-base">Total: ₹{o.final_amount}</div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <Button 
                size="sm" 
                variant="outline" 
                onClick={() => downloadReceipt(o)} 
                className={`w-full sm:w-auto ${delivered ? 'border-green-600 text-green-700' : ''}`}
              >
                <Download className="h-4 w-4 mr-1" /> 
                <span className="hidden xs:inline">Download Receipt</span>
                <span className="xs:hidden">Receipt</span>
              </Button>
              {view === 'live' && !delivered && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => assignNearest.mutate(o.id)}
                disabled={
                  assignNearest.isPending ||
                  vendor?.latitude == null ||
                  vendor?.longitude == null ||
                  ['assigned','accepted','picked_up','out_for_delivery','delivered'].includes(((o as any).delivery_requests?.status || o.delivery_status) as any)
                }
                title={
                  vendor?.latitude == null || vendor?.longitude == null
                    ? 'Set shop location first'
                    : ((o as any).delivery_requests?.status || o.delivery_status) === 'assigned'
                    ? 'Awaiting partner response'
                    : ''
                }
                className="w-full sm:w-auto"
              >
                <Check className="h-4 w-4 mr-1" />
                {
                  assignNearest.isPending
                    ? 'Assigning…'
                    : ((s => (
                        s === 'assigned'
                          ? 'Awaiting Partner'
                          : s === 'accepted'
                          ? 'Accepted by Partner'
                          : ['picked_up','out_for_delivery','delivered'].includes(s as any)
                          ? 'Already Assigned'
                          : 'Approve & Assign'
                      ))(((o as any).delivery_requests?.status || o.delivery_status) as any))
                }
              </Button>
              )}
              {view === 'live' && !delivered && (
              <Button 
                size="sm" 
                variant="destructive" 
                onClick={() => rejectOrder.mutate(o.id)} 
                disabled={rejectOrder.isPending}
                className="w-full sm:w-auto"
              >
                <X className="h-4 w-4 mr-1" /> Reject
              </Button>
              )}
              {view === 'history' && (
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={() => deleteOrder.mutate(o.id)} 
                  disabled={deleteOrder.isPending}
                  className="w-full sm:w-auto"
                >
                  <Trash2 className="h-4 w-4 mr-1" /> Delete
                </Button>
              )}
            </div>
          </div>
        </div>
      );
      })}
      </div>
    </div>
  );
};

const VendorProductsList = ({ userId }: { userId: string | null }) => {
  const queryClient = useQueryClient();
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
        .eq('is_active', true)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Array<{ id: string; name: string; price: number; stock: number; unit: string | null; is_approved: boolean | null; image_url: string | null }>;
    },
  });

  const deleteProduct = useMutation({
    mutationFn: async (productId: string) => {
      // Soft-delete: mark inactive so it disappears from the storefront immediately
      const { error } = await supabase
        .from('products')
        .update({ is_active: false as any })
        .eq('id', productId)
        .eq('vendor_id', vendor!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Product removed from storefront');
      queryClient.invalidateQueries({ queryKey: ['vendor-products', vendor?.id] });
      // Also refresh public product lists
      queryClient.invalidateQueries({ predicate: (q) => Array.isArray(q.queryKey) && (
        String(q.queryKey[0]).includes('products') || q.queryKey[0] === 'featured-products'
      ) });
    },
    onError: (e: any) => toast.error(e?.message || 'Failed to delete product'),
  });

  if (!vendor?.id) return <p className="text-sm text-muted-foreground">Vendor profile not found.</p>;
  if (isLoading) return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (!products || products.length === 0) return <p className="text-sm text-muted-foreground">No products yet.</p>;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[500px] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
      {products.map((p) => (
        <div key={p.id} className="p-3 sm:p-4 border rounded-md flex flex-col sm:flex-row gap-3 items-start sm:items-center">
          <div className="w-16 h-16 bg-muted rounded overflow-hidden flex items-center justify-center flex-shrink-0">
            {p.image_url ? (
              <img src={p.image_url} alt={p.name} className="object-cover w-full h-full" />
            ) : (
              <Package className="h-6 w-6 text-muted-foreground" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-sm sm:text-base">
              <span className="break-words">{p.name}</span>
              {p.is_approved ? (
                <span className="ml-2 text-xs text-green-600">Approved</span>
              ) : (
                <span className="ml-2 text-xs text-yellow-600">Pending</span>
              )}
            </div>
            <div className="text-sm text-muted-foreground">₹{p.price} • Stock {p.stock}{p.unit ? ` ${p.unit}` : ''}</div>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <ManageProductPhotosButton productId={p.id} />
            <Button
              size="sm"
              variant="destructive"
              onClick={() => {
                if (confirm('Remove this product from the storefront?')) deleteProduct.mutate(p.id);
              }}
              title="Remove product from storefront"
              className="flex-1 sm:flex-none"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
};

const ManageProductPhotosButton = ({ productId }: { productId: string }) => {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)} title="Manage photos">
        <Images className="h-4 w-4 mr-1" /> Photos
      </Button>
      {open && <ManageProductPhotosDialog productId={productId} onClose={() => setOpen(false)} />}
    </>
  );
};

const ManageProductPhotosDialog = ({ productId, onClose }: { productId: string; onClose: () => void }) => {
  const [files, setFiles] = useState<FileList | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [items, setItems] = useState<Array<{ name: string; publicUrl: string }>>([]);

  const fetchList = async () => {
    try {
      const { data, error } = await supabase.storage.from('product-images').list(productId, { sortBy: { column: 'created_at', order: 'desc' } });
      if (error) throw error;
      const mapped = (data || []).filter((i: any) => i.name !== '.empty').map((i: any) => {
        const { data: urlData } = supabase.storage.from('product-images').getPublicUrl(`${productId}/${i.name}`);
        return { name: i.name, publicUrl: urlData.publicUrl };
      });
      setItems(mapped);
    } catch (e: any) {
      toast.error(e?.message || 'Failed to load photos');
    }
  };

  useEffect(() => { fetchList(); }, []);

  const onUpload = async () => {
    if (!files || files.length === 0) return;
    setIsUploading(true);
    try {
      for (const file of Array.from(files)) {
        const ext = file.name.split('.').pop();
        const path = `${productId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const { error } = await supabase.storage.from('product-images').upload(path, file, { upsert: false, cacheControl: '3600' });
        if (error) throw error;
      }
      toast.success('Photos uploaded');
      setFiles(null);
      await fetchList();
    } catch (e: any) {
      toast.error(e?.message || 'Failed to upload');
    } finally {
      setIsUploading(false);
    }
  };

  const onDelete = async (name: string) => {
    try {
      const { error } = await supabase.storage.from('product-images').remove([`${productId}/${name}`]);
      if (error) throw error;
      toast.success('Photo deleted');
      await fetchList();
    } catch (e: any) {
      toast.error(e?.message || 'Failed to delete photo');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-background w-full max-w-lg rounded-md p-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <div className="font-semibold text-sm sm:text-base">Manage Photos</div>
          <Button size="sm" variant="outline" onClick={onClose} className="text-xs sm:text-sm">Close</Button>
        </div>
        <div className="space-y-3">
          <div>
            <input 
              type="file" 
              multiple 
              accept="image/*" 
              onChange={(e) => setFiles(e.target.files)} 
              className="w-full text-xs sm:text-sm"
            />
            <div className="mt-2">
              <Button 
                size="sm" 
                onClick={onUpload} 
                disabled={isUploading || !files || files.length === 0}
                className="w-full sm:w-auto"
              >
                {isUploading ? 'Uploading…' : 'Upload'}
              </Button>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3 max-h-60 sm:max-h-80 overflow-auto">
            {items.map((it) => (
              <div key={it.name} className="relative border rounded overflow-hidden">
                <img src={it.publicUrl} alt={it.name} className="object-cover w-full h-20 sm:h-28" />
                <div className="absolute top-1 right-1">
                  <Button variant="destructive" size="icon" onClick={() => onDelete(it.name)} className="h-6 w-6">
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
            {items.length === 0 && (
              <div className="col-span-2 sm:col-span-3 text-xs sm:text-sm text-muted-foreground text-center py-4">No photos yet. Upload images to showcase the product.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
