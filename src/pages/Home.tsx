import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { ShoppingBag, TrendingUp, Shield, Truck } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Navbar } from '@/components/Navbar';

const Home = () => {
  const { data: featuredProducts } = useQuery({
    queryKey: ['featured-products'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*, vendors(business_name), categories(name)')
        .eq('is_approved', true)
        .eq('is_active', true)
        .limit(6);
      
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      {/* Hero Section */}
      <section className="relative bg-gradient-hero text-white py-24 px-4">
        <div className="container mx-auto text-center">
          <h1 className="text-5xl md:text-6xl font-bold mb-6">
            Shop Smart, Live Better
          </h1>
          <p className="text-xl md:text-2xl mb-8 text-white/90 max-w-2xl mx-auto">
            Discover quality products from trusted vendors. Fast delivery, secure payments, unbeatable prices.
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <Link to="/products">
              <Button size="lg" variant="secondary" className="shadow-primary">
                <ShoppingBag className="mr-2 h-5 w-5" />
                Browse Products
              </Button>
            </Link>
            <Link to="/categories">
              <Button size="lg" variant="outline" className="bg-white/10 border-white/20 text-white hover:bg-white/20">
                View Categories
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 px-4 bg-muted/50">
        <div className="container mx-auto">
          <div className="grid md:grid-cols-3 gap-8">
            <Card className="text-center border-none shadow-md">
              <CardHeader>
                <div className="mx-auto p-3 bg-primary/10 rounded-full w-fit mb-4">
                  <TrendingUp className="h-8 w-8 text-primary" />
                </div>
                <CardTitle>Best Prices</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Competitive pricing from multiple vendors ensures you always get the best deal
                </p>
              </CardContent>
            </Card>

            <Card className="text-center border-none shadow-md">
              <CardHeader>
                <div className="mx-auto p-3 bg-secondary/10 rounded-full w-fit mb-4">
                  <Shield className="h-8 w-8 text-secondary" />
                </div>
                <CardTitle>Secure Payments</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Your transactions are protected with industry-standard security
                </p>
              </CardContent>
            </Card>

            <Card className="text-center border-none shadow-md">
              <CardHeader>
                <div className="mx-auto p-3 bg-primary/10 rounded-full w-fit mb-4">
                  <Truck className="h-8 w-8 text-primary" />
                </div>
                <CardTitle>Fast Delivery</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Track your orders in real-time with our reliable delivery network
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Featured Products */}
      <section className="py-16 px-4">
        <div className="container mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Featured Products</h2>
            <p className="text-muted-foreground text-lg">
              Handpicked selections from our top vendors
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {featuredProducts?.map((product) => (
              <Card key={product.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                <CardHeader className="p-0">
                  <div className="aspect-square bg-gradient-card flex items-center justify-center">
                    {product.image_url ? (
                      <img src={product.image_url} alt={product.name} className="object-cover w-full h-full" />
                    ) : (
                      <ShoppingBag className="h-24 w-24 text-muted-foreground/50" />
                    )}
                  </div>
                </CardHeader>
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground mb-1">{product.categories?.name}</p>
                  <CardTitle className="text-lg mb-2 line-clamp-1">{product.name}</CardTitle>
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                    {product.description || 'No description available'}
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-bold text-primary">₹{product.price}</span>
                    <span className="text-xs text-muted-foreground">/{product.unit}</span>
                  </div>
                </CardContent>
                <CardFooter className="p-4 pt-0">
                  <Link to={`/products/${product.id}`} className="w-full">
                    <Button className="w-full">View Details</Button>
                  </Link>
                </CardFooter>
              </Card>
            ))}
          </div>

          <div className="text-center mt-12">
            <Link to="/products">
              <Button size="lg" variant="outline">View All Products</Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;
