import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Navbar } from '@/components/Navbar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Folder } from 'lucide-react';

const Categories = () => {
  const { data: categories, isLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('is_active', true)
        .order('name');
      
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="container mx-auto px-2 sm:px-4 py-4 sm:py-6 md:py-8">
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4 sm:mb-6 md:mb-8">Product Categories</h1>

        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
            {[...Array(8)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <div className="h-32 sm:h-40 bg-muted" />
              </Card>
            ))}
          </div>
        ) : categories && categories.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
            {categories.map((category) => (
              <Link key={category.id} to={`/products?category=${category.id}`}>
                <Card className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer group">
                  <CardHeader className="p-0">
                    <div className="h-40 bg-gradient-card flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                      {category.image_url ? (
                        <img src={category.image_url} alt={category.name} className="object-cover w-full h-full" />
                      ) : (
                        <Folder className="h-16 w-16 text-muted-foreground/50 group-hover:text-primary/70 transition-colors" />
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="p-3 sm:p-4">
                    <CardTitle className="text-sm sm:text-base md:text-lg text-center">{category.name}</CardTitle>
                    {category.description && (
                      <p className="text-xs sm:text-sm text-muted-foreground text-center mt-1 sm:mt-2 line-clamp-2">
                        {category.description}
                      </p>
                    )}
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 sm:py-12">
            <Folder className="h-12 w-12 sm:h-16 sm:w-16 text-muted-foreground mx-auto mb-3 sm:mb-4" />
            <p className="text-lg sm:text-xl text-muted-foreground">No categories available</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Categories;
