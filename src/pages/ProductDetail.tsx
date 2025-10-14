import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { Navbar } from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ShoppingBag, ShoppingCart, Store, Package } from 'lucide-react';
import { toast } from 'sonner';
import { useState } from 'react';

const ProductDetail = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [quantity, setQuantity] = useState(1);

  const { data: product, isLoading } = useQuery({
    queryKey: ['product', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*, vendors(business_name, business_description), categories(name)')
        .eq('id', id)
        .eq('is_approved', true)
        .eq('is_active', true)
        .single();
      
      if (error) throw error;
      return data;
    },
  });

  const addToCartMutation = useMutation({
    mutationFn: async () => {
      if (!user) {
        toast.error('Please login to add items to cart');
        navigate('/auth');
        return;
      }

      const { data: existing } = await supabase
        .from('cart_items')
        .select('*')
        .eq('user_id', user.id)
        .eq('product_id', id)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from('cart_items')
          .update({ quantity: existing.quantity + quantity })
          .eq('id', existing.id);
        
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('cart_items')
          .insert({ user_id: user.id, product_id: id, quantity });
        
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success('Added to cart!');
      queryClient.invalidateQueries({ queryKey: ['cart'] });
    },
    onError: (error: any) => {
      toast.error(error.message);
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <div className="animate-pulse space-y-4">
            <div className="h-96 bg-muted rounded-lg" />
            <div className="h-8 bg-muted rounded w-1/2" />
            <div className="h-4 bg-muted rounded w-3/4" />
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-8 text-center">
          <h1 className="text-2xl font-bold">Product not found</h1>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8">
        <div className="grid md:grid-cols-2 gap-8">
          {/* Product Image */}
          <Card className="overflow-hidden">
            <div className="aspect-square bg-gradient-card flex items-center justify-center">
              {product.image_url ? (
                <img src={product.image_url} alt={product.name} className="object-cover w-full h-full" />
              ) : (
                <ShoppingBag className="h-48 w-48 text-muted-foreground/50" />
              )}
            </div>
          </Card>

          {/* Product Info */}
          <div className="space-y-6">
            <div>
              <Badge variant="secondary" className="mb-2">{product.categories?.name}</Badge>
              <h1 className="text-4xl font-bold mb-2">{product.name}</h1>
              <p className="text-muted-foreground">{product.description}</p>
            </div>

            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-bold text-primary">₹{product.price}</span>
              <span className="text-muted-foreground">per {product.unit}</span>
            </div>

            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Package className="h-4 w-4" />
              <span>Stock: {product.stock} units available</span>
            </div>

            <Card className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Store className="h-4 w-4 text-primary" />
                <span className="font-semibold">Sold by</span>
              </div>
              <p className="text-lg font-bold">{product.vendors?.business_name}</p>
              {product.vendors?.business_description && (
                <p className="text-sm text-muted-foreground mt-1">
                  {product.vendors.business_description}
                </p>
              )}
            </Card>

            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <label className="text-sm font-medium">Quantity:</label>
                <Input
                  type="number"
                  min="1"
                  max={product.stock}
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, Math.min(product.stock, parseInt(e.target.value) || 1)))}
                  className="w-24"
                />
              </div>

              <Button
                size="lg"
                className="w-full"
                onClick={() => addToCartMutation.mutate()}
                disabled={addToCartMutation.isPending || product.stock === 0}
              >
                <ShoppingCart className="mr-2 h-5 w-5" />
                {product.stock === 0 ? 'Out of Stock' : 'Add to Cart'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductDetail;
