import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
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
  const queryClient = useQueryClient();
  const [paymentMethod, setPaymentMethod] = useState<'cod' | 'online'>('cod');

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

  const placeCodOrder = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Not authenticated');
      if (!cartItems || cartItems.length === 0) throw new Error('Cart empty');
      if (!addresses || addresses.length === 0) throw new Error('No address');

      const defaultAddress = addresses.find((a: any) => a.is_default) || addresses[0];
      console.log('Available addresses:', addresses);
      console.log('Selected address for order:', defaultAddress);
      
      const orderPayload = {
        user_id: user.id,
        address_id: defaultAddress.id,
        subtotal: Number(subtotal.toFixed(2)),
        discount_amount: 0,
        final_amount: Number(subtotal.toFixed(2)),
        payment_status: 'pending',
        payment_id: 'COD',
        delivery_status: 'pending',
      } as const;

      const { data: order, error: orderErr } = await supabase
        .from('orders')
        .insert(orderPayload)
        .select('id')
        .single();
      if (orderErr) throw orderErr;

      const items = cartItems.map((ci: any) => ({
        order_id: order.id,
        product_id: ci.products.id,
        snapshot_name: ci.products.name,
        snapshot_price: ci.products.price,
        quantity: ci.quantity,
      }));
      const { error: itemsErr } = await supabase.from('order_items').insert(items);
      if (itemsErr) throw itemsErr;

      const { error: clearErr } = await supabase
        .from('cart_items')
        .delete()
        .eq('user_id', user.id);
      if (clearErr) throw clearErr;
    },
    onSuccess: () => {
      toast.success('Order placed successfully (COD)');
      queryClient.invalidateQueries({ queryKey: ['cart', user?.id] });
      navigate('/orders');
    },
    onError: (e: any) => toast.error(e?.message || 'Failed to place order'),
  });

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
    if (paymentMethod === 'cod') {
      placeCodOrder.mutate();
    } else {
      toast.info('Online payment coming soon');
    }
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

              <div className="border-t pt-4 mb-4">
                <div className="flex justify-between text-lg font-bold">
                  <span>Total</span>
                  <span className="text-primary">₹{subtotal.toFixed(2)}</span>
                </div>
              </div>

              <div className="space-y-3 mb-6">
                <h3 className="font-semibold">Payment Method</h3>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="payment"
                    checked={paymentMethod === 'cod'}
                    onChange={() => setPaymentMethod('cod')}
                  />
                  Cash on Delivery (COD)
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="payment"
                    checked={paymentMethod === 'online'}
                    onChange={() => setPaymentMethod('online')}
                  />
                  Online Payment (Razorpay)
                </label>
              </div>

              <Button size="lg" className="w-full" onClick={handlePlaceOrder}>
                {paymentMethod === 'cod' ? (placeCodOrder.isPending ? 'Placing…' : 'Place Order (COD)') : 'Place Order (Online)'}
              </Button>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Checkout;
