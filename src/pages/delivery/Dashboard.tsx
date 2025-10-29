import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import Auth from '@/pages/Auth';
import { Navbar } from '@/components/Navbar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Truck, Package, Check, X, MapPin, Phone } from 'lucide-react';
import { toast } from 'sonner';
import { buildMapsDirectionUrl, getCurrentPosition, openGoogleMaps, startPositionWatch } from '@/lib/utils';
import { STATUS_LABEL } from '@/lib/orderStatus';

const DeliveryDashboard = () => {
  const { user, userRoles, loading } = useAuth();
  const navigate = useNavigate();

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><span className="text-sm text-muted-foreground">Loading…</span></div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold mb-8">Delivery Dashboard</h1>

        {!user ? (
          <div className="max-w-xl">
            <Auth />
          </div>
        ) : !userRoles.includes('delivery') ? (
          <div className="max-w-xl p-6 border rounded-md">
            <p className="text-sm text-muted-foreground mb-4">Your account does not have the delivery partner role.</p>
            <div className="flex gap-2">
              <a href="/delivery/register" className="px-3 py-2 border rounded text-sm">Apply as Delivery Partner</a>
              <a href="/" className="px-3 py-2 border rounded text-sm">Go Home</a>
            </div>
          </div>
        ) : (
          <>
            <DeliveryPartnerLocationCard />
            <div className="h-4" />
            <AssignedRequests />
          </>
        )}
      </div>
    </div>
  );
};

export default DeliveryDashboard;

const DeliveryPartnerLocationCard = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: partner, isLoading } = useQuery({
    queryKey: ['delivery-partner-location', user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('delivery_partners')
        .select('id, latitude, longitude')
        .eq('user_id', user!.id)
        .maybeSingle();
      if (error) throw error;
      return data as { id: string; latitude: number | null; longitude: number | null } | null;
    },
  });

  const setLocation = useMutation({
    mutationFn: async () => {
      if (!partner?.id) throw new Error('Partner profile not found');
      const pos = await getCurrentPosition();
      if (!pos) throw new Error('Unable to get current location');
      
      // Update delivery partner location
      const { error } = await supabase
        .from('delivery_partners')
        .update({ latitude: pos.lat, longitude: pos.lon })
        .eq('id', partner.id);
      if (error) throw error;

      // Also update tracking for any active deliveries
      const { data: activeDeliveries } = await supabase
        .from('delivery_requests')
        .select('order_id')
        .eq('assigned_partner_id', partner.id)
        .in('status', ['accepted', 'picked_up', 'out_for_delivery']);

      if (activeDeliveries && activeDeliveries.length > 0) {
        const trackingInserts = activeDeliveries.map(delivery => ({
          order_id: delivery.order_id,
          partner_id: partner.id,
          latitude: pos.lat,
          longitude: pos.lon,
        }));

        const { error: trackingError } = await supabase
          .from('delivery_tracking')
          .insert(trackingInserts);
        
        if (trackingError) {
          console.warn('Failed to update tracking:', trackingError);
        }
      }
    },
    onSuccess: () => {
      toast.success('Location updated');
      queryClient.invalidateQueries({ queryKey: ['delivery-partner-location', user?.id] });
      // Also invalidate order details queries to update maps
      queryClient.invalidateQueries({ queryKey: ['order-details'] });
      queryClient.invalidateQueries({ queryKey: ['delivery-tracking'] });
    },
    onError: (e: any) => toast.error(e?.message || 'Failed to set location'),
  });

  return (
    <div className="p-4 border rounded-md">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MapPin className="h-5 w-5 text-primary" />
          <div className="font-medium">My Current Location</div>
        </div>
        <Button size="sm" onClick={() => setLocation.mutate()} disabled={setLocation.isPending || isLoading || !partner?.id}>
          Use Current Location
        </Button>
      </div>
      <div className="mt-2 text-sm text-muted-foreground">
        {isLoading ? 'Loading…' : partner ? (
          partner.latitude != null && partner.longitude != null
            ? <>Lat: {partner.latitude} • Lon: {partner.longitude}</>
            : <>Not set</>
        ) : 'No partner profile found'}
      </div>
    </div>
  );
};

const AssignedRequests = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [hiddenRequestIds, setHiddenRequestIds] = useState<string[]>([] as string[]);
  const HIDDEN_STORAGE_KEY = 'hiddenDeliveryRequestIds';
  const [view, setView] = useState<'live' | 'history'>('live');

  // Load hidden list from localStorage so removed items stay hidden after refresh
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(HIDDEN_STORAGE_KEY) || '[]');
      if (Array.isArray(saved)) setHiddenRequestIds(saved);
    } catch {}
  }, []);

  const persistHidden = (next: string[]) => {
    setHiddenRequestIds(next);
    try { localStorage.setItem(HIDDEN_STORAGE_KEY, JSON.stringify(next)); } catch {}
  };

  const { data: partner } = useQuery({
    queryKey: ['delivery-partner', user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('delivery_partners')
        .select('id')
        .eq('user_id', user!.id)
        .maybeSingle();
      if (error) throw error;
      return data as { id: string } | null;
    },
  });

  const { data: requests, isLoading, refetch } = useQuery({
    queryKey: ['delivery-requests', partner?.id],
    enabled: !!partner?.id,
    queryFn: async () => {
      // Minimal working selection to avoid RLS/join issues
      const { data, error } = await supabase
        .from('delivery_requests')
        .select(`*`)
        .eq('assigned_partner_id', partner!.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      let rows = (data || []) as any[];
      
      // Get order visibility for this delivery partner to filter out hidden orders
      // Temporarily skip visibility filtering to ensure assigned orders show
      return rows as any[];
    },
  });

  // After acceptance, fetch order items so the partner sees item list
  const [orderItemsByOrderId, setOrderItemsByOrderId] = useState<Record<string, Array<{ id: string; quantity: number; snapshot_name: string; snapshot_price: number }>>>({});
  const [userByOrderId, setUserByOrderId] = useState<Record<string, { full_name?: string | null; phone?: string | null }>>({});
  const [addressByOrderId, setAddressByOrderId] = useState<Record<string, { full_address?: string | null; city?: string | null; state?: string | null; pincode?: string | null; phone?: string | null }>>({});
  const [vendorById, setVendorById] = useState<Record<string, { business_name?: string | null; business_address?: string | null }>>({});
  const [orderAmountById, setOrderAmountById] = useState<Record<string, { final_amount?: number | null; subtotal?: number | null; payment_status?: string | null; is_order_for_someone_else?: boolean | null }>>({});
  useEffect(() => {
    const loadItems = async (orderId: string) => {
      const { data: items } = await supabase
        .from('order_items')
        .select('id, quantity, snapshot_name, snapshot_price')
        .eq('order_id', orderId);
      setOrderItemsByOrderId(prev => ({ ...prev, [orderId]: items || [] }));
    };
    const loadUserAndAddress = async (orderId: string) => {
      try {
        // Use secure RPC so RLS allows fetching details for assigned partner
        const { data: details, error } = await (supabase as any)
          .rpc('get_delivery_order_details', { p_order_id: orderId, p_partner_user_id: user!.id });
        if (error) {
          console.error('RPC get_delivery_order_details error:', error);
          return;
        }
        // RPC returns a single row (object), not array
        const row = Array.isArray(details) ? details[0] : details;
        if (row) {
          console.log('Loaded user details for order:', orderId, row);
          setUserByOrderId(prev => ({ ...prev, [orderId]: { full_name: row.full_name, phone: row.phone } }));
          setAddressByOrderId(prev => ({
            ...prev,
            [orderId]: {
              ...(prev[orderId] || {}),
              full_address: row.full_address,
              city: row.city,
              state: row.state,
              pincode: row.pincode,
              phone: row.phone,
              latitude: row.latitude != null ? row.latitude : (prev[orderId]?.latitude ?? null),
              longitude: row.longitude != null ? row.longitude : (prev[orderId]?.longitude ?? null),
            },
          }));
          setOrderAmountById(prev => ({ ...prev, [orderId]: {
            final_amount: row.final_amount,
            subtotal: row.subtotal,
            payment_status: row.payment_status,
            is_order_for_someone_else: row.is_order_for_someone_else ?? false,
          }}));
          // Override with alternate drop coordinates if present on the order
          try {
            const { data: orderAlt } = await supabase
              .from('orders')
              .select('is_order_for_someone_else, alt_drop_latitude, alt_drop_longitude')
              .eq('id', orderId)
              .maybeSingle();
            if (orderAlt?.alt_drop_latitude != null && orderAlt?.alt_drop_longitude != null) {
              setAddressByOrderId(prev => ({
                ...prev,
                [orderId]: {
                  ...(prev[orderId] || {}),
                  latitude: Number(orderAlt.alt_drop_latitude),
                  longitude: Number(orderAlt.alt_drop_longitude),
                },
              }));
              setOrderAmountById(prev => ({ ...prev, [orderId]: {
                ...(prev[orderId] || {}),
                is_order_for_someone_else: !!orderAlt.is_order_for_someone_else,
              }}));
            }
          } catch (e) {
            console.warn('Failed to load alt drop coords:', e);
          }
        } else {
          console.warn('No details returned from RPC for order:', orderId);
        }
      } catch (e) {
        console.error('Error loading user and address:', e);
      }
    };
    const loadVendor = async (vendorId: string) => {
      if (!vendorId || vendorById[vendorId]) return;
      const { data } = await supabase
        .from('vendors')
        .select('business_name, business_address')
        .eq('id', vendorId)
        .maybeSingle();
      if (data) setVendorById(prev => ({ ...prev, [vendorId]: data }));
    };
    const loadOrderAmount = async (orderId: string) => {
      if (!orderId || orderAmountById[orderId]) return;
      const { data } = await supabase
        .from('orders')
        .select('final_amount, subtotal, payment_status, is_order_for_someone_else')
        .eq('id', orderId)
        .maybeSingle();
      if (data) setOrderAmountById(prev => ({ ...prev, [orderId]: data }));
    };
    (requests || []).forEach((r: any) => {
      const status = r.orders?.delivery_status || r.status;
      // Load vendor and order amount for all visible rows (assigned and beyond)
      if (r.vendor_id) loadVendor(r.vendor_id);
      if (r.order_id) loadOrderAmount(r.order_id);

      if ((status === 'assigned' || status === 'accepted' || status === 'picked_up' || status === 'out_for_delivery' || status === 'delivered') && r.order_id && !orderItemsByOrderId[r.order_id]) {
        loadItems(r.order_id);
      }
      // Load user details for any active status - reload if phone/name missing
      if ((status === 'assigned' || status === 'accepted' || status === 'picked_up' || status === 'out_for_delivery' || status === 'delivered') && r.order_id) {
        const hasUser = userByOrderId[r.order_id]?.full_name || userByOrderId[r.order_id]?.phone;
        const hasAddress = addressByOrderId[r.order_id]?.phone;
        if (!hasUser || !hasAddress) {
          loadUserAndAddress(r.order_id);
        }
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requests]);

  // Optimistic cache helpers for delivery requests
  const optimisticallyUpdateRequest = async (
    requestId: string,
    updater: (prev: any[]) => any[]
  ) => {
    await queryClient.cancelQueries({ queryKey: ['delivery-requests', partner?.id] });
    const prev = queryClient.getQueryData<any[]>(['delivery-requests', partner?.id]) || [];
    const next = updater(prev);
    queryClient.setQueryData(['delivery-requests', partner?.id], next);
    return { prev } as { prev: any[] };
  };

  const invalidateAllOrderConsumers = () => {
    // Invalidate user Orders page and vendor dashboards that may display the same order
    queryClient.invalidateQueries({ predicate: (q) => Array.isArray(q.queryKey) && q.queryKey[0] === 'orders' });
    queryClient.invalidateQueries({ predicate: (q) => Array.isArray(q.queryKey) && q.queryKey[0] === 'vendor-orders' });
  };

  useEffect(() => {
    if (!partner?.id) return;
    const channel = supabase
      .channel(`delivery-partner-${partner.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'delivery_requests', filter: `assigned_partner_id=eq.${partner.id}` }, () => {
        queryClient.invalidateQueries({ queryKey: ['delivery-requests', partner.id] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        queryClient.invalidateQueries({ queryKey: ['delivery-requests', partner.id] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [partner?.id, queryClient]);
  const removeFromDashboard = async (requestId: string) => {
    try {
      // Get the order_id from the delivery request
      const { data: request, error: fetchError } = await supabase
        .from('delivery_requests')
        .select('order_id')
        .eq('id', requestId)
        .single();
      
      if (fetchError) throw fetchError;
      
      // Hide order from delivery partner's history using RPC
      const { error } = await (supabase as any).rpc('delivery_delete_order', { 
        p_order_id: request.order_id 
      });
      
      if (error) throw error;
      toast.success('Order removed from your history');
    } catch (e: any) {
      // Fallback: hide locally so dashboard is cleaned
      toast('Removed locally');
    } finally {
      const next = Array.from(new Set([...(hiddenRequestIds || []), requestId]));
      persistHidden(next);
      refetch();
    }
  };

  const respond = useMutation({
    mutationFn: async ({ requestId, action }: { requestId: string; action: 'accepted' | 'rejected' }) => {
      const { error: insErr } = await (supabase as any)
        .from('delivery_partner_responses')
        .insert({ request_id: requestId, partner_id: partner!.id, action });
      if (insErr) throw insErr;

      const newStatus = action === 'accepted' ? 'accepted' : 'rejected_by_partner';
      const { error: updErr } = await supabase
        .from('delivery_requests')
        .update({ status: newStatus })
        .eq('id', requestId);
      if (updErr) throw updErr;

      // If accepted, reflect in orders table so user/vendor see live 'approved'
      if (action === 'accepted') {
        // Find the request to get order_id
        const req = (queryClient.getQueryData<any[]>(['delivery-requests', partner?.id]) || []).find((r: any) => r.id === requestId);
        if (req?.order_id) {
          await supabase.from('orders').update({ delivery_status: 'approved' as any }).eq('id', req.order_id);
          // Immediately trigger user data load after acceptance
          setTimeout(() => {
            queryClient.invalidateQueries({ queryKey: ['delivery-requests', partner?.id] });
          }, 100);
        }
      }
    },
    onMutate: async (vars) => {
      const newStatus = vars.action === 'accepted' ? 'accepted' : 'rejected_by_partner';
      return await optimisticallyUpdateRequest(vars.requestId, (prev) =>
        prev.map((r) => r.id === vars.requestId ? { ...r, status: newStatus, orders: { ...(r.orders || {}), delivery_status: vars.action === 'accepted' ? 'approved' : r.orders?.delivery_status } } : r)
      );
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(['delivery-requests', partner?.id], ctx.prev);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['delivery-requests', partner?.id] });
      invalidateAllOrderConsumers();
    },
    onError: (e: any) => toast.error(e?.message || 'Failed to respond'),
  });

  const markPickedUp = useMutation({
    mutationFn: async (request: any) => {
      const { error } = await supabase
        .from('delivery_requests')
        .update({ status: 'picked_up', picked_up_at: new Date().toISOString() })
        .eq('id', request.id);
      if (error) throw error;
      const { error: orderError } = await supabase
        .from('orders')
        .update({ delivery_status: 'picked_up' })
        .eq('id', request.order_id);
      if (orderError) throw orderError;
    },
    onMutate: async (request: any) => {
      return await optimisticallyUpdateRequest(request.id, (prev) =>
        prev.map((r) => r.id === request.id ? { ...r, status: 'picked_up', picked_up_at: new Date().toISOString(), orders: { ...(r.orders || {}), delivery_status: 'picked_up' } } : r)
      );
    },
    onError: (_err, request, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(['delivery-requests', partner?.id], ctx.prev);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['delivery-requests', partner?.id] });
      invalidateAllOrderConsumers();
    },
  });

  const markOutForDelivery = useMutation({
    mutationFn: async (request: any) => {
      const { error } = await supabase
        .from('delivery_requests')
        .update({ status: 'out_for_delivery' })
        .eq('id', request.id);
      if (error) throw error;
      const { error: orderError } = await supabase
        .from('orders')
        .update({ delivery_status: 'out_for_delivery' })
        .eq('id', request.order_id);
      if (orderError) throw orderError;
    },
    onMutate: async (request: any) => {
      return await optimisticallyUpdateRequest(request.id, (prev) =>
        prev.map((r) => r.id === request.id ? { ...r, status: 'out_for_delivery', orders: { ...(r.orders || {}), delivery_status: 'out_for_delivery' } } : r)
      );
    },
    onError: (_err, request, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(['delivery-requests', partner?.id], ctx.prev);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['delivery-requests', partner?.id] });
      invalidateAllOrderConsumers();
    },
  });

  const markDelivered = useMutation({
    mutationFn: async (request: any) => {
      const { error } = await supabase
        .from('delivery_requests')
        .update({ status: 'delivered', delivered_at: new Date().toISOString() })
        .eq('id', request.id);
      if (error) throw error;
      const { error: orderError } = await supabase
        .from('orders')
        .update({ delivery_status: 'delivered' })
        .eq('id', request.order_id);
      if (orderError) throw orderError;
    },
    onMutate: async (request: any) => {
      return await optimisticallyUpdateRequest(request.id, (prev) =>
        prev.map((r) => r.id === request.id ? { ...r, status: 'delivered', delivered_at: new Date().toISOString(), orders: { ...(r.orders || {}), delivery_status: 'delivered' } } : r)
      );
    },
    onError: (_err, request, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(['delivery-requests', partner?.id], ctx.prev);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['delivery-requests', partner?.id] });
      invalidateAllOrderConsumers();
    },
  });

  const openNavToVendor = async (request: any) => {
    // Origin: delivery partner location (DB), fallback to device GPS
    const { data: partnerRow } = await supabase
      .from('delivery_partners')
      .select('latitude, longitude')
      .eq('id', partner!.id)
      .maybeSingle();
    let originLat = partnerRow?.latitude ?? null;
    let originLon = partnerRow?.longitude ?? null;
    if (originLat == null || originLon == null) {
      const me = await getCurrentPosition();
      originLat = me?.lat ?? null;
      originLon = me?.lon ?? null;
    }

    // Destination: vendor lat/lon
    const { data: vendorRow } = await supabase
      .from('vendors')
      .select('latitude, longitude')
      .eq('id', request.vendor_id)
      .maybeSingle();
    const vlat = vendorRow?.latitude;
    const vlon = vendorRow?.longitude;
    if (originLat == null || originLon == null) return toast.error('Your location not set');
    if (vlat == null || vlon == null) return toast.error('Vendor location not set');
    console.log('Nav to Vendor - origin:', { originLat, originLon }, 'dest (vendor):', { vlat, vlon });
    const url = buildMapsDirectionUrl({
      origin: { lat: originLat, lon: originLon },
      destination: { lat: vlat, lon: vlon },
      travelMode: 'driving',
      navigate: true,
    });
    openGoogleMaps(url);
  };

  const openNavToCustomer = async (request: any) => {
    // Origin: delivery partner location (DB), fallback to device GPS
    const { data: partnerRow } = await supabase
      .from('delivery_partners')
      .select('latitude, longitude')
      .eq('id', partner!.id)
      .maybeSingle();
    let originLat = partnerRow?.latitude ?? null;
    let originLon = partnerRow?.longitude ?? null;
    if (originLat == null || originLon == null) {
      const me = await getCurrentPosition();
      originLat = me?.lat ?? null;
      originLon = me?.lon ?? null;
    }

    // Prefer secure RPC which returns alt coords when present
    let orderRow: any = null;
    let rpcLat: number | null = null;
    let rpcLon: number | null = null;
    try {
      const { data: details } = await (supabase as any)
        .rpc('get_delivery_order_details', { p_order_id: request.order_id, p_partner_user_id: user!.id });
      if (details) {
        rpcLat = details.latitude ?? null;
        rpcLon = details.longitude ?? null;
      }
    } catch {}
    // Also fetch minimal order row for fallbacks
    const { data: baseRow } = await supabase
      .from('orders')
      .select('address_id, user_id, alt_drop_latitude, alt_drop_longitude, is_order_for_someone_else')
      .eq('id', request.order_id)
      .maybeSingle();
    orderRow = baseRow || {};
    
    // Try to get user location from address first
    let ulat = null;
    let ulon = null;
    // If RPC gave coords (alt-aware), use those first
    if (rpcLat != null && rpcLon != null) {
      ulat = Number(rpcLat);
      ulon = Number(rpcLon);
      console.log('Using RPC-provided coordinates:', { ulat, ulon });
      if (originLat == null || originLon == null) {
        const me = await getCurrentPosition();
        originLat = me?.lat ?? null;
        originLon = me?.lon ?? null;
      }
      if (ulat == null || ulon == null || originLat == null || originLon == null) {
        return toast.error('Location unavailable');
      }
      try { toast.success(`Routing to: ${Number(ulat).toFixed(6)}, ${Number(ulon).toFixed(6)} (rpc)`); } catch {}
      const url = buildMapsDirectionUrl({
        origin: { lat: Number(originLat), lon: Number(originLon) },
        destination: { lat: Number(ulat), lon: Number(ulon) },
        travelMode: 'driving',
        navigate: true,
      });
      return openGoogleMaps(url);
    }

    // If alternate drop coordinates provided on order, use them next
    if (orderRow?.alt_drop_latitude != null && orderRow?.alt_drop_longitude != null) {
      ulat = Number(orderRow.alt_drop_latitude);
      ulon = Number(orderRow.alt_drop_longitude);
      console.log('Using alternate drop coordinates from order:', { ulat, ulon });
      if (originLat == null || originLon == null) {
        const me = await getCurrentPosition();
        originLat = me?.lat ?? null;
        originLon = me?.lon ?? null;
      }
      if (ulat == null || ulon == null || originLat == null || originLon == null) {
        return toast.error('Location unavailable');
      }
      try { toast.success(`Routing to: ${Number(ulat).toFixed(6)}, ${Number(ulon).toFixed(6)} (alt)`); } catch {}
      const url = buildMapsDirectionUrl({
        origin: { lat: Number(originLat), lon: Number(originLon) },
        destination: { lat: Number(ulat), lon: Number(ulon) },
        travelMode: 'driving',
        navigate: true,
      });
      return openGoogleMaps(url);
    }

    if ((ulat == null || ulon == null) && orderRow?.address_id) {
      const { data: addressRow } = await supabase
        .from('addresses')
        .select('latitude, longitude')
        .eq('id', orderRow.address_id)
        .maybeSingle();
      ulat = ulat ?? (addressRow?.latitude ?? null);
      ulon = ulon ?? (addressRow?.longitude ?? null);
    }
    // If we have RPC-fetched coordinates, prefer them (more reliable through RLS)
    const rpcAddr = (addressByOrderId as any)[request.order_id];
    if ((ulat == null || ulon == null) && rpcAddr?.latitude != null && rpcAddr?.longitude != null) {
      ulat = rpcAddr.latitude;
      ulon = rpcAddr.longitude;
    }
    
    // If no address location, try user profile
    if ((ulat == null || ulon == null) && orderRow?.user_id) {
      const { data: profileRow } = await supabase
        .from('profiles')
        .select('latitude, longitude')
        .eq('id', orderRow.user_id)
        .maybeSingle();
      ulat = ulat ?? (profileRow?.latitude ?? null);
      ulon = ulon ?? (profileRow?.longitude ?? null);
    }
    
    // If still missing, use current position as fallback
    if (ulat == null || ulon == null) {
      const me = await getCurrentPosition();
      ulat = me?.lat ?? null;
      ulon = me?.lon ?? null;
    }
    
    if (ulat == null || ulon == null) {
      return toast.error('Customer location missing. Ask user to set location in Profile or set on address.');
    }
    if (originLat == null || originLon == null) return toast.error('Your location not set');
    
    console.log('Nav to Customer - origin (partner):', { originLat, originLon }, 'dest (user):', { ulat, ulon }, 'is_for_someone_else:', orderRow?.is_order_for_someone_else);
    try { toast.success(`Routing to: ${Number(ulat).toFixed(6)}, ${Number(ulon).toFixed(6)}`); } catch {}
    const url = buildMapsDirectionUrl({
      origin: { lat: Number(originLat), lon: Number(originLon) },
      destination: { lat: Number(ulat), lon: Number(ulon) },
      travelMode: 'driving',
      navigate: true,
    });
    openGoogleMaps(url);
  };

  // Start lightweight tracking when out_for_delivery: watch position and insert rows
  useEffect(() => {
    if (!requests) return;
    const active = requests.find((r: any) => r.status === 'out_for_delivery');
    if (!active) return;
    const stop = startPositionWatch(async (pos) => {
      try {
        await (supabase as any).from('delivery_tracking').insert({
          order_id: active.order_id,
          partner_id: partner!.id,
          latitude: pos.lat,
          longitude: pos.lon,
        });
      } catch {}
    });
    return () => stop();
  }, [requests, partner]);

  if (!partner?.id) {
    return (
      <div className="p-4 border rounded-md">
        <p className="text-sm text-muted-foreground">No delivery partner profile found for your account.</p>
        <div className="mt-2">
          <a href="/delivery/register" className="px-3 py-2 border rounded text-sm">Apply as Delivery Partner</a>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">Assigned Requests</h2>
        <div className="flex items-center gap-2">
          <Button size="sm" variant={view === 'live' ? 'default' : 'outline'} onClick={() => setView('live')}>Live</Button>
          <Button size="sm" variant={view === 'history' ? 'default' : 'outline'} onClick={() => setView('history')}>History</Button>
          <Button variant="outline" size="sm" onClick={() => refetch()}>Refresh</Button>
        </div>
      </div>
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : !requests || requests.length === 0 ? (
        <p className="text-sm text-muted-foreground">No assigned requests.</p>
      ) : (
        <div className="space-y-3 max-h-[600px] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
          {requests
            .filter((r: any) => !hiddenRequestIds.includes(r.id))
            .filter((r: any) => {
              const s = r.orders?.delivery_status || r.status;
              if (view === 'history') return ['delivered','rejected_by_partner','cancelled'].includes(s);
              return !['delivered','rejected_by_partner','cancelled'].includes(s);
            })
            .map((r: any) => (
            <Card key={r.id}>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">
                  Order #{r.order_id?.slice(0,8)}
                  <span className="text-xs uppercase ml-2 text-muted-foreground">{STATUS_LABEL[(r.orders?.delivery_status || r.status || 'pending') as any] || (r.orders?.delivery_status || r.status || 'pending')}</span>
                </CardTitle>
                {(orderAmountById[r.order_id]?.is_order_for_someone_else || r.orders?.is_order_for_someone_else) && (
                  <div className="mt-1"><span className="text-[10px] uppercase bg-secondary text-secondary-foreground px-2 py-0.5 rounded">For Someone Else</span></div>
                )}
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-sm space-y-1">
                  <div>
                    Vendor: <span className="font-medium">{r.vendors?.business_name || vendorById[r.vendor_id]?.business_name || r.vendor_id}</span>
                  </div>
                  {(r.vendors?.business_address || vendorById[r.vendor_id]?.business_address) && (
                    <div className="text-xs text-muted-foreground">{r.vendors?.business_address || vendorById[r.vendor_id]?.business_address}</div>
                  )}
                  {r.orders?.created_at && (
                    <div className="text-xs text-muted-foreground">Placed: {new Date(r.orders.created_at).toLocaleString()}</div>
                  )}
                  <div className="text-xs">
                    {(() => {
                      // Prefer RPC values (populated after acceptance) over raw order values
                      const rpcAmt = orderAmountById[r.order_id]?.final_amount ?? orderAmountById[r.order_id]?.subtotal;
                      const rawAmt = r.orders?.final_amount ?? r.orders?.subtotal;
                      const amtNum = Number(rpcAmt ?? rawAmt ?? 0);
                      const pay = orderAmountById[r.order_id]?.payment_status || r.orders?.payment_status || '—';
                      const formatted = isFinite(amtNum) ? amtNum.toFixed(2) : '0.00';
                      return <>Amount: ₹{formatted} • Payment: {pay}</>;
                    })()}
                  </div>
                </div>
                
                {/* Removed compact pre-accept banner; details show after accept */}
                
              {view === 'live' && (r.orders?.delivery_status === 'assigned' || r.status === 'assigned') && (
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => respond.mutate({ requestId: r.id, action: 'accepted' })}>
                      <Check className="h-4 w-4 mr-1" /> Accept
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => respond.mutate({ requestId: r.id, action: 'rejected' })}>
                      <X className="h-4 w-4 mr-1" /> Reject
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => openNavToVendor(r)}>Navigate to Vendor</Button>
                  </div>
                )}

              {view === 'live' && (r.orders?.delivery_status === 'assigned' || r.status === 'accepted') && (
                  <>
                    {/* Customer block: add user name + address + phone (nested or RPC fallback) */}
                    {(() => {
                      const nestedAddr = r.orders?.addresses;
                      const nestedPhone = Array.isArray(nestedAddr) ? nestedAddr[0]?.phone : nestedAddr?.phone;
                      const nestedAddressLine = Array.isArray(nestedAddr) ? nestedAddr[0]?.full_address : nestedAddr?.full_address;
                      const fb = addressByOrderId[r.order_id] || {};
                      const ufb = userByOrderId[r.order_id] || {};
                      const phoneNumber = nestedPhone || fb.phone || null;
                      const addressLine = nestedAddressLine || fb.full_address || null;
                      const cityState = [fb.city, fb.state].filter(Boolean).join(', ');
                      const pin = fb.pincode ? ` - ${fb.pincode}` : '';
                      if (phoneNumber || addressLine) {
                        return (
                          <div className="p-2 border rounded bg-muted/20 text-xs space-y-1">
                            {ufb.full_name && (
                              <div className="font-medium text-foreground">Customer: {ufb.full_name}</div>
                            )}
                            {addressLine && (
                              <div className="text-muted-foreground">
                                Delivery: {addressLine}{cityState || pin ? `, ${cityState}${pin}` : ''}
                              </div>
                            )}
                            {phoneNumber && (
                              <div className="flex items-center gap-2">
                                <Phone className="h-3 w-3 text-green-600" />
                                <span className="font-medium">{phoneNumber}</span>
                                <a href={`tel:${phoneNumber.replace(/\D/g, '')}`} className="ml-auto">
                                  <Button size="sm" variant="outline" className="h-7">Call</Button>
                                </a>
                              </div>
                            )}
                          </div>
                        );
                      }
                      return null;
                    })()}

                    {/* Order items */}
                    {orderItemsByOrderId[r.order_id] && orderItemsByOrderId[r.order_id].length > 0 && (
                      <div className="border rounded p-2">
                        <div className="text-xs font-semibold mb-1">Items</div>
                        <div className="space-y-1">
                          {orderItemsByOrderId[r.order_id].map((it) => (
                            <div key={it.id} className="flex items-center justify-between text-xs">
                              <div className="truncate mr-2">{it.snapshot_name}</div>
                              <div className="whitespace-nowrap">x{it.quantity} • ₹{it.snapshot_price}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => openNavToVendor(r)}>Open Navigation to Vendor</Button>
                      <Button size="sm" variant="outline" onClick={() => markPickedUp.mutate(r)}>Mark Picked Up</Button>
                    </div>
                  </>
                )}

              {view === 'live' && (r.orders?.delivery_status === 'picked_up' || r.status === 'picked_up') && (
                  <>
                    {/* Customer Contact Info persists after picked_up */}
                    {(() => {
                      const nestedAddr = r.orders?.addresses;
                      const nestedPhone = Array.isArray(nestedAddr) ? nestedAddr[0]?.phone : nestedAddr?.phone;
                      const fb = addressByOrderId[r.order_id] || {};
                      const phoneNumber = nestedPhone || fb.phone || null;
                      if (phoneNumber) {
                        return (
                          <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded mb-3">
                            <Phone className="h-4 w-4 text-green-600" />
                            <span className="text-sm font-medium text-green-900 flex-1">
                              Contact Customer: {phoneNumber}
                            </span>
                            <a href={`tel:${phoneNumber.replace(/\D/g, '')}`}>
                              <Button size="sm" className="bg-green-600 hover:bg-green-700">
                                <Phone className="h-3 w-3 mr-1" /> Call Customer
                              </Button>
                            </a>
                          </div>
                        );
                      }
                      return null;
                    })()}

                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => { openNavToCustomer(r); markOutForDelivery.mutate(r); }}>Out for Delivery</Button>
                    </div>
                  </>
                )}

              {view === 'live' && (r.orders?.delivery_status === 'out_for_delivery' || r.status === 'out_for_delivery') && (
                  <>
                    {/* Customer Contact Info persists during out_for_delivery */}
                    {(() => {
                      const nestedAddr = r.orders?.addresses;
                      const nestedPhone = Array.isArray(nestedAddr) ? nestedAddr[0]?.phone : nestedAddr?.phone;
                      const fb = addressByOrderId[r.order_id] || {};
                      const phoneNumber = nestedPhone || fb.phone || null;
                      if (phoneNumber) {
                        return (
                          <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded mb-3">
                            <Phone className="h-4 w-4 text-green-600" />
                            <span className="text-sm font-medium text-green-900 flex-1">
                              Contact Customer: {phoneNumber}
                            </span>
                            <a href={`tel:${phoneNumber.replace(/\D/g, '')}`}>
                              <Button size="sm" className="bg-green-600 hover:bg-green-700">
                                <Phone className="h-3 w-3 mr-1" /> Call Customer
                              </Button>
                            </a>
                          </div>
                        );
                      }
                      return null;
                    })()}
                    
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => openNavToCustomer(r)}>Open Navigation to Customer</Button>
                      <Button size="sm" variant="outline" onClick={() => markDelivered.mutate(r)}>Mark as Delivered</Button>
                    </div>
                  </>
                )}

              {view === 'history' && (r.orders?.delivery_status === 'delivered' || r.status === 'delivered') && (
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => removeFromDashboard(r.id)}>Delete</Button>
                  </div>
                )}

              {view === 'history' && r.status === 'rejected_by_partner' && (
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => removeFromDashboard(r.id)}>Delete</Button>
                  </div>
                )}

              {view === 'history' && r.status === 'cancelled' && (
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => removeFromDashboard(r.id)}>Delete</Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
