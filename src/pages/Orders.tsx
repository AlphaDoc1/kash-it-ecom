import { useNavigate, Navigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { Navbar } from '@/components/Navbar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MapPin } from 'lucide-react';
import LiveMap from '@/components/LiveMap';
import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Package } from 'lucide-react';
import { toast } from 'sonner';
import { STATUS_LABEL, STATUS_COLOR_CLASS, ORDER_STATUSES } from '@/lib/orderStatus';

class OrdersErrorBoundary extends (class extends (Object as any){} as any) {}

// Lightweight ErrorBoundary to avoid blank screen on unexpected render errors
class ErrorBoundary extends React.Component<{ children: any }, { hasError: boolean; message?: string }> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, message: undefined };
  }
  static getDerivedStateFromError(error: any) {
    return { hasError: true, message: error?.message || 'Something went wrong' };
  }
  componentDidCatch(error: any) {
    console.error('Orders page error:', error);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-sm text-destructive">{this.state.message}</div>
        </div>
      );
    }
    return this.props.children;
  }
}

const Orders = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  const queryClient = useQueryClient();
  const [hiddenOrderIds, setHiddenOrderIds] = useState<string[]>([]);

  const isAuthLoading = loading;
  // ensure not re-declared

  const { data: orders, isLoading } = useQuery({
    queryKey: ['orders', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      // Get basic orders first to avoid RLS recursion
      const { data: basicOrders, error: basicError } = await supabase
        .from('orders')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      if (basicError) throw basicError;
      if (!basicOrders) return [];
      
      // Get order items for these orders
      const orderIds = basicOrders.map(o => o.id);
      const { data: orderItems, error: itemsError } = await supabase
        .from('order_items')
        .select('*, products(name)')
        .in('order_id', orderIds);
      
      if (itemsError) {
        console.error('Error fetching order items:', itemsError);
      }
      
      // Get delivery requests for these orders (using any type to avoid type issues)
      const { data: deliveryRequests, error: drError } = await (supabase as any)
        .from('delivery_requests')
        .select('order_id, status')
        .in('order_id', orderIds);
      
      if (drError) {
        console.error('Error fetching delivery requests:', drError);
      }
      
      // Combine the data
      const enrichedOrders = basicOrders.map(order => {
        const orderOrderItems = orderItems?.filter((item: any) => item.order_id === order.id) || [];
        const deliveryRequest = deliveryRequests?.find((dr: any) => dr.order_id === order.id);
        
        return {
          ...order,
          order_items: orderOrderItems,
          delivery_requests: deliveryRequest ? { status: deliveryRequest.status } : null
        };
      });
      
      if (enrichedOrders) {
        console.log('Order statuses (live):', enrichedOrders.map(o => ({id: o.id, status: o.delivery_status})));
      }
      return enrichedOrders;
    },
    enabled: !!user && !isAuthLoading,
    // Fallback polling in case realtime events are missed or disabled on the table
    refetchInterval: 5000,
  });

  useEffect(() => {
    if (!user || isAuthLoading) return;
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
  }, [user, isAuthLoading, queryClient]);

  const allowed = ['delivered','cancelled'];

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

  const steps = ORDER_STATUSES;

  const [view, setView] = useState<'live' | 'history'>('live');
  const getEffectiveStatus = (o: any) => {
    const dr = (o as any).delivery_requests;
    const drStatus = Array.isArray(dr) ? dr[0]?.status : dr?.status;
    return drStatus || o.delivery_status || 'pending';
  };

  const splitOrders = (list: any[]) => {
    const live: any[] = [];
    const history: any[] = [];
    for (const o of list || []) {
      const s = getEffectiveStatus(o);
      const isDeleted = ['deleted','user_deleted'].includes(s);
      if (isDeleted) continue;
      if (['delivered','cancelled'].includes(s)) history.push(o);
      else live.push(o);
    }
    return { live, history };
  };
  const { live: liveOrders, history: historyOrders } = splitOrders(orders || []);
  const filteredOrders = view === 'live' ? liveOrders : historyOrders;

  if (isAuthLoading) {
    return <div className="min-h-screen flex items-center justify-center"><span className="text-sm text-muted-foreground">Loading…</span></div>;
  }
  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-background">
        <Navbar />
        
        <div className="container mx-auto px-2 sm:px-4 py-4 sm:py-6 md:py-8">
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4 sm:mb-6">My Orders</h1>
        <div className="mb-4 sm:mb-6 flex flex-col sm:flex-row gap-2">
          <Button 
            size="sm" 
            variant={view === 'live' ? 'default' : 'outline'} 
            onClick={() => setView('live')}
            className="w-full sm:w-auto"
          >
            Live Orders
          </Button>
          <Button 
            size="sm" 
            variant={view === 'history' ? 'default' : 'outline'} 
            onClick={() => setView('history')}
            className="w-full sm:w-auto"
          >
            Order History
          </Button>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <div className="h-32 bg-muted" />
              </Card>
            ))}
          </div>
        ) : !filteredOrders || filteredOrders.length === 0 ? (
          <div className="text-center py-8 sm:py-12">
            <Package className="h-12 w-12 sm:h-16 sm:w-16 text-muted-foreground mx-auto mb-3 sm:mb-4" />
            <h2 className="text-xl sm:text-2xl font-bold mb-2">No orders yet</h2>
            <p className="text-sm sm:text-base text-muted-foreground">Start shopping to see your orders here!</p>
          </div>
        ) : (
          <div className="space-y-3 sm:space-y-4">
            {filteredOrders.filter((order) => !hiddenOrderIds.includes(order.id)).map((order) => {
              const effectiveStatus = getEffectiveStatus(order);
              return (
              <Card key={order.id}>
                <CardHeader className="pb-3">
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2">
                    <div>
                      <CardTitle className="text-base sm:text-lg">Order #{order.id.slice(0, 8)}</CardTitle>
                      <p className="text-xs sm:text-sm text-muted-foreground">
                        {new Date(order.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <Badge className={`text-xs sm:text-sm ${STATUS_COLOR_CLASS[(effectiveStatus || 'pending') as any] || 'bg-gray-500'}`}>
                      {STATUS_LABEL[(effectiveStatus || 'pending') as any] || effectiveStatus}
                    </Badge>
                  </div>
                </CardHeader>
                 <CardContent className="pt-0">
                  <UserOrderTracking orderId={order.id} />
                  <StatusTimeline status={(effectiveStatus || 'pending') as string} />
                  <div className="space-y-2 mb-3 sm:mb-4">
                    {order.order_items?.map((item) => (
                      <div key={item.id} className="flex justify-between text-xs sm:text-sm">
                        <div className="flex flex-col min-w-0 flex-1">
                          <span className="font-medium break-words">{item.products?.name} x {item.quantity}</span>
                          {item.products?.vendors?.business_name && (
                            <span className="text-xs text-muted-foreground">Vendor: {item.products.vendors.business_name}</span>
                          )}
                        </div>
                        <span className="font-semibold whitespace-nowrap ml-2">₹{(item.snapshot_price * item.quantity).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                  <div className="border-t pt-2 flex justify-between font-bold text-sm sm:text-base">
                    <span>Total</span>
                    <span className="text-primary">₹{order.final_amount}</span>
                  </div>
                  {view === 'history' && (
                    <div className="pt-3 flex justify-end">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => deleteOrder.mutate(order.id)} 
                        disabled={deleteOrder.isPending}
                        className="w-full sm:w-auto"
                      >
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
    </ErrorBoundary>
  );
};

export default Orders;

const StatusTimeline = ({ status }: { status: any }) => {
  const steps = ORDER_STATUSES;
  const currentIndex = Math.max(0, steps.indexOf((status || 'pending').toLowerCase()));
  return (
    <div className="flex items-center gap-1 sm:gap-2 mb-3 text-xs overflow-x-auto">
      {steps.map((s, i) => (
        <div key={s} className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
          <span className={`px-1.5 sm:px-2 py-1 rounded text-xs ${i <= currentIndex ? 'bg-primary text-white' : 'bg-muted text-muted-foreground'}`}>
            {STATUS_LABEL[(s as any)] || s}
          </span>
          {i < steps.length - 1 ? <span className="text-muted-foreground text-xs">›</span> : null}
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
      const { data, error } = await (supabase as any)
        .from('delivery_tracking')
        .select('latitude, longitude')
        .eq('order_id', orderId)
        .order('recorded_at', { ascending: false })
        .limit(1);
      if (error) throw error;
      return (data as any[]) as Array<{ latitude: number; longitude: number }>;
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
