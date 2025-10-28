import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
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
  const location = useLocation();
  const queryClient = useQueryClient();
  const [paymentMethod, setPaymentMethod] = useState<'cod' | 'online'>('cod');
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);

  const buyNowItems = (location.state as any)?.buyNow as Array<{ product: { id: string; name: string; price: number }, quantity: number }> | undefined;

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
        .eq('user_id', user.id)
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Set default address when addresses load
  useEffect(() => {
    if (addresses && addresses.length > 0 && !selectedAddressId) {
      const defaultAddress = addresses.find((a: any) => a.is_default) || addresses[0];
      setSelectedAddressId(defaultAddress.id);
    }
  }, [addresses, selectedAddressId]);

  const computedItems = buyNowItems
    ? buyNowItems.map((bi, idx) => ({ id: `buy-${idx}`, products: bi.product, quantity: bi.quantity }))
    : (cartItems || []);

  const subtotal = computedItems.reduce((sum, item: any) => sum + (item.products.price * item.quantity), 0) || 0;

  const placeCodOrder = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Not authenticated');
      if (!computedItems || computedItems.length === 0) throw new Error('No items');
      if (!addresses || addresses.length === 0) throw new Error('No address');

      const selectedAddress = addresses.find((a: any) => a.id === selectedAddressId);
      if (!selectedAddress) throw new Error('No address selected');
      
      console.log('Available addresses:', addresses);
      console.log('Selected address for order:', selectedAddress);
      
      const orderPayload = {
        user_id: user.id,
        address_id: selectedAddress.id,
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

      const items = computedItems.map((ci: any) => ({
        order_id: order.id,
        product_id: ci.products.id,
        snapshot_name: ci.products.name,
        snapshot_price: ci.products.price,
        quantity: ci.quantity,
      }));
      const { error: itemsErr } = await supabase.from('order_items').insert(items);
      if (itemsErr) throw itemsErr;

      if (!buyNowItems) {
        const { error: clearErr } = await supabase
          .from('cart_items')
          .delete()
          .eq('user_id', user.id);
        if (clearErr) throw clearErr;
      }
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

  if (!buyNowItems && (!cartItems || cartItems.length === 0)) {
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
      
      <div className="container mx-auto px-2 sm:px-4 py-4 sm:py-6 md:py-8">
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4 sm:mb-6 md:mb-8">Checkout</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 md:gap-8">
          <div className="lg:col-span-2 space-y-4 sm:space-y-6">
            <Card className="p-3 sm:p-4 md:p-6">
              <h2 className="text-lg sm:text-xl md:text-2xl font-bold mb-3 sm:mb-4">Delivery Address</h2>
              {addresses && addresses.length > 0 ? (
                <div className="space-y-2 sm:space-y-3">
                  {addresses.map((addr) => (
                    <div 
                      key={addr.id} 
                      className={`p-3 sm:p-4 border rounded-lg cursor-pointer transition-all duration-200 ${
                        selectedAddressId === addr.id 
                          ? 'border-primary bg-primary/5 ring-2 ring-primary/20' 
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                      onClick={() => setSelectedAddressId(addr.id)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-semibold text-sm sm:text-base">{addr.label}</p>
                            {addr.is_default && (
                              <span className="text-xs bg-primary text-primary-foreground px-2 py-1 rounded-full">
                                Default
                              </span>
                            )}
                          </div>
                          <p className="text-xs sm:text-sm text-muted-foreground break-words">{addr.full_address}</p>
                          <p className="text-xs sm:text-sm text-muted-foreground">{addr.city}, {addr.state} - {addr.pincode}</p>
                          <p className="text-xs sm:text-sm text-muted-foreground">Phone: {addr.phone}</p>
                        </div>
                        <div className="ml-2">
                          <div className={`w-4 h-4 rounded-full border-2 ${
                            selectedAddressId === addr.id 
                              ? 'border-primary bg-primary' 
                              : 'border-gray-300'
                          }`}>
                            {selectedAddressId === addr.id && (
                              <div className="w-full h-full rounded-full bg-white scale-50"></div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4 sm:py-6">
                  <p className="text-muted-foreground mb-3 sm:mb-4 text-sm sm:text-base">No delivery address found</p>
                  <Button onClick={() => navigate('/profile')} className="w-full sm:w-auto">Add Address</Button>
                </div>
              )}
            </Card>

            <Card className="p-3 sm:p-4 md:p-6">
              <h2 className="text-lg sm:text-xl md:text-2xl font-bold mb-3 sm:mb-4">Order Items</h2>
              <div className="space-y-2 sm:space-y-3">
                {cartItems?.map((item) => (
                  <div key={item.id} className="flex items-center gap-2 sm:gap-4 p-2 sm:p-3 border rounded-lg">
                    <Package className="h-6 w-6 sm:h-8 sm:w-8 text-muted-foreground flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm sm:text-base break-words">{item.products.name}</p>
                      <p className="text-xs sm:text-sm text-muted-foreground">Quantity: {item.quantity}</p>
                    </div>
                    <span className="font-bold text-sm sm:text-base whitespace-nowrap">₹{(item.products.price * item.quantity).toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          <div className="lg:order-last">
            <Card className="p-3 sm:p-4 md:p-6 sticky top-20">
              <h2 className="text-lg sm:text-xl md:text-2xl font-bold mb-3 sm:mb-4">Payment Summary</h2>
              
              <div className="space-y-2 mb-3 sm:mb-4">
                <div className="flex justify-between text-sm sm:text-base">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-semibold">₹{subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm sm:text-base">
                  <span className="text-muted-foreground">Delivery Fee</span>
                  <span className="font-semibold">₹0.00</span>
                </div>
                <div className="flex justify-between text-sm sm:text-base">
                  <span className="text-muted-foreground">Tax</span>
                  <span className="font-semibold">₹0.00</span>
                </div>
              </div>

              <div className="border-t pt-3 sm:pt-4 mb-3 sm:mb-4">
                <div className="flex justify-between text-base sm:text-lg font-bold">
                  <span>Total</span>
                  <span className="text-primary">₹{subtotal.toFixed(2)}</span>
                </div>
              </div>

              <div className="space-y-2 sm:space-y-3 mb-4 sm:mb-6">
                <h3 className="font-semibold text-sm sm:text-base">Payment Method</h3>
                <label className="flex items-center gap-2 text-xs sm:text-sm">
                  <input
                    type="radio"
                    name="payment"
                    checked={paymentMethod === 'cod'}
                    onChange={() => setPaymentMethod('cod')}
                  />
                  Cash on Delivery (COD)
                </label>
                <label className="flex items-center gap-2 text-xs sm:text-sm">
                  <input
                    type="radio"
                    name="payment"
                    checked={paymentMethod === 'online'}
                    onChange={() => setPaymentMethod('online')}
                  />
                  Online Payment (Razorpay)
                </label>
              </div>

              <Button size="lg" className="w-full text-sm sm:text-base" onClick={handlePlaceOrder}>
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
