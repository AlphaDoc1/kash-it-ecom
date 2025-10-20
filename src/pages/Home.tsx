import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import { ShoppingBag, TrendingUp, Shield, Truck, User, Package, ShoppingCart } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Navbar } from '@/components/Navbar';
import { useAuth } from '@/lib/auth';

const Home = () => {
  const { user, userRoles } = useAuth();
  
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

  const isLoggedIn = !!user;
  const isAdmin = userRoles.includes('admin');
  const isVendor = userRoles.includes('vendor');
  const isDelivery = userRoles.includes('delivery');

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      {/* Hero Section */}
      <section className="relative bg-gradient-hero text-white py-12 sm:py-16 md:py-24 px-4">
        <div className="container mx-auto text-center">
          {isLoggedIn ? (
            <>
              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-4 sm:mb-6">
                Welcome back!
              </h1>
              <p className="text-base sm:text-lg md:text-xl lg:text-2xl mb-6 sm:mb-8 text-white/90 max-w-2xl mx-auto px-2">
                {isAdmin && "Manage your platform and oversee operations."}
                {isVendor && "Manage your products and track your orders."}
                {isDelivery && "View your delivery assignments and update status."}
                {!isAdmin && !isVendor && !isDelivery && "Continue shopping and manage your orders."}
              </p>
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-center">
                <Link to="/products" className="w-full sm:w-auto">
                  <Button size="lg" variant="secondary" className="shadow-primary w-full sm:w-auto">
                    <ShoppingBag className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
                    Browse Products
                  </Button>
                </Link>
                <Link to="/orders" className="w-full sm:w-auto">
                  <Button size="lg" variant="outline" className="bg-white/10 border-white/20 text-white hover:bg-white/20 w-full sm:w-auto">
                    <Package className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
                    My Orders
                  </Button>
                </Link>
                {(isAdmin || isVendor || isDelivery) && (
                  <Link to={isAdmin ? "/admin" : isVendor ? "/vendor" : "/delivery"} className="w-full sm:w-auto">
                    <Button size="lg" variant="outline" className="bg-white/10 border-white/20 text-white hover:bg-white/20 w-full sm:w-auto">
                      <User className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
                      Dashboard
                    </Button>
                  </Link>
                )}
              </div>
            </>
          ) : (
            <>
              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-4 sm:mb-6">
                Shop Smart, Live Better
              </h1>
              <p className="text-base sm:text-lg md:text-xl lg:text-2xl mb-6 sm:mb-8 text-white/90 max-w-2xl mx-auto px-2">
                Discover quality products from trusted vendors. Fast delivery, secure payments, unbeatable prices.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-center">
                <Link to="/products" className="w-full sm:w-auto">
                  <Button size="lg" variant="secondary" className="shadow-primary w-full sm:w-auto">
                    <ShoppingBag className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
                    Browse Products
                  </Button>
                </Link>
                <Link to="/auth" className="w-full sm:w-auto">
                  <Button size="lg" variant="outline" className="bg-white/10 border-white/20 text-white hover:bg-white/20 w-full sm:w-auto">
                    <User className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
                    Get Started
                  </Button>
                </Link>
              </div>
            </>
          )}
        </div>
      </section>

      {/* Quick Actions for Logged-in Users */}
      {isLoggedIn && (
        <section className="py-6 sm:py-8 md:py-12 px-4 bg-background">
          <div className="container mx-auto">
            <h2 className="text-2xl sm:text-3xl font-bold text-center mb-6 sm:mb-8">Quick Actions</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
              <Link to="/products" className="group">
                <Card className="text-center border-none shadow-md hover:shadow-lg transition-shadow group-hover:scale-105">
                  <CardContent className="p-4 sm:p-6">
                    <ShoppingBag className="h-8 w-8 sm:h-10 sm:w-10 text-primary mx-auto mb-3" />
                    <h3 className="font-semibold text-sm sm:text-base mb-2">Browse Products</h3>
                    <p className="text-xs sm:text-sm text-muted-foreground">Discover new items</p>
                  </CardContent>
                </Card>
              </Link>
              
              <Link to="/orders" className="group">
                <Card className="text-center border-none shadow-md hover:shadow-lg transition-shadow group-hover:scale-105">
                  <CardContent className="p-4 sm:p-6">
                    <Package className="h-8 w-8 sm:h-10 sm:w-10 text-primary mx-auto mb-3" />
                    <h3 className="font-semibold text-sm sm:text-base mb-2">My Orders</h3>
                    <p className="text-xs sm:text-sm text-muted-foreground">Track your orders</p>
                  </CardContent>
                </Card>
              </Link>
              
              <Link to="/cart" className="group">
                <Card className="text-center border-none shadow-md hover:shadow-lg transition-shadow group-hover:scale-105">
                  <CardContent className="p-4 sm:p-6">
                    <ShoppingCart className="h-8 w-8 sm:h-10 sm:w-10 text-primary mx-auto mb-3" />
                    <h3 className="font-semibold text-sm sm:text-base mb-2">Shopping Cart</h3>
                    <p className="text-xs sm:text-sm text-muted-foreground">Review your items</p>
                  </CardContent>
                </Card>
              </Link>
              
              {(isAdmin || isVendor || isDelivery) && (
                <Link to={isAdmin ? "/admin" : isVendor ? "/vendor" : "/delivery"} className="group">
                  <Card className="text-center border-none shadow-md hover:shadow-lg transition-shadow group-hover:scale-105">
                    <CardContent className="p-4 sm:p-6">
                      <User className="h-8 w-8 sm:h-10 sm:w-10 text-primary mx-auto mb-3" />
                      <h3 className="font-semibold text-sm sm:text-base mb-2">Dashboard</h3>
                      <p className="text-xs sm:text-sm text-muted-foreground">
                        {isAdmin && "Admin Panel"}
                        {isVendor && "Vendor Panel"}
                        {isDelivery && "Delivery Panel"}
                      </p>
                    </CardContent>
                  </Card>
                </Link>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Features */}
      <section className="py-8 sm:py-12 md:py-16 px-4 bg-muted/50">
        <div className="container mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-6 sm:mb-8">
            {isLoggedIn ? "Why Choose Us" : "Why Choose Kash.it"}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 md:gap-8">
            <Card className="text-center border-none shadow-md">
              <CardHeader className="pb-3">
                <div className="mx-auto p-2 sm:p-3 bg-primary/10 rounded-full w-fit mb-3 sm:mb-4">
                  <TrendingUp className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
                </div>
                <CardTitle className="text-lg sm:text-xl">Best Prices</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-sm sm:text-base text-muted-foreground">
                  Competitive pricing from multiple vendors ensures you always get the best deal
                </p>
              </CardContent>
            </Card>

            <Card className="text-center border-none shadow-md">
              <CardHeader className="pb-3">
                <div className="mx-auto p-2 sm:p-3 bg-secondary/10 rounded-full w-fit mb-3 sm:mb-4">
                  <Shield className="h-6 w-6 sm:h-8 sm:w-8 text-secondary" />
                </div>
                <CardTitle className="text-lg sm:text-xl">Secure Payments</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-sm sm:text-base text-muted-foreground">
                  Your transactions are protected with industry-standard security
                </p>
              </CardContent>
            </Card>

            <Card className="text-center border-none shadow-md sm:col-span-2 lg:col-span-1">
              <CardHeader className="pb-3">
                <div className="mx-auto p-2 sm:p-3 bg-primary/10 rounded-full w-fit mb-3 sm:mb-4">
                  <Truck className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
                </div>
                <CardTitle className="text-lg sm:text-xl">Fast Delivery</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-sm sm:text-base text-muted-foreground">
                  Track your orders in real-time with our reliable delivery network
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Featured Products */}
      <section className="py-8 sm:py-12 md:py-16 px-4">
        <div className="container mx-auto">
          <div className="text-center mb-8 sm:mb-12">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-3 sm:mb-4">
              {isLoggedIn ? "Featured Products" : "Discover Our Products"}
            </h2>
            <p className="text-muted-foreground text-base sm:text-lg">
              {isLoggedIn 
                ? "Handpicked selections from our top vendors" 
                : "Quality products from trusted vendors at unbeatable prices"
              }
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
            {featuredProducts?.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>

          <div className="text-center mt-8 sm:mt-12">
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-center">
              <Link to="/products">
                <Button size="lg" variant="outline" className="w-full sm:w-auto">
                  {isLoggedIn ? "View All Products" : "Browse All Products"}
                </Button>
              </Link>
              {!isLoggedIn && (
                <Link to="/auth">
                  <Button size="lg" className="w-full sm:w-auto">
                    <User className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
                    Sign Up to Shop
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Call to Action for Non-logged-in Users */}
      {!isLoggedIn && (
        <section className="py-12 sm:py-16 md:py-20 px-4 bg-gradient-hero text-white">
          <div className="container mx-auto text-center">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4 sm:mb-6">
              Ready to Start Shopping?
            </h2>
            <p className="text-base sm:text-lg md:text-xl mb-6 sm:mb-8 text-white/90 max-w-2xl mx-auto">
              Join thousands of satisfied customers and discover amazing products at great prices.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-center">
              <Link to="/auth">
                <Button size="lg" variant="secondary" className="w-full sm:w-auto">
                  <User className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
                  Create Account
                </Button>
              </Link>
              <Link to="/products">
                <Button size="lg" variant="outline" className="bg-white/10 border-white/20 text-white hover:bg-white/20 w-full sm:w-auto">
                  <ShoppingBag className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
                  Browse Products
                </Button>
              </Link>
            </div>
          </div>
        </section>
      )}
    </div>
  );
};

export default Home;

const ProductCard = ({ product }: { product: any }) => {
  const [gallery, setGallery] = useState<Array<string> | null>(null);
  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      try {
        const { data, error } = await supabase.storage
          .from('product-images')
          .list(product.id, { sortBy: { column: 'created_at', order: 'asc' } });
        
        if (error) {
          console.error('Error loading images for product', product.id, error);
          return;
        }
        
        const images = (data || [])
          .filter((i: any) => i.name !== '.empty')
          .map((i: any) => 
            supabase.storage
              .from('product-images')
              .getPublicUrl(`${product.id}/${i.name}`)
              .data.publicUrl
          );
        
        console.log('Loaded images for product', product.id, images);
        if (isMounted) setGallery(images);
      } catch (error) {
        console.error('Error loading gallery for product', product.id, error);
        if (isMounted) setGallery(null);
      }
    };
    load();
    return () => { isMounted = false; };
  }, [product?.id]);

  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const hasGallery = gallery && gallery.length > 0;
  
  // Set the first image as selected when gallery loads
  useEffect(() => {
    if (hasGallery && !selectedImage) {
      setSelectedImage(gallery[0]);
    }
  }, [hasGallery, selectedImage, gallery]);
  
  const displayImage = selectedImage || product.image_url;
  
  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow h-full flex flex-col">
      <CardHeader className="p-0">
        <div className="aspect-square bg-gradient-card flex items-center justify-center">
          {displayImage ? (
            <img src={displayImage} alt={product.name} className="object-cover w-full h-full" />
          ) : (
            <ShoppingBag className="h-16 w-16 sm:h-20 sm:w-20 md:h-24 md:w-24 text-muted-foreground/50" />
          )}
        </div>
      </CardHeader>
      
      {/* Thumbnail images */}
      {hasGallery && gallery.length > 1 && (
        <div className="p-2 bg-muted/30">
          <div className="flex gap-1 overflow-x-auto">
            {gallery.map((src, idx) => (
              <button
                key={idx}
                onClick={() => setSelectedImage(src)}
                className={`flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12 rounded border-2 transition-all ${
                  selectedImage === src 
                    ? 'border-primary ring-2 ring-primary/20' 
                    : 'border-muted hover:border-primary/50'
                }`}
              >
                <img 
                  src={src} 
                  alt={`${product.name} angle ${idx + 1}`} 
                  className="w-full h-full object-cover rounded"
                />
              </button>
            ))}
          </div>
        </div>
      )}
      
      <CardContent className="p-3 sm:p-4 flex-1 flex flex-col">
        <p className="text-xs text-muted-foreground mb-1">{product.categories?.name}</p>
        <CardTitle className="text-base sm:text-lg mb-2 line-clamp-1">{product.name}</CardTitle>
        <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2 mb-3 flex-1">
          {product.description || 'No description available'}
        </p>
        <div className="flex items-center justify-between mt-auto">
          <span className="text-lg sm:text-xl md:text-2xl font-bold text-primary">₹{product.price}</span>
          <span className="text-xs text-muted-foreground">/{product.unit}</span>
        </div>
      </CardContent>
      <CardFooter className="p-3 sm:p-4 pt-0">
        <Link to={`/products/${product.id}`} className="w-full">
          <Button className="w-full text-sm sm:text-base">View Details</Button>
        </Link>
      </CardFooter>
    </Card>
  );
};
