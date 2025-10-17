import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import Auth from '@/pages/Auth';
import { Navbar } from '@/components/Navbar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Truck, Package, Check, X, MapPin } from 'lucide-react';
import { toast } from 'sonner';
import { buildMapsDirectionUrl, getCurrentPosition, openGoogleMaps, startPositionWatch } from '@/lib/utils';

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
      const { error } = await supabase
        .from('delivery_partners')
        .update({ latitude: pos.lat, longitude: pos.lon })
        .eq('id', partner.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Location updated');
      queryClient.invalidateQueries({ queryKey: ['delivery-partner-location', user?.id] });
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
      const { data, error } = await supabase
        .from('delivery_requests')
        .select('*')
        .eq('assigned_partner_id', partner!.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });
  const removeFromDashboard = async (requestId: string) => {
    try {
      const { error } = await supabase
        .from('delivery_requests')
        .delete()
        .eq('id', requestId);
      if (error) throw error;
      toast.success('Removed from dashboard');
    } catch (e: any) {
      // Likely blocked by RLS: hide locally so dashboard is cleaned
      toast('Removed locally');
    } finally {
      setHiddenRequestIds((prev) => [...prev, requestId]);
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
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['delivery-requests', partner?.id] });
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
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['delivery-requests', partner?.id] });
    },
  });

  const markOutForDelivery = useMutation({
    mutationFn: async (request: any) => {
      const { error } = await supabase
        .from('delivery_requests')
        .update({ status: 'out_for_delivery' })
        .eq('id', request.id);
      if (error) throw error;
      // also link orders.delivery_status if accessible to partner (optional, best via trigger)
      await supabase.from('orders').update({ delivery_status: 'out_for_delivery' as any }).eq('id', request.order_id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['delivery-requests', partner?.id] });
    },
  });

  const markDelivered = useMutation({
    mutationFn: async (request: any) => {
      const { error } = await supabase
        .from('delivery_requests')
        .update({ status: 'delivered', delivered_at: new Date().toISOString() })
        .eq('id', request.id);
      if (error) throw error;
      await supabase.from('orders').update({ delivery_status: 'delivered' as any }).eq('id', request.order_id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['delivery-requests', partner?.id] });
    },
  });

  const openNavToVendor = async (request: any) => {
    const me = await getCurrentPosition();
    // fallback minimal query to fetch vendor lat/lon
    const { data: vendorRow } = await supabase
      .from('vendors')
      .select('latitude, longitude')
      .eq('id', request.vendor_id)
      .maybeSingle();
    const vlat = vendorRow?.latitude;
    const vlon = vendorRow?.longitude;
    if (!vlat || !vlon) return toast.error('Vendor location not set');
    const url = buildMapsDirectionUrl({
      origin: me || undefined,
      destination: { lat: vlat, lon: vlon },
      travelMode: 'driving',
      navigate: true,
    });
    openGoogleMaps(url);
  };

  const openNavToCustomer = async (request: any) => {
    const { data: vendorRow } = await supabase
      .from('vendors')
      .select('latitude, longitude')
      .eq('id', request.vendor_id)
      .maybeSingle();
    let vlat = vendorRow?.latitude ?? null;
    let vlon = vendorRow?.longitude ?? null;
    if (vlat == null || vlon == null) {
      const me = await getCurrentPosition();
      vlat = me?.lat ?? null;
      vlon = me?.lon ?? null;
    }
    const { data: orderRow } = await supabase
      .from('orders')
      .select('address_id, user_id')
      .eq('id', request.order_id)
      .maybeSingle();
    const { data: addressRow } = await supabase
      .from('addresses')
      .select('latitude, longitude')
      .eq('id', orderRow?.address_id)
      .maybeSingle();
    let ulat = addressRow?.latitude ?? null;
    let ulon = addressRow?.longitude ?? null;
    if (ulat == null || ulon == null) {
      const { data: profileRow } = await supabase
        .from('profiles')
        .select('latitude, longitude')
        .eq('id', orderRow?.user_id)
        .maybeSingle();
      ulat = profileRow?.latitude ?? null;
      ulon = profileRow?.longitude ?? null;
    }
    // If still missing, give one last attempt: ask browser
    if (ulat == null || ulon == null) {
      const me = await getCurrentPosition();
      ulat = me?.lat ?? null;
      ulon = me?.lon ?? null;
    }
    if (ulat == null || ulon == null) return toast.error('Customer location missing. Ask user to set location in Profile or set on address.');
    if (vlat == null || vlon == null) return toast.error('Origin missing. Set vendor or your current location.');
    const url = buildMapsDirectionUrl({
      origin: { lat: vlat, lon: vlon },
      destination: { lat: ulat, lon: ulon },
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
        <Button variant="outline" size="sm" onClick={() => refetch()}>Refresh</Button>
      </div>
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : !requests || requests.length === 0 ? (
        <p className="text-sm text-muted-foreground">No assigned requests.</p>
      ) : (
        <div className="space-y-3">
          {requests.filter((r: any) => !hiddenRequestIds.includes(r.id)).map((r: any) => (
            <Card key={r.id}>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Order #{r.order_id?.slice(0,8)} <span className="text-xs uppercase ml-2 text-muted-foreground">{r.status}</span></CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-sm">
                  <div>Vendor: <span className="font-medium">{r.vendors?.business_name || r.vendor_id}</span></div>
                </div>
                {r.status === 'assigned' && (
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

                {r.status === 'accepted' && (
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => openNavToVendor(r)}>Open Navigation to Vendor</Button>
                    <Button size="sm" variant="outline" onClick={() => markPickedUp.mutate(r)}>Mark Picked Up</Button>
                  </div>
                )}

                {r.status === 'picked_up' && (
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => { openNavToCustomer(r); markOutForDelivery.mutate(r); }}>Out for Delivery</Button>
                  </div>
                )}

                {r.status === 'out_for_delivery' && (
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => openNavToCustomer(r)}>Open Navigation to Customer</Button>
                    <Button size="sm" variant="outline" onClick={() => markDelivered.mutate(r)}>Mark as Delivered</Button>
                  </div>
                )}

                {r.status === 'delivered' && (
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => removeFromDashboard(r.id)}>Delete</Button>
                  </div>
                )}

                {r.status === 'rejected_by_partner' && (
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => removeFromDashboard(r.id)}>Delete</Button>
                  </div>
                )}

                {r.status === 'cancelled' && (
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
