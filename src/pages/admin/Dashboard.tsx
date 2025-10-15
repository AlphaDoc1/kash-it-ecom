import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { Navbar } from '@/components/Navbar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Users, Package, Store, Truck, Send, Ban, RefreshCcw, Check } from 'lucide-react';
import { toast } from 'sonner';

const AdminDashboard = () => {
  const { userRoles, user } = useAuth();
  const navigate = useNavigate();

  if (!userRoles.includes('admin')) {
    navigate('/');
    return null;
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

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card><CardHeader><Users className="h-8 w-8 text-primary mb-2" /><CardTitle>Users</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold">-</p></CardContent></Card>
          <Card><CardHeader><Package className="h-8 w-8 text-primary mb-2" /><CardTitle>Products</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold">-</p></CardContent></Card>
          <Card><CardHeader><Store className="h-8 w-8 text-primary mb-2" /><CardTitle>Vendors</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold">-</p></CardContent></Card>
          <Card><CardHeader><Truck className="h-8 w-8 text-primary mb-2" /><CardTitle>Orders</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold">-</p></CardContent></Card>
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

  const approveMutation = useMutation<any, any, {
    id: string;
    email: string;
    business_name: string;
    business_description: string | null;
    business_address: string | null;
    gstin: string | null;
  }>({
    // Approve invitation by creating vendor/user role if user exists
    mutationFn: async (inv) => {
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
