import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Navbar } from '@/components/Navbar';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ShoppingBag, Search } from 'lucide-react';

const Products = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  // Initialize category filter from URL query (?category=ID)
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const categoryFromUrl = params.get('category');
    if (categoryFromUrl) {
      setCategoryFilter(categoryFromUrl);
    } else {
      setCategoryFilter('all');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search]);

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('is_active', true);
      if (error) throw error;
      return data;
    },
  });

  const { data: products, isLoading } = useQuery({
    queryKey: ['products', categoryFilter, search],
    queryFn: async () => {
      let query = supabase
        .from('products')
        .select('*, vendors(business_name), categories(name)')
        .eq('is_approved', true)
        .eq('is_active', true);

      if (categoryFilter !== 'all') {
        query = query.eq('category_id', categoryFilter);
      }

      if (search) {
        query = query.ilike('name', `%${search}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="container mx-auto px-2 sm:px-4 py-4 sm:py-6 md:py-8">
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4 sm:mb-6 md:mb-8">Products</h1>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-6 sm:mb-8">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search products..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 text-sm sm:text-base"
            />
          </div>
          <Select
            value={categoryFilter}
            onValueChange={(value) => {
              setCategoryFilter(value);
              const params = new URLSearchParams(location.search);
              if (value === 'all') {
                params.delete('category');
              } else {
                params.set('category', value);
              }
              navigate({ pathname: '/products', search: params.toString() });
            }}
          >
            <SelectTrigger className="w-full sm:w-48 md:w-64">
              <SelectValue placeholder="Filter by category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories?.map((cat) => (
                <SelectItem key={cat.id} value={cat.id}>
                  {cat.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

            {/* Products Grid */}
            {isLoading ? (
              <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
                {[...Array(8)].map((_, i) => (
                  <Card key={i} className="animate-pulse">
                    <div className="aspect-square bg-muted" />
                    <CardContent className="p-3 sm:p-4 space-y-2">
                      <div className="h-3 sm:h-4 bg-muted rounded" />
                      <div className="h-3 sm:h-4 bg-muted rounded w-2/3" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : products && products.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
                {products.map((product) => (
              <Card key={product.id} className="overflow-hidden hover:shadow-lg transition-shadow h-full flex flex-col">
                <CardHeader className="p-0">
                  <div className="aspect-square bg-gradient-card flex items-center justify-center">
                    {product.image_url ? (
                      <img src={product.image_url} alt={product.name} className="object-cover w-full h-full" />
                    ) : (
                      <ShoppingBag className="h-16 w-16 sm:h-20 sm:w-20 md:h-24 md:w-24 text-muted-foreground/50" />
                    )}
                  </div>
                </CardHeader>
                <CardContent className="p-3 sm:p-4 flex-1 flex flex-col">
                  <p className="text-xs text-muted-foreground mb-1">{product.categories?.name}</p>
                  <CardTitle className="text-base sm:text-lg mb-2 line-clamp-1">{product.name}</CardTitle>
                  <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2 mb-3 flex-1">
                    {product.description || 'No description'}
                  </p>
                  <div className="flex items-center justify-between mt-auto">
                    <span className="text-lg sm:text-xl md:text-2xl font-bold text-primary">₹{product.price}</span>
                    <span className="text-xs text-muted-foreground">Stock: {product.stock}</span>
                  </div>
                </CardContent>
                <CardFooter className="p-3 sm:p-4 pt-0">
                  <Link to={`/products/${product.id}`} className="w-full">
                    <Button className="w-full text-sm sm:text-base">View Details</Button>
                  </Link>
                </CardFooter>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 sm:py-12">
            <ShoppingBag className="h-12 w-12 sm:h-16 sm:w-16 text-muted-foreground mx-auto mb-3 sm:mb-4" />
            <p className="text-lg sm:text-xl text-muted-foreground">No products found</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Products;
