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
        <div className="container mx-auto px-2 sm:px-4 py-4 sm:py-6 md:py-8 text-center">
          <ShoppingCart className="h-12 w-12 sm:h-16 sm:w-16 text-muted-foreground mx-auto mb-3 sm:mb-4" />
          <h2 className="text-xl sm:text-2xl font-bold mb-3 sm:mb-4">Please login to view your cart</h2>
          <Button onClick={() => navigate('/auth')} className="w-full sm:w-auto">Sign In</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="container mx-auto px-2 sm:px-4 py-4 sm:py-6 md:py-8">
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4 sm:mb-6 md:mb-8">Shopping Cart</h1>

        {isLoading ? (
          <div className="space-y-3 sm:space-y-4">
            {[...Array(3)].map((_, i) => (
              <Card key={i} className="animate-pulse p-4 sm:p-6">
                <div className="h-20 sm:h-24 bg-muted rounded" />
              </Card>
            ))}
          </div>
        ) : !cartItems || cartItems.length === 0 ? (
          <div className="text-center py-8 sm:py-12">
            <ShoppingCart className="h-12 w-12 sm:h-16 sm:w-16 text-muted-foreground mx-auto mb-3 sm:mb-4" />
            <h2 className="text-xl sm:text-2xl font-bold mb-2">Your cart is empty</h2>
            <p className="text-sm sm:text-base text-muted-foreground mb-4 sm:mb-6">Add some products to get started!</p>
            <Button onClick={() => navigate('/products')} className="w-full sm:w-auto">Browse Products</Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
            <div className="lg:col-span-2 space-y-3 sm:space-y-4">
              {cartItems.map((item) => (
                <Card key={item.id} className="p-3 sm:p-4 md:p-6">
                  <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                    <div className="w-full sm:w-20 sm:h-20 md:w-24 md:h-24 bg-gradient-card rounded flex items-center justify-center flex-shrink-0 mx-auto sm:mx-0">
                      {item.products.image_url ? (
                        <img src={item.products.image_url} alt={item.products.name} className="object-cover w-full h-full rounded" />
                      ) : (
                        <ShoppingCart className="h-8 w-8 sm:h-10 sm:w-10 md:h-12 md:w-12 text-muted-foreground/50" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-base sm:text-lg mb-1 break-words">{item.products.name}</h3>
                      <p className="text-muted-foreground text-xs sm:text-sm mb-2">₹{item.products.price} per {item.products.unit}</p>
                      
                      <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateQuantityMutation.mutate({ id: item.id, quantity: Math.max(1, item.quantity - 1) })}
                            disabled={item.quantity <= 1}
                            className="h-8 w-8 p-0"
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
                            className="w-12 sm:w-16 text-center text-xs sm:text-sm"
                          />
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateQuantityMutation.mutate({ id: item.id, quantity: Math.min(item.products.stock, item.quantity + 1) })}
                            disabled={item.quantity >= item.products.stock}
                            className="h-8 w-8 p-0"
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                        
                        <div className="flex items-center justify-between sm:justify-end gap-2">
                          <span className="font-bold text-base sm:text-lg">₹{(item.products.price * item.quantity).toFixed(2)}</span>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeItemMutation.mutate(item.id)}
                            className="text-destructive hover:text-destructive h-8 w-8"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>

            <div className="lg:order-last">
              <Card className="p-4 sm:p-6 sticky top-20">
                <h2 className="text-lg sm:text-xl md:text-2xl font-bold mb-3 sm:mb-4">Order Summary</h2>
                
                <div className="space-y-2 mb-3 sm:mb-4">
                  <div className="flex justify-between text-sm sm:text-base">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span className="font-semibold">₹{subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm sm:text-base">
                    <span className="text-muted-foreground">Delivery</span>
                    <span className="font-semibold">Calculated at checkout</span>
                  </div>
                </div>

                <div className="border-t pt-3 sm:pt-4 mb-4 sm:mb-6">
                  <div className="flex justify-between text-base sm:text-lg font-bold">
                    <span>Total</span>
                    <span className="text-primary">₹{subtotal.toFixed(2)}</span>
                  </div>
                </div>

                <Button size="lg" className="w-full text-sm sm:text-base" onClick={() => navigate('/checkout')}>
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
