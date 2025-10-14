import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { Navbar } from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Package } from 'lucide-react';
import { toast } from 'sonner';

const Checkout = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: cartItems } = useQuery({
    queryKey: ['cart', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('cart_items')
        .select('*, products(*)')
        .eq('user_id', user.id);
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: addresses } = useQuery({
    queryKey: ['addresses', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('addresses')
        .select('*')
        .eq('user_id', user.id);
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const subtotal = cartItems?.reduce((sum, item) => sum + (item.products.price * item.quantity), 0) || 0;

  if (!user) {
    navigate('/auth');
    return null;
  }

  if (!cartItems || cartItems.length === 0) {
    navigate('/cart');
    return null;
  }

  const handlePlaceOrder = async () => {
    if (!addresses || addresses.length === 0) {
      toast.error('Please add a delivery address first');
      navigate('/profile');
      return;
    }

    toast.info('Payment integration coming soon! This is a demo checkout.');
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold mb-8">Checkout</h1>

        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <Card className="p-6">
              <h2 className="text-2xl font-bold mb-4">Delivery Address</h2>
              {addresses && addresses.length > 0 ? (
                <div className="space-y-3">
                  {addresses.map((addr) => (
                    <div key={addr.id} className="p-4 border rounded-lg">
                      <p className="font-semibold">{addr.label}</p>
                      <p className="text-sm text-muted-foreground">{addr.full_address}</p>
                      <p className="text-sm text-muted-foreground">{addr.city}, {addr.state} - {addr.pincode}</p>
                      <p className="text-sm text-muted-foreground">Phone: {addr.phone}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6">
                  <p className="text-muted-foreground mb-4">No delivery address found</p>
                  <Button onClick={() => navigate('/profile')}>Add Address</Button>
                </div>
              )}
            </Card>

            <Card className="p-6">
              <h2 className="text-2xl font-bold mb-4">Order Items</h2>
              <div className="space-y-3">
                {cartItems?.map((item) => (
                  <div key={item.id} className="flex items-center gap-4 p-3 border rounded-lg">
                    <Package className="h-8 w-8 text-muted-foreground" />
                    <div className="flex-1">
                      <p className="font-semibold">{item.products.name}</p>
                      <p className="text-sm text-muted-foreground">Quantity: {item.quantity}</p>
                    </div>
                    <span className="font-bold">₹{(item.products.price * item.quantity).toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          <div>
            <Card className="p-6 sticky top-20">
              <h2 className="text-2xl font-bold mb-4">Payment Summary</h2>
              
              <div className="space-y-2 mb-4">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-semibold">₹{subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Delivery Fee</span>
                  <span className="font-semibold">₹0.00</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tax</span>
                  <span className="font-semibold">₹0.00</span>
                </div>
              </div>

              <div className="border-t pt-4 mb-6">
                <div className="flex justify-between text-lg font-bold">
                  <span>Total</span>
                  <span className="text-primary">₹{subtotal.toFixed(2)}</span>
                </div>
              </div>

              <Button size="lg" className="w-full" onClick={handlePlaceOrder}>
                Place Order
              </Button>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Checkout;
