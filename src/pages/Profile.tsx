import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { Navbar } from '@/components/Navbar';
import { Button } from '@/components/ui/button';
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
        </div>
      </div>
    </div>
  );
};

export default Profile;
