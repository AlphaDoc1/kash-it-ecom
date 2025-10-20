import { Link, useNavigate } from 'react-router-dom';
import { ShoppingCart, User, LogOut, Store, Package, Truck, Shield, Menu, X } from 'lucide-react';
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
import { useState } from 'react';

export const Navbar = () => {
  const { user, signOut, userRoles } = useAuth();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const isAdmin = userRoles.includes('admin');
  const isVendor = userRoles.includes('vendor');
  const isDelivery = userRoles.includes('delivery');

  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-2 sm:px-4">
        <div className="flex h-14 sm:h-16 items-center justify-between">
          <Link to="/" className="flex items-center space-x-1 sm:space-x-2">
            <Store className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
            <span className="text-lg sm:text-xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              Kash.it
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-2 lg:space-x-4">
            <Link to="/products">
              <Button variant="ghost" size="sm" className="text-sm">Products</Button>
            </Link>
            <Link to="/categories">
              <Button variant="ghost" size="sm" className="text-sm">Categories</Button>
            </Link>

            {user ? (
              <>
                <Link to="/cart">
                  <Button variant="ghost" size="icon" className="h-8 w-8 sm:h-9 sm:w-9">
                    <ShoppingCart className="h-4 w-4 sm:h-5 sm:w-5" />
                  </Button>
                </Link>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 sm:h-9 sm:w-9">
                      <User className="h-4 w-4 sm:h-5 sm:w-5" />
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
                        <Badge variant="destructive" className="ml-auto text-xs">Admin</Badge>
                      </DropdownMenuItem>
                    )}
                    
                    {isVendor && (
                      <DropdownMenuItem onClick={() => navigate('/vendor')}>
                        <Store className="mr-2 h-4 w-4" />
                        Vendor Panel
                        <Badge variant="secondary" className="ml-auto text-xs">Vendor</Badge>
                      </DropdownMenuItem>
                    )}
                    
                    {isDelivery && (
                      <DropdownMenuItem onClick={() => navigate('/delivery')}>
                        <Truck className="mr-2 h-4 w-4" />
                        Delivery Panel
                        <Badge className="ml-auto bg-primary text-xs">Delivery</Badge>
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
                <Button size="sm" className="text-sm">Sign In</Button>
              </Link>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center space-x-2">
            {user && (
              <Link to="/cart">
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <ShoppingCart className="h-4 w-4" />
                </Button>
              </Link>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="h-8 w-8"
            >
              {isMobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-t bg-background/95 backdrop-blur">
            <div className="px-2 py-3 space-y-1">
              <Link to="/products" onClick={() => setIsMobileMenuOpen(false)}>
                <Button variant="ghost" className="w-full justify-start text-sm">
                  Products
                </Button>
              </Link>
              <Link to="/categories" onClick={() => setIsMobileMenuOpen(false)}>
                <Button variant="ghost" className="w-full justify-start text-sm">
                  Categories
                </Button>
              </Link>
              
              {user ? (
                <>
                  <Link to="/profile" onClick={() => setIsMobileMenuOpen(false)}>
                    <Button variant="ghost" className="w-full justify-start text-sm">
                      <User className="mr-2 h-4 w-4" />
                      Profile
                    </Button>
                  </Link>
                  <Link to="/orders" onClick={() => setIsMobileMenuOpen(false)}>
                    <Button variant="ghost" className="w-full justify-start text-sm">
                      <Package className="mr-2 h-4 w-4" />
                      My Orders
                    </Button>
                  </Link>
                  
                  {isAdmin && (
                    <Button 
                      variant="ghost" 
                      className="w-full justify-start text-sm"
                      onClick={() => { navigate('/admin'); setIsMobileMenuOpen(false); }}
                    >
                      <Shield className="mr-2 h-4 w-4" />
                      Admin Panel
                      <Badge variant="destructive" className="ml-auto text-xs">Admin</Badge>
                    </Button>
                  )}
                  
                  {isVendor && (
                    <Button 
                      variant="ghost" 
                      className="w-full justify-start text-sm"
                      onClick={() => { navigate('/vendor'); setIsMobileMenuOpen(false); }}
                    >
                      <Store className="mr-2 h-4 w-4" />
                      Vendor Panel
                      <Badge variant="secondary" className="ml-auto text-xs">Vendor</Badge>
                    </Button>
                  )}
                  
                  {isDelivery && (
                    <Button 
                      variant="ghost" 
                      className="w-full justify-start text-sm"
                      onClick={() => { navigate('/delivery'); setIsMobileMenuOpen(false); }}
                    >
                      <Truck className="mr-2 h-4 w-4" />
                      Delivery Panel
                      <Badge className="ml-auto bg-primary text-xs">Delivery</Badge>
                    </Button>
                  )}
                  
                  <Button 
                    variant="ghost" 
                    className="w-full justify-start text-sm text-destructive"
                    onClick={() => { signOut(); setIsMobileMenuOpen(false); }}
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Logout
                  </Button>
                </>
              ) : (
                <Link to="/auth" onClick={() => setIsMobileMenuOpen(false)}>
                  <Button className="w-full text-sm">Sign In</Button>
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};
