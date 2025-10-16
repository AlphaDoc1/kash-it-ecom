import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { Navbar } from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { User } from 'lucide-react';

const Profile = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: profile } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const queryClient = useQueryClient();

  const { data: addresses } = useQuery({
    queryKey: ['addresses', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('addresses')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const addAddress = useMutation({
    mutationFn: async (payload: {
      label: string;
      full_address: string;
      city: string;
      state: string;
      pincode: string;
      phone: string;
      is_default: boolean;
    }) => {
      if (!user) throw new Error('Not authenticated');
      const toInsert = { ...payload, user_id: user.id } as const;
      const { error } = await supabase.from('addresses').insert(toInsert);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['addresses'] });
      setForm({ label: '', full_address: '', city: '', state: '', pincode: '', phone: '', is_default: false });
    },
  });

  const [form, setForm] = useState({
    label: '',
    full_address: '',
    city: '',
    state: '',
    pincode: '',
    phone: '',
    is_default: false,
  });

  if (!user) {
    navigate('/auth');
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold mb-8">My Profile</h1>

        <div className="max-w-2xl">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-4">
                <div className="p-4 bg-primary/10 rounded-full">
                  <User className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <CardTitle>{profile?.full_name || 'User'}</CardTitle>
                  <p className="text-sm text-muted-foreground">{user.email}</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Phone</label>
                <p className="text-lg">{profile?.phone || 'Not provided'}</p>
              </div>
              
              <div>
                <label className="text-sm font-medium text-muted-foreground">Account Status</label>
                <p className="text-lg">{profile?.is_verified ? 'Verified' : 'Not Verified'}</p>
              </div>

              <div className="pt-4">
                <Button onClick={() => navigate('/orders')}>View Orders</Button>
              </div>
            </CardContent>
          </Card>

          <div className="h-6" />

          <Card>
            <CardHeader>
              <CardTitle>Delivery Addresses</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                {addresses && addresses.length > 0 ? (
                  addresses.map((addr: any) => (
                    <div key={addr.id} className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-semibold">{addr.label} {addr.is_default ? <span className="text-xs text-primary">(Default)</span> : null}</div>
                          <div className="text-sm text-muted-foreground">{addr.full_address}</div>
                          <div className="text-sm text-muted-foreground">{addr.city}, {addr.state} - {addr.pincode}</div>
                          <div className="text-sm text-muted-foreground">Phone: {addr.phone}</div>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">No addresses yet.</p>
                )}
              </div>

              <div className="border-t pt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Label</label>
                    <Input value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} placeholder="Home / Office" />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Phone</label>
                    <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+91..." />
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-sm font-medium">Full Address</label>
                    <Input value={form.full_address} onChange={(e) => setForm({ ...form, full_address: e.target.value })} placeholder="Street, Area, Landmark" />
                  </div>
                  <div>
                    <label className="text-sm font-medium">City</label>
                    <Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-sm font-medium">State</label>
                    <Input value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Pincode</label>
                    <Input value={form.pincode} onChange={(e) => setForm({ ...form, pincode: e.target.value })} />
                  </div>
                </div>
                <div className="flex items-center gap-3 mt-4">
                  <label className="text-sm">
                    <input type="checkbox" className="mr-2" checked={form.is_default} onChange={(e) => setForm({ ...form, is_default: e.target.checked })} />
                    Set as default address
                  </label>
                  <Button
                    onClick={() => addAddress.mutate(form)}
                    disabled={addAddress.isPending || !form.label || !form.full_address || !form.city || !form.state || !form.pincode || !form.phone}
                  >
                    Save Address
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Profile;
