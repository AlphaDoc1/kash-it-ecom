import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { Navbar } from '@/components/Navbar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MapPin } from 'lucide-react';
import LiveMap from '@/components/LiveMap';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Package } from 'lucide-react';
import { toast } from 'sonner';
import { STATUS_LABEL, STATUS_COLOR_CLASS, ORDER_STATUSES } from '@/lib/orderStatus';

const Orders = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const queryClient = useQueryClient();
  const [hiddenOrderIds, setHiddenOrderIds] = useState<string[]>([]);

  const { data: orders, isLoading } = useQuery({
    queryKey: ['orders', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('orders')
        .select('*, order_items(*, products(name, vendors(business_name))), delivery_requests(status)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      if (data) {
        console.log('Order statuses (live):', data.map(o => ({id: o.id, status: o.delivery_status})));
      }
      return data;
    },
    enabled: !!user,
    // Fallback polling in case realtime events are missed or disabled on the table
    refetchInterval: 5000,
  });

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`orders-user-${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders', filter: `user_id=eq.${user.id}` }, () => {
        queryClient.invalidateQueries({ queryKey: ['orders', user.id] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'delivery_requests' }, () => {
        queryClient.invalidateQueries({ queryKey: ['orders', user.id] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, queryClient]);

  const allowed = ['delivered','cancelled','rejected_by_vendor'];

  const deleteOrder = useMutation({
    mutationFn: async (orderId: string) => {
      const { error } = await supabase
        .from('orders')
        .delete()
        .eq('id', orderId)
        .eq('user_id', user!.id);
      if (error) throw error;
    },
    onSuccess: (_, orderId) => {
      setHiddenOrderIds((prev) => [...prev, orderId as string]);
      toast.success('Order deleted successfully.');
      queryClient.invalidateQueries({ queryKey: ['orders', user?.id] });
    },
    onError: (e: any) => {
      toast.error(e?.message || 'Failed to delete order');
    },
  });

  if (!user) {
    navigate('/auth');
    return null;
  }

  const steps = ORDER_STATUSES;

  // Hide user-deleted or vendor-deleted orders by default
  const filteredOrders = (orders || []).filter((order: any) => {
    // Only hide hard deletes (or future user_deleted), not rejected_by_vendor
    const status = order.delivery_status;
    return !['deleted','user_deleted'].includes(status);
  });

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold mb-8">My Orders</h1>

        {isLoading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <div className="h-32 bg-muted" />
              </Card>
            ))}
          </div>
        ) : !filteredOrders || filteredOrders.length === 0 ? (
          <div className="text-center py-12">
            <Package className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">No orders yet</h2>
            <p className="text-muted-foreground">Start shopping to see your orders here!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredOrders.filter((order) => !hiddenOrderIds.includes(order.id)).map((order) => {
              const effectiveStatus = (order as any).delivery_requests?.status || order.delivery_status;
              return (
              <Card key={order.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">Order #{order.id.slice(0, 8)}</CardTitle>
                      <p className="text-sm text-muted-foreground">
                        {new Date(order.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <Badge className={STATUS_COLOR_CLASS[(effectiveStatus || 'pending') as any] || 'bg-gray-500'}>
                      {STATUS_LABEL[(effectiveStatus || 'pending') as any] || effectiveStatus}
                    </Badge>
                  </div>
                </CardHeader>
                 <CardContent>
                  <UserOrderTracking orderId={order.id} />
                  <StatusTimeline status={effectiveStatus} />
                  <div className="space-y-2 mb-4">
                    {order.order_items?.map((item) => (
                      <div key={item.id} className="flex justify-between text-sm">
                        <div className="flex flex-col">
                          <span className="font-medium">{item.products?.name} x {item.quantity}</span>
                          {item.products?.vendors?.business_name && (
                            <span className="text-xs text-muted-foreground">Vendor: {item.products.vendors.business_name}</span>
                          )}
                        </div>
                        <span className="font-semibold">₹{(item.snapshot_price * item.quantity).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                  <div className="border-t pt-2 flex justify-between font-bold">
                    <span>Total</span>
                    <span className="text-primary">₹{order.final_amount}</span>
                  </div>
                  {(effectiveStatus === 'delivered' || effectiveStatus === 'rejected_by_vendor' || effectiveStatus === 'cancelled') && (
                    <div className="pt-3 flex justify-end">
                      <Button variant="outline" size="sm" onClick={() => deleteOrder.mutate(order.id)} disabled={deleteOrder.isPending}>
                        Delete Order
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default Orders;

const StatusTimeline = ({ status }: { status: string }) => {
  const steps = ORDER_STATUSES;
  const currentIndex = Math.max(0, steps.indexOf((status || 'pending').toLowerCase()));
  return (
    <div className="flex items-center gap-2 mb-3 text-xs">
      {steps.map((s, i) => (
        <div key={s} className="flex items-center gap-2">
          <span className={`px-2 py-1 rounded ${i <= currentIndex ? 'bg-primary text-white' : 'bg-muted text-muted-foreground'}`}>{STATUS_LABEL[(s as any)] || s}</span>
          {i < steps.length - 1 ? <span className="text-muted-foreground">›</span> : null}
        </div>
      ))}
    </div>
  );
}

const UserOrderTracking = ({ orderId }: { orderId: string }) => {
  const [positions, setPositions] = useState<Array<{ latitude: number; longitude: number }>>([]);
  const { data } = useQuery({
    queryKey: ['delivery-tracking', orderId],
    refetchInterval: 5000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('delivery_tracking')
        .select('latitude, longitude')
        .eq('order_id', orderId)
        .order('recorded_at', { ascending: false })
        .limit(1);
      if (error) throw error;
      return data as Array<{ latitude: number; longitude: number }>;
    }
  });

  useEffect(() => {
    if (data && data.length > 0) setPositions(data);
  }, [data]);

  const partner = positions[0]
    ? { lat: positions[0].latitude, lon: positions[0].longitude }
    : undefined;

  if (!partner) return null;
  return (
    <div className="mb-3">
      <div className="flex items-center gap-2 text-sm mb-2 text-muted-foreground"><MapPin className="h-4 w-4" /> Live location</div>
      <LiveMap partner={partner} height={180} />
    </div>
  );
}
