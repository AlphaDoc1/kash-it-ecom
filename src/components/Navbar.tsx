import { Link, useNavigate } from 'react-router-dom';
import { ShoppingCart, User, LogOut, Store, Package, Truck, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';

export const Navbar = () => {
  const { user, signOut, userRoles } = useAuth();
  const navigate = useNavigate();

  const isAdmin = userRoles.includes('admin');
  const isVendor = userRoles.includes('vendor');
  const isDelivery = userRoles.includes('delivery');

  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          <Link to="/" className="flex items-center space-x-2">
            <Store className="h-6 w-6 text-primary" />
            <span className="text-xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              Kash.it
            </span>
          </Link>

          <div className="flex items-center space-x-4">
            <Link to="/products">
              <Button variant="ghost">Products</Button>
            </Link>
            <Link to="/categories">
              <Button variant="ghost">Categories</Button>
            </Link>

            {user ? (
              <>
                <Link to="/cart">
                  <Button variant="ghost" size="icon">
                    <ShoppingCart className="h-5 w-5" />
                  </Button>
                </Link>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <User className="h-5 w-5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuItem onClick={() => navigate('/profile')}>
                      <User className="mr-2 h-4 w-4" />
                      Profile
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate('/orders')}>
                      <Package className="mr-2 h-4 w-4" />
                      My Orders
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    
                    {isAdmin && (
                      <DropdownMenuItem onClick={() => navigate('/admin')}>
                        <Shield className="mr-2 h-4 w-4" />
                        Admin Panel
                        <Badge variant="destructive" className="ml-auto">Admin</Badge>
                      </DropdownMenuItem>
                    )}
                    
                    {isVendor && (
                      <DropdownMenuItem onClick={() => navigate('/vendor')}>
                        <Store className="mr-2 h-4 w-4" />
                        Vendor Panel
                        <Badge variant="secondary" className="ml-auto">Vendor</Badge>
                      </DropdownMenuItem>
                    )}
                    
                    {isDelivery && (
                      <DropdownMenuItem onClick={() => navigate('/delivery')}>
                        <Truck className="mr-2 h-4 w-4" />
                        Delivery Panel
                        <Badge className="ml-auto bg-primary">Delivery</Badge>
                      </DropdownMenuItem>
                    )}
                    
                    {(isAdmin || isVendor || isDelivery) && <DropdownMenuSeparator />}
                    
                    <DropdownMenuItem onClick={signOut}>
                      <LogOut className="mr-2 h-4 w-4" />
                      Logout
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <Link to="/auth">
                <Button>Sign In</Button>
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};
