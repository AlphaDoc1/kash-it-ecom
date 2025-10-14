import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { Navbar } from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ShoppingCart, Trash2, Plus, Minus } from 'lucide-react';
import { toast } from 'sonner';

const Cart = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: cartItems, isLoading } = useQuery({
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

  const updateQuantityMutation = useMutation({
    mutationFn: async ({ id, quantity }: { id: string; quantity: number }) => {
      const { error } = await supabase
        .from('cart_items')
        .update({ quantity })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
    },
  });

  const removeItemMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('cart_items')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Item removed from cart');
      queryClient.invalidateQueries({ queryKey: ['cart'] });
    },
  });

  const subtotal = cartItems?.reduce((sum, item) => sum + (item.products.price * item.quantity), 0) || 0;

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-8 text-center">
          <ShoppingCart className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-4">Please login to view your cart</h2>
          <Button onClick={() => navigate('/auth')}>Sign In</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold mb-8">Shopping Cart</h1>

        {isLoading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <Card key={i} className="animate-pulse p-6">
                <div className="h-24 bg-muted rounded" />
              </Card>
            ))}
          </div>
        ) : !cartItems || cartItems.length === 0 ? (
          <div className="text-center py-12">
            <ShoppingCart className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">Your cart is empty</h2>
            <p className="text-muted-foreground mb-6">Add some products to get started!</p>
            <Button onClick={() => navigate('/products')}>Browse Products</Button>
          </div>
        ) : (
          <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-4">
              {cartItems.map((item) => (
                <Card key={item.id} className="p-6">
                  <div className="flex gap-4">
                    <div className="w-24 h-24 bg-gradient-card rounded flex items-center justify-center flex-shrink-0">
                      {item.products.image_url ? (
                        <img src={item.products.image_url} alt={item.products.name} className="object-cover w-full h-full rounded" />
                      ) : (
                        <ShoppingCart className="h-12 w-12 text-muted-foreground/50" />
                      )}
                    </div>

                    <div className="flex-1">
                      <h3 className="font-bold text-lg mb-1">{item.products.name}</h3>
                      <p className="text-muted-foreground text-sm mb-2">₹{item.products.price} per {item.products.unit}</p>
                      
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateQuantityMutation.mutate({ id: item.id, quantity: Math.max(1, item.quantity - 1) })}
                            disabled={item.quantity <= 1}
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <Input
                            type="number"
                            value={item.quantity}
                            onChange={(e) => {
                              const val = parseInt(e.target.value) || 1;
                              updateQuantityMutation.mutate({ id: item.id, quantity: Math.max(1, Math.min(item.products.stock, val)) });
                            }}
                            className="w-16 text-center"
                          />
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateQuantityMutation.mutate({ id: item.id, quantity: Math.min(item.products.stock, item.quantity + 1) })}
                            disabled={item.quantity >= item.products.stock}
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                        
                        <span className="font-bold text-lg ml-auto">₹{(item.products.price * item.quantity).toFixed(2)}</span>
                      </div>
                    </div>

                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeItemMutation.mutate(item.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-5 w-5" />
                    </Button>
                  </div>
                </Card>
              ))}
            </div>

            <div>
              <Card className="p-6 sticky top-20">
                <h2 className="text-2xl font-bold mb-4">Order Summary</h2>
                
                <div className="space-y-2 mb-4">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span className="font-semibold">₹{subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Delivery</span>
                    <span className="font-semibold">Calculated at checkout</span>
                  </div>
                </div>

                <div className="border-t pt-4 mb-6">
                  <div className="flex justify-between text-lg font-bold">
                    <span>Total</span>
                    <span className="text-primary">₹{subtotal.toFixed(2)}</span>
                  </div>
                </div>

                <Button size="lg" className="w-full" onClick={() => navigate('/checkout')}>
                  Proceed to Checkout
                </Button>
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Cart;
