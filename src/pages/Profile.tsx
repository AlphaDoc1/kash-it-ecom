import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { Navbar } from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { User, Edit, Save, X, MapPin } from 'lucide-react';
import { toast } from 'sonner';

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

  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({
    full_name: '',
    phone: '',
  });

  // Update profile form when profile data loads
  useEffect(() => {
    if (profile) {
      setProfileForm({
        full_name: profile.full_name || '',
        phone: profile.phone || '',
      });
    }
  }, [profile]);

  const updateProfile = useMutation({
    mutationFn: async (payload: { full_name: string; phone: string }) => {
      if (!user) throw new Error('Not authenticated');
      const { error } = await supabase
        .from('profiles')
        .update(payload)
        .eq('id', user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile', user?.id] });
      setIsEditingProfile(false);
      toast.success('Profile updated successfully!');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update profile');
    },
  });

  if (!user) {
    navigate('/auth');
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="container mx-auto px-2 sm:px-4 py-4 sm:py-6 md:py-8">
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4 sm:mb-6 md:mb-8">My Profile</h1>

        <div className="max-w-2xl">
          <Card>
            <CardHeader className="p-3 sm:p-4 md:p-6">
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="p-2 sm:p-3 md:p-4 bg-primary/10 rounded-full">
                  <User className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <CardTitle className="text-base sm:text-lg md:text-xl truncate">{profile?.full_name || 'User'}</CardTitle>
                  <p className="text-xs sm:text-sm text-muted-foreground truncate">{user.email}</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-3 sm:p-4 md:p-6 space-y-3 sm:space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4">
                <h3 className="text-base sm:text-lg font-semibold">Personal Information</h3>
                {!isEditingProfile ? (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setIsEditingProfile(true)}
                    className="w-full sm:w-auto"
                  >
                    <Edit className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" /> Edit
                  </Button>
                ) : (
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Button 
                      size="sm" 
                      onClick={() => updateProfile.mutate(profileForm)}
                      disabled={updateProfile.isPending || !profileForm.full_name.trim()}
                      className="w-full sm:w-auto"
                    >
                      <Save className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" /> Save
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => {
                        setIsEditingProfile(false);
                        setProfileForm({
                          full_name: profile?.full_name || '',
                          phone: profile?.phone || '',
                        });
                      }}
                      className="w-full sm:w-auto"
                    >
                      <X className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" /> Cancel
                    </Button>
                  </div>
                )}
              </div>

              {isEditingProfile ? (
                <div className="space-y-3 sm:space-y-4">
                  <div>
                    <label className="text-xs sm:text-sm font-medium text-muted-foreground">Full Name</label>
                    <Input 
                      value={profileForm.full_name} 
                      onChange={(e) => setProfileForm({ ...profileForm, full_name: e.target.value })}
                      placeholder="Enter your full name"
                      className="text-sm sm:text-base"
                    />
                  </div>
                  <div>
                    <label className="text-xs sm:text-sm font-medium text-muted-foreground">Phone Number</label>
                    <Input 
                      value={profileForm.phone} 
                      onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                      placeholder="Enter your phone number"
                      className="text-sm sm:text-base"
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-3 sm:space-y-4">
                  <div>
                    <label className="text-xs sm:text-sm font-medium text-muted-foreground">Full Name</label>
                    <p className="text-sm sm:text-base sm:text-lg">{profile?.full_name || 'Not provided'}</p>
                  </div>
                  <div>
                    <label className="text-xs sm:text-sm font-medium text-muted-foreground">Phone</label>
                    <p className="text-sm sm:text-base sm:text-lg">{profile?.phone || 'Not provided'}</p>
                  </div>
                </div>
              )}
              
              <div>
                <label className="text-xs sm:text-sm font-medium text-muted-foreground">Account Status</label>
                <p className="text-sm sm:text-base sm:text-lg">{profile?.is_verified ? 'Verified' : 'Not Verified'}</p>
              </div>

              {(!profile?.full_name || !profile?.phone) && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 sm:p-4">
                  <p className="text-xs sm:text-sm text-yellow-800">
                    <strong>Complete your profile:</strong> Please add your full name and phone number to ensure proper order processing and delivery.
                  </p>
                </div>
              )}

              <div className="pt-3 sm:pt-4">
                <Button onClick={() => navigate('/orders')} className="w-full sm:w-auto text-sm sm:text-base">View Orders</Button>
              </div>
            </CardContent>
          </Card>

          <div className="h-6" />

          <Card>
            <CardHeader className="p-3 sm:p-4 md:p-6">
              <div className="flex items-center gap-2"><MapPin className="h-4 w-4 sm:h-5 sm:w-5 text-primary" /><CardTitle className="text-base sm:text-lg">My Location</CardTitle></div>
            </CardHeader>
            <CardContent className="p-3 sm:p-4 md:p-6">
              <UserLocationSection userId={user.id} />
            </CardContent>
          </Card>

          <div className="h-4 sm:h-6" />

          <Card>
            <CardHeader className="p-3 sm:p-4 md:p-6">
              <CardTitle className="text-base sm:text-lg">Delivery Addresses</CardTitle>
            </CardHeader>
            <CardContent className="p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6">
              <div className="space-y-2 sm:space-y-3">
                {addresses && addresses.length > 0 ? (
                  addresses.map((addr: any) => (
                    <div key={addr.id} className="p-3 sm:p-4 border rounded-lg">
                      <div className="flex items-center justify-between">
                        <div className="min-w-0 flex-1">
                          <div className="font-semibold text-sm sm:text-base">{addr.label} {addr.is_default ? <span className="text-xs text-primary">(Default)</span> : null}</div>
                          <div className="text-xs sm:text-sm text-muted-foreground break-words">{addr.full_address}</div>
                          <div className="text-xs sm:text-sm text-muted-foreground">{addr.city}, {addr.state} - {addr.pincode}</div>
                          <div className="text-xs sm:text-sm text-muted-foreground">Phone: {addr.phone}</div>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-xs sm:text-sm text-muted-foreground">No addresses yet.</p>
                )}
              </div>

              <div className="border-t pt-3 sm:pt-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <label className="text-xs sm:text-sm font-medium">Label</label>
                    <Input value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} placeholder="Home / Office" className="text-sm sm:text-base" />
                  </div>
                  <div>
                    <label className="text-xs sm:text-sm font-medium">Phone</label>
                    <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+91..." className="text-sm sm:text-base" />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-xs sm:text-sm font-medium">Full Address</label>
                    <Input value={form.full_address} onChange={(e) => setForm({ ...form, full_address: e.target.value })} placeholder="Street, Area, Landmark" className="text-sm sm:text-base" />
                  </div>
                  <div>
                    <label className="text-xs sm:text-sm font-medium">City</label>
                    <Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} className="text-sm sm:text-base" />
                  </div>
                  <div>
                    <label className="text-xs sm:text-sm font-medium">State</label>
                    <Input value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} className="text-sm sm:text-base" />
                  </div>
                  <div>
                    <label className="text-xs sm:text-sm font-medium">Pincode</label>
                    <Input value={form.pincode} onChange={(e) => setForm({ ...form, pincode: e.target.value })} className="text-sm sm:text-base" />
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mt-3 sm:mt-4">
                  <label className="text-xs sm:text-sm flex items-center">
                    <input type="checkbox" className="mr-2" checked={form.is_default} onChange={(e) => setForm({ ...form, is_default: e.target.checked })} />
                    Set as default address
                  </label>
                  <Button
                    onClick={() => addAddress.mutate(form)}
                    disabled={addAddress.isPending || !form.label || !form.full_address || !form.city || !form.state || !form.pincode || !form.phone}
                    className="w-full sm:w-auto text-sm sm:text-base"
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

const UserLocationSection = ({ userId }: { userId: string }) => {
  const queryClient = useQueryClient();
  const { data: userProfile, isLoading } = useQuery({
    queryKey: ['profile-location', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, latitude, longitude')
        .eq('id', userId)
        .single();
      if (error) throw error;
      return data as { id: string; latitude: number | null; longitude: number | null };
    }
  });

  const setLocation = useMutation({
    mutationFn: async () => {
      const pos = await (await import('@/lib/utils')).getCurrentPosition();
      if (!pos) throw new Error('Unable to get current location');
      const { error } = await supabase
        .from('profiles')
        .update({ latitude: pos.lat, longitude: pos.lon } as any)
        .eq('id', userId);
      if (error) throw error;
      // Also mirror coordinates into the user's default (or latest) address for routing
      const { data: defAddr } = await supabase
        .from('addresses')
        .select('id')
        .eq('user_id', userId)
        .eq('is_default', true)
        .limit(1)
        .maybeSingle();
      let addressId = defAddr?.id as string | undefined;
      if (!addressId) {
        const { data: latest } = await supabase
          .from('addresses')
          .select('id')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        addressId = latest?.id as string | undefined;
      }
      if (addressId) {
        await (supabase as any)
          .from('addresses')
          .update({ latitude: pos.lat, longitude: pos.lon })
          .eq('id', addressId);
      }
    },
    onSuccess: () => {
      toast.success('Location saved');
      queryClient.invalidateQueries({ queryKey: ['profile-location', userId] });
      queryClient.invalidateQueries({ queryKey: ['addresses', userId] });
    },
    onError: (e: any) => toast.error(e?.message || 'Failed to save location'),
  });

  if (isLoading || !userProfile) return <p className="text-sm text-muted-foreground">Loading…</p>;
  const hasLoc = userProfile.latitude != null && userProfile.longitude != null;

  return (
    <div className="flex items-center justify-between">
      <div className="text-sm">
        <div className="font-medium">Status: {hasLoc ? 'Location set' : 'Not set'}</div>
        {hasLoc ? (
          <div className="text-xs text-muted-foreground">
            Lat: {userProfile.latitude} • Lon: {userProfile.longitude}
            <br />
            <span className="text-green-600">✓ Ready for delivery tracking</span>
          </div>
        ) : (
          <div className="text-xs text-muted-foreground">Set your current GPS for accurate delivery</div>
        )}
      </div>
      <Button size="sm" onClick={() => setLocation.mutate()} disabled={setLocation.isPending} title="Update your current location">
        {hasLoc ? 'Update Location' : 'Set Current Location'}
      </Button>
    </div>
  );
}
