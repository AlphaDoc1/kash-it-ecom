import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Auth from '@/pages/Auth';
import { useAuth } from '@/lib/auth';
import { Navbar } from '@/components/Navbar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Users, Package, Store, Truck, Send, Ban, RefreshCcw, Check, Eye, UserCheck } from 'lucide-react';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const AdminDashboard = () => {
  const { userRoles, user, loading } = useAuth();
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center"><span className="text-sm text-muted-foreground">Loading…</span></div>
    );
  }

  if (!user || !userRoles.includes('admin')) {
    // Inline admin auth when not authorized
    return <Auth />;
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-2 sm:px-4 py-4 sm:py-8">
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-4 sm:mb-8">Admin Dashboard</h1>

        {/* Statistics Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-4 mb-4 sm:mb-8">
          <StatsCard title="Users" icon={<Users className="h-4 w-4" />} queryKey="admin-users-count" />
          <StatsCard title="Products" icon={<Package className="h-4 w-4" />} queryKey="admin-products-count" />
          <StatsCard title="Vendors" icon={<Store className="h-4 w-4" />} queryKey="admin-vendors-count" />
          <StatsCard title="Orders" icon={<Truck className="h-4 w-4" />} queryKey="admin-orders-count" />
          <StatsCard title="Delivery Partners" icon={<UserCheck className="h-4 w-4" />} queryKey="admin-delivery-count" />
        </div>

        <Tabs defaultValue="vendors" className="w-full">
          <div className="overflow-x-auto">
            <TabsList className="grid w-full grid-cols-4 min-w-[400px]">
              <TabsTrigger value="vendors" className="text-xs sm:text-sm">Vendors</TabsTrigger>
              <TabsTrigger value="delivery" className="text-xs sm:text-sm">Delivery</TabsTrigger>
              <TabsTrigger value="products" className="text-xs sm:text-sm">Products</TabsTrigger>
              <TabsTrigger value="orders" className="text-xs sm:text-sm">Orders</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="vendors" className="space-y-4 sm:space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
              <Card className="lg:col-span-1">
                <VendorInviteForm invitedByUserId={user?.id ?? null} />
              </Card>
              <Card className="lg:col-span-2">
                <VendorInvitationsList />
              </Card>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
              <Card className="lg:col-span-1">
                <VendorsList />
              </Card>
              <Card className="lg:col-span-2">
                <VendorProductsApproval />
              </Card>
            </div>
            <Card>
              <VendorsCrud />
            </Card>
          </TabsContent>

          <TabsContent value="delivery" className="space-y-4 sm:space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
              <Card className="lg:col-span-1">
                <DeliveryApplicationsList />
              </Card>
              <Card className="lg:col-span-2">
                <DeliveryApplicationsActions />
              </Card>
            </div>
            <Card>
              <DeliveryPartnersCrud />
            </Card>
          </TabsContent>

          <TabsContent value="products" className="space-y-4 sm:space-y-6">
            <Card>
              <VendorProductsApproval />
            </Card>
          </TabsContent>

          <TabsContent value="orders" className="space-y-4 sm:space-y-6">
            <Card>
              <OrderManagement />
            </Card>
            <Card>
              <DeliveryRequestsAdmin />
            </Card>
            <Card>
              <RejectedOrdersAdmin />
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AdminDashboard;

const OrderManagement = () => {
  const { data: orders, isLoading, refetch, error } = useQuery({
    queryKey: ['admin-orders'],
    queryFn: async () => {
      console.log('Fetching orders for admin...');
      
      // First try a simple query to get basic order data
      const { data: basicOrders, error: basicError } = await supabase
        .from('orders')
        .select('*')
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
      
      // Now get related data for each order
      const ordersWithDetails = await Promise.all(
        basicOrders.map(async (order) => {
          // Get user profile
          const { data: profile } = await supabase
            .from('profiles')
            .select('id, full_name, phone')
            .eq('id', order.user_id)
            .single();
          
          // Get address
          const { data: address, error: addressError } = await supabase
            .from('addresses')
            .select('id, label, full_address, city, state, pincode, phone')
            .eq('id', order.address_id)
            .single();
          
          if (addressError) {
            console.error('Address query error for order', order.id, ':', addressError);
          }
          
          // Get order items with vendor info
          const { data: orderItems } = await supabase
            .from('order_items')
            .select(`
              id,
              quantity,
              snapshot_name,
              snapshot_price,
              products (
                id,
                name,
                vendors (
                  id,
                  business_name
                )
              )
            `)
            .eq('order_id', order.id);
          
          return {
            ...order,
            profiles: profile,
            addresses: address,
            order_items: orderItems || []
          };
        })
      );
      
      console.log('Orders with details:', ordersWithDetails);
      return ordersWithDetails;
    },
  });


  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'text-yellow-600 bg-yellow-100';
      case 'confirmed': return 'text-blue-600 bg-blue-100';
      case 'shipped': return 'text-purple-600 bg-purple-100';
      case 'delivered': return 'text-green-600 bg-green-100';
      case 'cancelled': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'text-yellow-600 bg-yellow-100';
      case 'paid': return 'text-green-600 bg-green-100';
      case 'COD': return 'text-blue-600 bg-blue-100';
      case 'failed': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  if (isLoading) {
    return (
      <CardContent>
        <CardHeader className="p-0 mb-4">
          <CardTitle className="text-xl flex items-center gap-2">
            <Truck className="h-5 w-5 text-primary" /> Order Management
          </CardTitle>
        </CardHeader>
        <p className="text-sm text-muted-foreground">Loading orders...</p>
      </CardContent>
    );
  }

  if (error) {
    return (
      <CardContent>
        <CardHeader className="p-0 mb-4">
          <CardTitle className="text-xl flex items-center gap-2">
            <Truck className="h-5 w-5 text-primary" /> Order Management
          </CardTitle>
        </CardHeader>
        <div className="text-red-600">
          <p className="font-semibold">Error loading orders:</p>
          <p className="text-sm">{error.message}</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} className="mt-2">
          <RefreshCcw className="h-4 w-4 mr-2" /> Retry
        </Button>
      </CardContent>
    );
  }

  return (
    <CardContent>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-2">
        <CardHeader className="p-0">
          <CardTitle className="text-lg sm:text-xl flex items-center gap-2">
            <Truck className="h-4 w-4 sm:h-5 sm:w-5 text-primary" /> Order Management
          </CardTitle>
        </CardHeader>
        <Button variant="outline" size="sm" onClick={() => refetch()} className="w-full sm:w-auto">
          <RefreshCcw className="h-4 w-4 mr-2" /> Refresh
        </Button>
      </div>

      {!orders || orders.length === 0 ? (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">No orders found</p>
          <p className="text-xs text-muted-foreground">
            Debug shows: 1 order exists, but query returned {orders?.length || 0} orders
          </p>
        </div>
      ) : (
        <div className="space-y-3 sm:space-y-4">
          {orders.map((order) => (
            <div key={order.id} className="p-3 sm:p-4 border rounded-lg">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-3 gap-2">
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold text-sm sm:text-base">Order #{order.id.slice(-8)}</h3>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    {new Date(order.created_at).toLocaleString()}
                  </p>
                </div>
                <div className="text-left sm:text-right">
                  <p className="font-semibold text-sm sm:text-base">₹{order.final_amount?.toFixed(2) || '0.00'}</p>
                  <div className="flex flex-wrap gap-1 sm:gap-2 mt-1">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(order.delivery_status)}`}>
                      {order.delivery_status}
                    </span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPaymentStatusColor(order.payment_status)}`}>
                      {order.payment_status}
                    </span>
                  </div>
                </div>
              </div>

              {/* Customer Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-3">
                <div>
                  <h4 className="font-medium text-xs sm:text-sm mb-1">Customer</h4>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    {order.profiles?.full_name || 'N/A'}
                  </p>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    {order.profiles?.phone || 'N/A'}
                  </p>
                </div>
                <div>
                  <h4 className="font-medium text-xs sm:text-sm mb-1">Delivery Address</h4>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    {order.addresses?.label || 'N/A'}
                  </p>
                  <p className="text-xs sm:text-sm text-muted-foreground break-words">
                    {order.addresses?.full_address || 'N/A'}
                  </p>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    {order.addresses?.city}, {order.addresses?.state} - {order.addresses?.pincode}
                  </p>
                </div>
              </div>

              {/* Order Items */}
              <div className="mb-3">
                <h4 className="font-medium text-xs sm:text-sm mb-2">Order Items</h4>
                <div className="space-y-1">
                  {order.order_items?.map((item) => (
                    <div key={item.id} className="flex flex-col sm:flex-row sm:justify-between text-xs sm:text-sm gap-1">
                      <span className="break-words">
                        {item.snapshot_name} x {item.quantity}
                        {item.products?.vendors?.business_name && (
                          <span className="text-muted-foreground ml-1 sm:ml-2 block sm:inline">
                            (Vendor: {item.products.vendors.business_name})
                          </span>
                        )}
                      </span>
                      <span className="font-semibold">
                        ₹{(item.snapshot_price * item.quantity).toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          ))}
        </div>
      )}
    </CardContent>
  );
};

const RejectedOrdersAdmin = () => {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['admin-rejected-orders'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('delivery_status', 'cancelled')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });

  return (
    <CardContent>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-2">
        <CardHeader className="p-0">
          <CardTitle className="text-lg sm:text-xl">Rejected/Deleted Orders</CardTitle>
        </CardHeader>
        <Button variant="outline" size="sm" onClick={() => refetch()} className="w-full sm:w-auto">
          <RefreshCcw className="h-4 w-4 mr-2" /> Refresh
        </Button>
      </div>
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : !data || data.length === 0 ? (
        <p className="text-sm text-muted-foreground">No rejected or deleted orders.</p>
      ) : (
        <div className="space-y-2">
          {data.map((o) => (
            <div key={o.id} className="p-3 border rounded text-sm flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="font-medium text-xs sm:text-sm">#{o.id.slice(0,8)}</div>
                <div className="text-xs text-muted-foreground">{new Date(o.created_at).toLocaleString()} • Cancelled</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </CardContent>
  );
}

const DeliveryRequestsAdmin = () => {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['admin-delivery-requests'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('delivery_requests')
        .select('id, order_id, status, assigned_partner_id, vendor_id, user_id, created_at, updated_at')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });

  return (
    <CardContent>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-2">
        <CardHeader className="p-0">
          <CardTitle className="text-lg sm:text-xl flex items-center gap-2">
            <Truck className="h-4 w-4 sm:h-5 sm:w-5 text-primary" /> Delivery Requests
          </CardTitle>
        </CardHeader>
        <Button variant="outline" size="sm" onClick={() => refetch()} className="w-full sm:w-auto">
          <RefreshCcw className="h-4 w-4 mr-2" /> Refresh
        </Button>
      </div>
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : !data || data.length === 0 ? (
        <p className="text-sm text-muted-foreground">No delivery requests.</p>
      ) : (
        <div className="space-y-2">
          {data.map((r) => (
            <div key={r.id} className="p-3 border rounded text-sm flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="font-medium text-xs sm:text-sm">#{r.order_id?.slice(0,8)}</div>
                <div className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString()} • {r.status}</div>
              </div>
              <div className="text-xs text-muted-foreground">Partner: {r.assigned_partner_id ? r.assigned_partner_id.slice(0,8) : '-'}</div>
            </div>
          ))}
        </div>
      )}
    </CardContent>
  );
}

const StatsCard = ({ title, icon, queryKey }: { title: string; icon: React.ReactNode; queryKey: string }) => {
  const { data: count, isLoading } = useQuery({
    queryKey: [queryKey],
    queryFn: async () => {
      let result: { count: number | null; error: any } = { count: 0, error: null };
      
      switch (queryKey) {
        case 'admin-users-count':
          result = await supabase
            .from('profiles')
            .select('*', { count: 'exact', head: true });
          break;
        case 'admin-products-count':
          result = await supabase
            .from('products')
            .select('*', { count: 'exact', head: true });
          break;
        case 'admin-vendors-count':
          result = await supabase
            .from('vendors')
            .select('*', { count: 'exact', head: true });
          break;
        case 'admin-orders-count':
          result = await supabase
            .from('orders')
            .select('*', { count: 'exact', head: true });
          break;
        case 'admin-delivery-count':
          result = await supabase
            .from('delivery_partners')
            .select('*', { count: 'exact', head: true });
          break;
        default:
          return 0;
      }
      
      if (result.error) throw result.error;
      return result.count || 0;
    },
  });

  return (
    <Card>
      <CardContent className="p-3 sm:p-4 lg:p-6">
        <div className="flex items-center justify-between">
          <div className="min-w-0 flex-1">
            <p className="text-xs sm:text-sm font-medium text-muted-foreground truncate">{title}</p>
            <p className="text-lg sm:text-xl lg:text-2xl font-bold">
              {isLoading ? '-' : count?.toLocaleString() || 0}
            </p>
          </div>
          <div className="text-muted-foreground flex-shrink-0 ml-2">
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const VendorInviteForm = ({ invitedByUserId }: { invitedByUserId: string | null }) => {
  const queryClient = useQueryClient();
  const [email, setEmail] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [businessDescription, setBusinessDescription] = useState('');
  const [businessAddress, setBusinessAddress] = useState('');
  const [gstin, setGstin] = useState('');

  const inviteMutation = useMutation({
    mutationFn: async () => {
      if (!invitedByUserId) throw new Error('Missing inviter');
      const payload = {
        email: email.trim().toLowerCase(),
        business_name: businessName.trim(),
        business_description: businessDescription.trim() || null,
        business_address: businessAddress.trim() || null,
        gstin: gstin.trim() || null,
        invited_by: invitedByUserId,
      };
      const { error } = await (supabase as any).from('vendor_invitations').insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Vendor invitation created');
      setEmail('');
      setBusinessName('');
      setBusinessDescription('');
      setBusinessAddress('');
      setGstin('');
      queryClient.invalidateQueries({ queryKey: ['vendor-invitations'] });
    },
    onError: (err: any) => {
      toast.error(err?.message || 'Failed to create invitation');
    },
  });

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !businessName) {
      toast.error('Email and Business Name are required');
      return;
    }
    inviteMutation.mutate();
  };

  return (
    <CardContent>
      <CardHeader className="p-0 mb-4">
        <CardTitle className="text-lg sm:text-xl flex items-center gap-2">
          <Send className="h-4 w-4 sm:h-5 sm:w-5 text-primary" /> Invite Vendor
        </CardTitle>
      </CardHeader>
      <form className="space-y-3 sm:space-y-4" onSubmit={onSubmit}>
        <div className="space-y-2">
          <label className="text-xs sm:text-sm font-medium">Vendor Email</label>
          <Input type="email" placeholder="vendor@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required className="text-sm" />
        </div>
        <div className="space-y-2">
          <label className="text-xs sm:text-sm font-medium">Business Name</label>
          <Input placeholder="Acme Foods" value={businessName} onChange={(e) => setBusinessName(e.target.value)} required className="text-sm" />
        </div>
        <div className="space-y-2">
          <label className="text-xs sm:text-sm font-medium">Business Description</label>
          <Textarea placeholder="Short description" value={businessDescription} onChange={(e) => setBusinessDescription(e.target.value)} className="text-sm min-h-[60px]" />
        </div>
        <div className="space-y-2">
          <label className="text-xs sm:text-sm font-medium">Business Address</label>
          <Textarea placeholder="Full address" value={businessAddress} onChange={(e) => setBusinessAddress(e.target.value)} className="text-sm min-h-[60px]" />
        </div>
        <div className="space-y-2">
          <label className="text-xs sm:text-sm font-medium">GSTIN (optional)</label>
          <Input placeholder="22AAAAA0000A1Z5" value={gstin} onChange={(e) => setGstin(e.target.value)} className="text-sm" />
        </div>
        <div className="pt-2">
          <Button type="submit" disabled={inviteMutation.isPending} className="w-full sm:w-auto text-sm">
            {inviteMutation.isPending ? 'Sending…' : 'Send Invitation'}
          </Button>
        </div>
      </form>
    </CardContent>
  );
};
const DeliveryApplicationsList = () => {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['delivery-applications'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('delivery_applications')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Array<{ id: string; full_name: string; email: string; phone: string | null; vehicle_type: string | null; vehicle_number: string | null; status: string }>;
    },
  });

  return (
    <CardContent>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-2">
        <CardHeader className="p-0"><CardTitle className="text-lg sm:text-xl">Delivery Applications</CardTitle></CardHeader>
        <Button variant="outline" size="sm" onClick={() => refetch()} className="w-full sm:w-auto"><RefreshCcw className="h-4 w-4 mr-2" /> Refresh</Button>
      </div>
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : !data || data.length === 0 ? (
        <p className="text-sm text-muted-foreground">No applications</p>
      ) : (
        <div className="space-y-2">
          {data.map((a) => (
            <div key={a.id} className="p-3 border rounded">
              <div className="font-semibold text-sm sm:text-base">{a.full_name} <span className="text-xs text-muted-foreground">({a.email})</span></div>
              <div className="text-xs text-muted-foreground">Status: {a.status}</div>
            </div>
          ))}
        </div>
      )}
    </CardContent>
  );
};

const VendorsCrud = () => {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['admin-vendors-crud'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vendors')
        .select('id, business_name, business_description, business_address, gstin, is_active, is_approved, user_id')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });

  const queryClient = useQueryClient();
  const toggleActive: any = useMutation({
    mutationFn: async (v: any) => {
      const { error } = await supabase
        .from('vendors')
        .update({ is_active: !v.is_active })
        .eq('id', v.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-vendors-crud'] });
      toast.success('Vendor updated');
    },
  });

  const toggleApproved: any = useMutation({
    mutationFn: async (v: any) => {
      const { error } = await supabase
        .from('vendors')
        .update({ is_approved: !v.is_approved })
        .eq('id', v.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-vendors-crud'] });
      toast.success('Vendor approval toggled');
    },
  });

  const removeVendor: any = useMutation({
    mutationFn: async (v: any) => {
      const { error } = await supabase
        .from('vendors')
        .delete()
        .eq('id', v.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-vendors-crud'] });
      toast.success('Vendor deleted');
    },
  });

  return (
    <CardContent>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-2">
        <CardHeader className="p-0"><CardTitle className="text-lg sm:text-xl">Manage Vendors</CardTitle></CardHeader>
        <Button variant="outline" size="sm" onClick={() => refetch()} className="w-full sm:w-auto"><RefreshCcw className="h-4 w-4 mr-2" /> Refresh</Button>
      </div>
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : !data || data.length === 0 ? (
        <p className="text-sm text-muted-foreground">No vendors found</p>
      ) : (
        <div className="space-y-2">
          {data.map((v: any) => (
            <div key={v.id} className="p-3 sm:p-4 border rounded flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="font-semibold text-sm sm:text-base truncate">{v.business_name}</div>
                <div className="text-xs text-muted-foreground">Approved: {v.is_approved ? 'Yes' : 'No'} • Active: {v.is_active ? 'Yes' : 'No'}</div>
                {v.business_address ? <div className="text-xs text-muted-foreground truncate">{v.business_address}</div> : null}
              </div>
              <div className="flex flex-wrap items-center gap-1 sm:gap-2">
                <Button size="sm" variant="outline" onClick={() => toggleApproved.mutate(v)} className="text-xs">{v.is_approved ? 'Unapprove' : 'Approve'}</Button>
                <Button size="sm" variant="outline" onClick={() => toggleActive.mutate(v)} className="text-xs">{v.is_active ? 'Deactivate' : 'Activate'}</Button>
                <Button size="sm" variant="destructive" onClick={() => removeVendor.mutate(v)} className="text-xs">Delete</Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </CardContent>
  );
};

const DeliveryPartnersCrud = () => {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['admin-delivery-partners-crud'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('delivery_partners')
        .select('id, user_id, vehicle_type, vehicle_number, is_verified, is_active, profiles:profiles!inner(full_name, email)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });

  const queryClient = useQueryClient();
  const toggleActive: any = useMutation({
    mutationFn: async (p: any) => {
      const { error } = await supabase
        .from('delivery_partners')
        .update({ is_active: !p.is_active })
        .eq('id', p.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-delivery-partners-crud'] });
      toast.success('Delivery partner updated');
    },
  });

  const toggleVerified: any = useMutation({
    mutationFn: async (p: any) => {
      const { error } = await supabase
        .from('delivery_partners')
        .update({ is_verified: !p.is_verified })
        .eq('id', p.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-delivery-partners-crud'] });
      toast.success('Delivery partner verification toggled');
    },
  });

  const removePartner: any = useMutation({
    mutationFn: async (p: any) => {
      const { error } = await supabase
        .from('delivery_partners')
        .delete()
        .eq('id', p.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-delivery-partners-crud'] });
      toast.success('Delivery partner deleted');
    },
  });

  return (
    <CardContent>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-2">
        <CardHeader className="p-0"><CardTitle className="text-lg sm:text-xl">Manage Delivery Partners</CardTitle></CardHeader>
        <Button variant="outline" size="sm" onClick={() => refetch()} className="w-full sm:w-auto"><RefreshCcw className="h-4 w-4 mr-2" /> Refresh</Button>
      </div>
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : !data || data.length === 0 ? (
        <p className="text-sm text-muted-foreground">No delivery partners found</p>
      ) : (
        <div className="space-y-2">
          {data.map((p: any) => (
            <div key={p.id} className="p-3 sm:p-4 border rounded flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="font-semibold text-sm sm:text-base truncate">{p.profiles?.full_name || '-'} <span className="text-xs text-muted-foreground">({p.profiles?.email || '-'})</span></div>
                <div className="text-xs text-muted-foreground">Verified: {p.is_verified ? 'Yes' : 'No'} • Active: {p.is_active ? 'Yes' : 'No'}</div>
                <div className="text-xs text-muted-foreground">{p.vehicle_type || '-'} • {p.vehicle_number || '-'}</div>
              </div>
              <div className="flex flex-wrap items-center gap-1 sm:gap-2">
                <Button size="sm" variant="outline" onClick={() => toggleVerified.mutate(p)} className="text-xs">{p.is_verified ? 'Unverify' : 'Verify'}</Button>
                <Button size="sm" variant="outline" onClick={() => toggleActive.mutate(p)} className="text-xs">{p.is_active ? 'Deactivate' : 'Activate'}</Button>
                <Button size="sm" variant="destructive" onClick={() => removePartner.mutate(p)} className="text-xs">Delete</Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </CardContent>
  );
};

const DeliveryApplicationsActions = () => {
  const { data, refetch } = useQuery({
    queryKey: ['delivery-applications-pending'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('delivery_applications')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data as Array<{ id: string; full_name: string; email: string; phone: string | null; vehicle_type: string | null; vehicle_number: string | null; status: string }>;
    },
  });

  const queryClient = useQueryClient();
  const approve = useMutation({
    mutationFn: async (app: any) => {
      // Simple approach: just mark as approved
      // The handle_new_user trigger will handle linking when they sign up
      const { error: updErr } = await (supabase as any)
        .from('delivery_applications')
        .update({ status: 'approved' })
        .eq('id', app.id)
        .eq('status', 'pending');
      if (updErr) throw updErr;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['delivery-applications'] });
      queryClient.invalidateQueries({ queryKey: ['delivery-applications-pending'] });
      queryClient.invalidateQueries({ queryKey: ['admin-delivery-partners-crud'] });
      toast.success('Delivery application approved');
    },
    onError: (e: any) => toast.error(e?.message || 'Failed to approve'),
  });

  const reject: any = useMutation({
    mutationFn: async (app: any) => {
      const { error } = await (supabase as any)
        .from('delivery_applications')
        .update({ status: 'rejected' })
        .eq('id', app.id)
        .eq('status', 'pending');
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['delivery-applications'] });
      queryClient.invalidateQueries({ queryKey: ['delivery-applications-pending'] });
    },
  });

  return (
    <CardContent>
      <CardHeader className="p-0 mb-4"><CardTitle className="text-lg sm:text-xl">Pending Delivery Approvals</CardTitle></CardHeader>
      {!data || data.length === 0 ? (
        <p className="text-sm text-muted-foreground">No pending applications</p>
      ) : (
        <div className="space-y-2">
          {data.map((a) => (
            <div key={a.id} className="p-3 sm:p-4 border rounded flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="font-semibold text-sm sm:text-base">{a.full_name}</div>
                <div className="text-xs text-muted-foreground">{a.email} • {a.phone || '-'}</div>
                <div className="text-xs text-muted-foreground">{a.vehicle_type || '-'} • {a.vehicle_number || '-'}</div>
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" onClick={() => approve.mutate(a)} className="text-xs"><Check className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" /> Approve</Button>
                <Button size="sm" variant="destructive" onClick={() => reject.mutate(a)} className="text-xs">Reject</Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </CardContent>
  );
};


const VendorsList = () => {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['admin-vendors'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vendors')
        .select('id, business_name, is_active, is_approved, profiles:profiles!inner(full_name)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as any[]; 
    },
  });

  const [selectedVendorId, setSelectedVendorId] = useState<string | null>(null);

  useEffect(() => {
    // set first vendor as selected by default
    if (!selectedVendorId && data && data.length > 0) {
      setSelectedVendorId(data[0].id);
      localStorage.setItem('admin-selected-vendor', data[0].id);
    }
  }, [data, selectedVendorId]);

  useEffect(() => {
    const stored = localStorage.getItem('admin-selected-vendor');
    if (stored) setSelectedVendorId(stored);
  }, []);

  useEffect(() => {
    queryClient.invalidateQueries({ queryKey: ['admin-vendor-products', selectedVendorId] });
  }, [selectedVendorId, queryClient]);

  if (isLoading) return (
    <CardContent>
      <CardHeader className="p-0 mb-4"><CardTitle className="text-lg sm:text-xl">Vendors</CardTitle></CardHeader>
      <p className="text-sm text-muted-foreground">Loading…</p>
    </CardContent>
  );

  return (
    <CardContent>
      <CardHeader className="p-0 mb-4"><CardTitle className="text-lg sm:text-xl">Vendors</CardTitle></CardHeader>
      {!data || data.length === 0 ? (
        <p className="text-sm text-muted-foreground">No vendors found.</p>
      ) : (
        <div className="space-y-2">
          {data.map((v) => (
            <button
              key={v.id}
              className={`w-full text-left p-2 sm:p-3 rounded border ${selectedVendorId === v.id ? 'border-primary bg-primary/5' : 'border-muted hover:border-primary/50'}`}
              onClick={() => {
                setSelectedVendorId(v.id);
                localStorage.setItem('admin-selected-vendor', v.id);
              }}
            >
              <div className="font-semibold text-sm sm:text-base">{v.business_name}</div>
              <div className="text-xs text-muted-foreground">Owner: {v.profiles?.full_name || '-'}</div>
            </button>
          ))}
        </div>
      )}
    </CardContent>
  );
};

const VendorProductsApproval = () => {
  const [vendorId, setVendorId] = useState<string | null>(null);

  useEffect(() => {
    setVendorId(localStorage.getItem('admin-selected-vendor'));
  }, []);

  const { data: products, isLoading, refetch } = useQuery({
    queryKey: ['admin-vendor-products', vendorId],
    enabled: !!vendorId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('id, name, price, stock, unit, image_url, is_approved')
        .eq('vendor_id', vendorId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Array<{ id: string; name: string; price: number; stock: number; unit: string | null; image_url: string | null; is_approved: boolean | null }>;
    },
  });

  const queryClient = useQueryClient();
  const approveMutation: any = (useMutation as any)({
    mutationFn: async (productId: string) => {
      const { error } = await supabase
        .from('products')
        .update({ is_approved: true })
        .eq('id', productId);
      if (error) throw error;
      return { ok: true } as const;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-vendor-products', vendorId] });
      toast.success('Product approved');
    },
    onError: (err: any) => toast.error(err?.message || 'Failed to approve'),
  });

  return (
    <CardContent>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-2">
        <CardHeader className="p-0">
          <CardTitle className="text-lg sm:text-xl flex items-center gap-2"><Eye className="h-4 w-4 sm:h-5 sm:w-5 text-primary" /> Vendor Products</CardTitle>
        </CardHeader>
        <Button variant="outline" size="sm" onClick={() => refetch()} className="w-full sm:w-auto">
          <RefreshCcw className="h-4 w-4 mr-2" /> Refresh
        </Button>
      </div>

      {!vendorId ? (
        <p className="text-sm text-muted-foreground">Select a vendor to view products.</p>
      ) : isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : !products || products.length === 0 ? (
        <p className="text-sm text-muted-foreground">No products found for this vendor.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          {products.map((p) => (
            <div key={p.id} className="p-3 sm:p-4 border rounded-md flex gap-3 items-center">
              <div className="w-12 h-12 sm:w-16 sm:h-16 bg-muted rounded overflow-hidden flex items-center justify-center flex-shrink-0">
                {p.image_url ? (
                  <img src={p.image_url} alt={p.name} className="object-cover w-full h-full" />
                ) : (
                  <Package className="h-4 w-4 sm:h-6 sm:w-6 text-muted-foreground" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm sm:text-base truncate">{p.name}</div>
                <div className="text-xs sm:text-sm text-muted-foreground">₹{p.price} • Stock {p.stock}{p.unit ? ` ${p.unit}` : ''}</div>
              </div>
              {p.is_approved ? (
                <span className="text-xs text-green-600 flex-shrink-0">Approved</span>
              ) : (
                <Button size="sm" onClick={() => approveMutation.mutate(p.id)} disabled={approveMutation.isPending} className="text-xs flex-shrink-0">
                  <Check className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" /> Approve
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </CardContent>
  );
};

const VendorInvitationsList = () => {
  const queryClient = useQueryClient();
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['vendor-invitations'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('vendor_invitations')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data as any[]) as Array<{
        id: string;
        email: string;
        business_name: string;
        business_description: string | null;
        business_address: string | null;
        gstin: string | null;
        status: 'pending' | 'linked' | 'revoked';
        created_at: string | null;
        accepted_at: string | null;
      }>;
    },
  });

  const revokeMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from('vendor_invitations')
        .update({ status: 'revoked' })
        .eq('id', id)
        .eq('status', 'pending');
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Invitation revoked');
      queryClient.invalidateQueries({ queryKey: ['vendor-invitations'] });
    },
    onError: (err: any) => toast.error(err?.message || 'Failed to revoke'),
  });

  const approveMutation: any = useMutation({
    // Approve invitation by creating vendor/user role if user exists
    mutationFn: async (inv: any) => {
      const normalizedEmail = inv.email.trim().toLowerCase();

      // 1) Find existing profile by email
      const { data: profiles, error: profErr } = await (supabase as any)
        .from('profiles')
        .select('*')
        .eq('email', normalizedEmail)
        .limit(1);
      if (profErr) throw profErr;

      if (!profiles || profiles.length === 0) {
        // No user yet — inform admin to have vendor sign up
        throw new Error('No user found with this email. Ask the vendor to sign up first. Auto-link will complete on signup.');
      }
      const profile = profiles[0];

      // 2) Create vendor (id generated) if not exists for this user
      const { data: existingVendor, error: vendorCheckErr } = await supabase
        .from('vendors')
        .select('id')
        .eq('user_id', profile.id)
        .limit(1);
      if (vendorCheckErr) throw vendorCheckErr;

      if (!existingVendor || existingVendor.length === 0) {
        const { error: vendorErr } = await supabase.from('vendors').insert({
          user_id: profile.id,
          business_name: inv.business_name,
          business_description: inv.business_description,
          business_address: inv.business_address,
          gstin: inv.gstin || undefined,
          is_approved: true,
          is_active: true,
        });
        if (vendorErr) throw vendorErr;
      }

      // 3) Grant vendor role if not already
      const { data: roles, error: rolesErr } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', profile.id);
      if (rolesErr) throw rolesErr;
      const hasVendorRole = (roles || []).some((r) => r.role === 'vendor');
      if (!hasVendorRole) {
        const { error: roleErr } = await supabase
          .from('user_roles')
          .insert({ user_id: profile.id, role: 'vendor' as any });
        if (roleErr) throw roleErr;
      }

      // 4) Mark invitation as linked
      const { error: linkErr } = await (supabase as any)
        .from('vendor_invitations')
        .update({ status: 'linked', linked_user_id: profile.id, accepted_at: new Date().toISOString() })
        .eq('id', inv.id)
        .eq('status', 'pending');
      if (linkErr) throw linkErr;
    },
    onSuccess: () => {
      toast.success('Vendor approved successfully');
      queryClient.invalidateQueries({ queryKey: ['vendor-invitations'] });
    },
    onError: (err: any) => {
      toast.error(err?.message || 'Failed to approve vendor');
    },
  });

  return (
    <CardContent>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-2">
        <CardHeader className="p-0">
          <CardTitle className="text-lg sm:text-xl">Vendor Invitations</CardTitle>
        </CardHeader>
        <Button variant="outline" size="sm" onClick={() => refetch()} className="w-full sm:w-auto">
          <RefreshCcw className="h-4 w-4 mr-2" /> Refresh
        </Button>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : !data || data.length === 0 ? (
        <p className="text-sm text-muted-foreground">No invitations yet.</p>
      ) : (
        <div className="space-y-3">
          {data.map((inv) => (
            <div key={inv.id} className="p-3 sm:p-4 border rounded-md flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm sm:text-base">{inv.business_name}</div>
                <div className="text-xs sm:text-sm text-muted-foreground">{inv.email}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  Status: <span className="uppercase">{inv.status}</span>
                  {inv.accepted_at ? ` • Accepted: ${new Date(inv.accepted_at).toLocaleString()}` : ''}
                </div>
              </div>
              {inv.status === 'pending' && (
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Button
                    size="sm"
                    onClick={() => approveMutation.mutate(inv)}
                    disabled={approveMutation.isPending}
                    className="text-xs"
                  >
                    <Check className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" /> Approve
                  </Button>
                  <Button variant="destructive" size="sm" onClick={() => revokeMutation.mutate(inv.id)} className="text-xs">
                    <Ban className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" /> Revoke
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </CardContent>
  );
};
