import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Navbar } from '@/components/Navbar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Truck } from 'lucide-react';
import { toast } from 'sonner';

const DeliveryRegister = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    full_name: '',
    email: '',
    phone: '',
    password: '',
    vehicle_type: '',
    vehicle_number: '',
  });

  const apply = useMutation({
    mutationFn: async () => {
      const email = form.email.trim().toLowerCase();
      const fullName = form.full_name.trim();
      // 1) Create auth account so credentials are fixed; user won't have delivery access until approved
      const { error: signUpErr } = await supabase.auth.signUp({
        email,
        password: form.password,
        options: {
          data: { full_name: fullName, phone: form.phone.trim() || null },
          emailRedirectTo: `${window.location.origin}/auth`,
        },
      });
      if (signUpErr) throw signUpErr;

      // 2) Submit application
      const { error: appErr } = await (supabase as any)
        .from('delivery_applications')
        .insert({
          full_name: fullName,
          email,
          phone: form.phone.trim(),
          vehicle_type: form.vehicle_type.trim() || null,
          vehicle_number: form.vehicle_number.trim() || null,
        });
      if (appErr) throw appErr;

      // 3) Sign out if auto-logged-in to avoid session collisions
      await supabase.auth.signOut();
    },
    onSuccess: async () => {
      toast.success('Application submitted. Check your email. You can log in after admin approval.');
      navigate('/');
    },
    onError: (e: any) => toast.error(e?.message || 'Failed to submit application'),
  });

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8 max-w-xl">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Truck className="h-6 w-6 text-primary" />
              <CardTitle>Delivery Partner Registration</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium">Full Name</label>
              <Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
            </div>
            <div>
              <label className="text-sm font-medium">Email</label>
              <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div>
              <label className="text-sm font-medium">Phone</label>
              <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div>
              <label className="text-sm font-medium">Password</label>
              <Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Vehicle Type</label>
                <Input value={form.vehicle_type} onChange={(e) => setForm({ ...form, vehicle_type: e.target.value })} placeholder="Bike / Scooter / Car" />
              </div>
              <div>
                <label className="text-sm font-medium">Vehicle Number</label>
                <Input value={form.vehicle_number} onChange={(e) => setForm({ ...form, vehicle_number: e.target.value })} />
              </div>
            </div>
            <Button
              onClick={() => apply.mutate()}
              disabled={apply.isPending || !form.full_name || !form.email || !form.password}
            >
              {apply.isPending ? 'Submitting…' : 'Submit Application'}
            </Button>
            <p className="text-xs text-muted-foreground">After approval, you will receive instructions to log in.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DeliveryRegister;


