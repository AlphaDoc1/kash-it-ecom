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
import { Users, Package, Store, Truck, Send, Ban, RefreshCcw, Check, Eye } from 'lucide-react';
import { toast } from 'sonner';

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
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold mb-8">Admin Dashboard</h1>

        <div className="grid lg:grid-cols-3 gap-6 mb-8">
          <Card className="lg:col-span-1">
            <VendorInviteForm invitedByUserId={user?.id ?? null} />
          </Card>

          <Card className="lg:col-span-2">
            <VendorInvitationsList />
          </Card>
        </div>

        <div className="grid lg:grid-cols-3 gap-6 mb-8">
          <Card className="lg:col-span-1">
            <DeliveryApplicationsList />
          </Card>
          <Card className="lg:col-span-2">
            <DeliveryApplicationsActions />
          </Card>
        </div>

        <div className="grid lg:grid-cols-3 gap-6 mb-8">
          <Card className="lg:col-span-1">
            <VendorsList />
          </Card>
          <Card className="lg:col-span-2">
            <VendorProductsApproval />
          </Card>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card><CardHeader><Users className="h-8 w-8 text-primary mb-2" /><CardTitle>Users</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold">-</p></CardContent></Card>
          <Card><CardHeader><Package className="h-8 w-8 text-primary mb-2" /><CardTitle>Products</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold">-</p></CardContent></Card>
          <Card><CardHeader><Store className="h-8 w-8 text-primary mb-2" /><CardTitle>Vendors</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold">-</p></CardContent></Card>
          <Card><CardHeader><Truck className="h-8 w-8 text-primary mb-2" /><CardTitle>Orders</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold">-</p></CardContent></Card>
        </div>

        <div className="grid lg:grid-cols-2 gap-6 mt-8">
          <Card>
            <VendorsCrud />
          </Card>
          <Card>
            <DeliveryPartnersCrud />
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;

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
        <CardTitle className="text-xl flex items-center gap-2">
          <Send className="h-5 w-5 text-primary" /> Invite Vendor
        </CardTitle>
      </CardHeader>
      <form className="space-y-4" onSubmit={onSubmit}>
        <div className="space-y-2">
          <label className="text-sm font-medium">Vendor Email</label>
          <Input type="email" placeholder="vendor@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Business Name</label>
          <Input placeholder="Acme Foods" value={businessName} onChange={(e) => setBusinessName(e.target.value)} required />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Business Description</label>
          <Textarea placeholder="Short description" value={businessDescription} onChange={(e) => setBusinessDescription(e.target.value)} />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Business Address</label>
          <Textarea placeholder="Full address" value={businessAddress} onChange={(e) => setBusinessAddress(e.target.value)} />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">GSTIN (optional)</label>
          <Input placeholder="22AAAAA0000A1Z5" value={gstin} onChange={(e) => setGstin(e.target.value)} />
        </div>
        <div className="pt-2">
          <Button type="submit" disabled={inviteMutation.isPending}>
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
      <div className="flex items-center justify-between mb-4">
        <CardHeader className="p-0"><CardTitle className="text-xl">Delivery Applications</CardTitle></CardHeader>
        <Button variant="outline" size="sm" onClick={() => refetch()}><RefreshCcw className="h-4 w-4 mr-2" /> Refresh</Button>
      </div>
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : !data || data.length === 0 ? (
        <p className="text-sm text-muted-foreground">No applications</p>
      ) : (
        <div className="space-y-2">
          {data.map((a) => (
            <div key={a.id} className="p-3 border rounded">
              <div className="font-semibold">{a.full_name} <span className="text-xs text-muted-foreground">({a.email})</span></div>
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
      <div className="flex items-center justify-between mb-4">
        <CardHeader className="p-0"><CardTitle className="text-xl">Manage Vendors</CardTitle></CardHeader>
        <Button variant="outline" size="sm" onClick={() => refetch()}><RefreshCcw className="h-4 w-4 mr-2" /> Refresh</Button>
      </div>
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : !data || data.length === 0 ? (
        <p className="text-sm text-muted-foreground">No vendors found</p>
      ) : (
        <div className="space-y-2">
          {data.map((v: any) => (
            <div key={v.id} className="p-4 border rounded flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="font-semibold truncate">{v.business_name}</div>
                <div className="text-xs text-muted-foreground">Approved: {v.is_approved ? 'Yes' : 'No'} • Active: {v.is_active ? 'Yes' : 'No'}</div>
                {v.business_address ? <div className="text-xs text-muted-foreground truncate">{v.business_address}</div> : null}
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" onClick={() => toggleApproved.mutate(v)}>{v.is_approved ? 'Unapprove' : 'Approve'}</Button>
                <Button size="sm" variant="outline" onClick={() => toggleActive.mutate(v)}>{v.is_active ? 'Deactivate' : 'Activate'}</Button>
                <Button size="sm" variant="destructive" onClick={() => removeVendor.mutate(v)}>Delete</Button>
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
      <div className="flex items-center justify-between mb-4">
        <CardHeader className="p-0"><CardTitle className="text-xl">Manage Delivery Partners</CardTitle></CardHeader>
        <Button variant="outline" size="sm" onClick={() => refetch()}><RefreshCcw className="h-4 w-4 mr-2" /> Refresh</Button>
      </div>
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : !data || data.length === 0 ? (
        <p className="text-sm text-muted-foreground">No delivery partners found</p>
      ) : (
        <div className="space-y-2">
          {data.map((p: any) => (
            <div key={p.id} className="p-4 border rounded flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="font-semibold truncate">{p.profiles?.full_name || '-'} <span className="text-xs text-muted-foreground">({p.profiles?.email || '-'})</span></div>
                <div className="text-xs text-muted-foreground">Verified: {p.is_verified ? 'Yes' : 'No'} • Active: {p.is_active ? 'Yes' : 'No'}</div>
                <div className="text-xs text-muted-foreground">{p.vehicle_type || '-'} • {p.vehicle_number || '-'}</div>
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" onClick={() => toggleVerified.mutate(p)}>{p.is_verified ? 'Unverify' : 'Verify'}</Button>
                <Button size="sm" variant="outline" onClick={() => toggleActive.mutate(p)}>{p.is_active ? 'Deactivate' : 'Activate'}</Button>
                <Button size="sm" variant="destructive" onClick={() => removePartner.mutate(p)}>Delete</Button>
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
  const approve: any = useMutation({
    mutationFn: async (app: any) => {
      // 1) Mark as approved
      const { error: updErr } = await (supabase as any)
        .from('delivery_applications')
        .update({ status: 'approved' })
        .eq('id', app.id)
        .eq('status', 'pending');
      if (updErr) throw updErr;

      // 2) If a profile already exists with this email, immediately link: create partner and grant role
      const { data: profile, error: profErr } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', app.email)
        .maybeSingle();
      if (profErr) throw profErr;

      if (profile?.id) {
        // Create delivery_partners if missing
        const { data: existing, error: existErr } = await supabase
          .from('delivery_partners')
          .select('id')
          .eq('user_id', profile.id)
          .maybeSingle();
        if (existErr) throw existErr;
        if (!existing) {
          const { error: insErr } = await supabase
            .from('delivery_partners')
            .insert({
              user_id: profile.id,
              vehicle_type: app.vehicle_type || null,
              vehicle_number: app.vehicle_number || null,
              is_verified: true,
              is_active: true,
            });
          if (insErr) throw insErr;
        }

        // Grant delivery role if missing
        const { data: roles, error: rolesErr } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', profile.id);
        if (rolesErr) throw rolesErr;
        const hasDelivery = (roles || []).some((r) => r.role === 'delivery');
        if (!hasDelivery) {
          const { error: roleErr } = await supabase
            .from('user_roles')
            .insert({ user_id: profile.id, role: 'delivery' as any });
          if (roleErr) throw roleErr;
        }

        // Mark application linked
        const { error: linkErr } = await (supabase as any)
          .from('delivery_applications')
          .update({ status: 'linked', linked_user_id: profile.id })
          .eq('id', app.id);
        if (linkErr) throw linkErr;
      }
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
      <CardHeader className="p-0 mb-4"><CardTitle className="text-xl">Pending Delivery Approvals</CardTitle></CardHeader>
      {!data || data.length === 0 ? (
        <p className="text-sm text-muted-foreground">No pending applications</p>
      ) : (
        <div className="space-y-2">
          {data.map((a) => (
            <div key={a.id} className="p-4 border rounded flex items-center justify-between">
              <div>
                <div className="font-semibold">{a.full_name}</div>
                <div className="text-xs text-muted-foreground">{a.email} • {a.phone || '-'}</div>
                <div className="text-xs text-muted-foreground">{a.vehicle_type || '-'} • {a.vehicle_number || '-'}</div>
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" onClick={() => approve.mutate(a)}><Check className="h-4 w-4 mr-2" /> Approve</Button>
                <Button size="sm" variant="destructive" onClick={() => reject.mutate(a)}>Reject</Button>
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
      return data as Array<{ id: string; business_name: string; is_active: boolean | null; is_approved: boolean | null; profiles: { full_name: string } }>; 
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
      <CardHeader className="p-0 mb-4"><CardTitle className="text-xl">Vendors</CardTitle></CardHeader>
      <p className="text-sm text-muted-foreground">Loading…</p>
    </CardContent>
  );

  return (
    <CardContent>
      <CardHeader className="p-0 mb-4"><CardTitle className="text-xl">Vendors</CardTitle></CardHeader>
      {!data || data.length === 0 ? (
        <p className="text-sm text-muted-foreground">No vendors found.</p>
      ) : (
        <div className="space-y-2">
          {data.map((v) => (
            <button
              key={v.id}
              className={`w-full text-left p-3 rounded border ${selectedVendorId === v.id ? 'border-primary' : 'border-muted'}`}
              onClick={() => {
                setSelectedVendorId(v.id);
                localStorage.setItem('admin-selected-vendor', v.id);
              }}
            >
              <div className="font-semibold">{v.business_name}</div>
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
      <div className="flex items-center justify-between mb-4">
        <CardHeader className="p-0">
          <CardTitle className="text-xl flex items-center gap-2"><Eye className="h-5 w-5 text-primary" /> Vendor Products</CardTitle>
        </CardHeader>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
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
        <div className="grid md:grid-cols-2 gap-4">
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
                <div className="font-semibold">{p.name}</div>
                <div className="text-sm text-muted-foreground">₹{p.price} • Stock {p.stock}{p.unit ? ` ${p.unit}` : ''}</div>
              </div>
              {p.is_approved ? (
                <span className="text-xs text-green-600">Approved</span>
              ) : (
                <Button size="sm" onClick={() => approveMutation.mutate(p.id)} disabled={approveMutation.isPending}>
                  <Check className="h-4 w-4 mr-2" /> Approve
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
      const { data: profiles, error: profErr } = await supabase
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
      <div className="flex items-center justify-between mb-4">
        <CardHeader className="p-0">
          <CardTitle className="text-xl">Vendor Invitations</CardTitle>
        </CardHeader>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
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
            <div key={inv.id} className="p-4 border rounded-md flex flex-col md:flex-row md:items-center gap-3">
              <div className="flex-1">
                <div className="font-semibold">{inv.business_name}</div>
                <div className="text-sm text-muted-foreground">{inv.email}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  Status: <span className="uppercase">{inv.status}</span>
                  {inv.accepted_at ? ` • Accepted: ${new Date(inv.accepted_at).toLocaleString()}` : ''}
                </div>
              </div>
              {inv.status === 'pending' && (
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    onClick={() => approveMutation.mutate(inv)}
                    disabled={approveMutation.isPending}
                  >
                    <Check className="h-4 w-4 mr-2" /> Approve
                  </Button>
                  <Button variant="destructive" size="sm" onClick={() => revokeMutation.mutate(inv.id)}>
                    <Ban className="h-4 w-4 mr-2" /> Revoke
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
