import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { sessionNamespace } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Store } from 'lucide-react';
import { z } from 'zod';

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

const signupSchema = loginSchema.extend({
  fullName: z.string().min(2, 'Full name must be at least 2 characters'),
  phone: z.string().optional(),
});

const Auth = () => {
  const { user, userRoles, signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  
  const [loginData, setLoginData] = useState({ email: '', password: '' });
  const [signupData, setSignupData] = useState({ email: '', password: '', fullName: '', phone: '' });
  const [errors, setErrors] = useState<any>({});

  useEffect(() => {
    if (!user) return;
    // Namespace-aware redirect when already signed in
    if (sessionNamespace === 'admin') {
      const isAdmin = userRoles.includes('admin');
      if (isAdmin) navigate('/admin');
      return;
    }
    if (sessionNamespace === 'vendor') {
      const isVendor = userRoles.includes('vendor');
      if (isVendor) navigate('/vendor');
      return;
    }
    navigate('/');
  }, [user, userRoles, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    
    const result = loginSchema.safeParse(loginData);
    if (!result.success) {
      const fieldErrors: any = {};
      result.error.errors.forEach((err) => {
        if (err.path[0]) fieldErrors[err.path[0]] = err.message;
      });
      setErrors(fieldErrors);
      return;
    }

    setLoading(true);
    await signIn(loginData.email, loginData.password);
    setLoading(false);
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    
    const result = signupSchema.safeParse(signupData);
    if (!result.success) {
      const fieldErrors: any = {};
      result.error.errors.forEach((err) => {
        if (err.path[0]) fieldErrors[err.path[0]] = err.message;
      });
      setErrors(fieldErrors);
      return;
    }

    setLoading(true);
    await signUp(signupData.email, signupData.password, signupData.fullName, signupData.phone);
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-hero p-2 sm:p-4">
      <Card className="w-full max-w-sm sm:max-w-md shadow-lg">
        <CardHeader className="space-y-1 text-center p-4 sm:p-6">
          <div className="flex justify-center mb-3 sm:mb-4">
            <div className="p-2 sm:p-3 bg-primary/10 rounded-full">
              <Store className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
            </div>
          </div>
          <CardTitle className="text-xl sm:text-2xl font-bold">Welcome to Kash.it</CardTitle>
          <CardDescription className="text-sm sm:text-base">Sign in to your account or create a new one</CardDescription>
          {sessionNamespace === 'vendor' && user && !userRoles.includes('vendor') && (
            <div className="mt-2 text-xs sm:text-sm text-destructive">This account does not have the vendor role. Please contact support.</div>
          )}
          {sessionNamespace === 'admin' && user && !userRoles.includes('admin') && (
            <div className="mt-2 text-xs sm:text-sm text-destructive">This account does not have the admin role.</div>
          )}
        </CardHeader>
        <CardContent className="p-4 sm:p-6">
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2 h-9 sm:h-10">
              <TabsTrigger value="login" className="text-xs sm:text-sm">Login</TabsTrigger>
              <TabsTrigger value="signup" className="text-xs sm:text-sm">Sign Up</TabsTrigger>
            </TabsList>
            
            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-3 sm:space-y-4">
                <div className="space-y-1 sm:space-y-2">
                  <Label htmlFor="login-email" className="text-sm">Email</Label>
                  <Input
                    id="login-email"
                    type="email"
                    placeholder="you@example.com"
                    value={loginData.email}
                    onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                    required
                    className="text-sm sm:text-base"
                  />
                  {errors.email && <p className="text-xs sm:text-sm text-destructive">{errors.email}</p>}
                </div>
                <div className="space-y-1 sm:space-y-2">
                  <Label htmlFor="login-password" className="text-sm">Password</Label>
                  <Input
                    id="login-password"
                    type="password"
                    value={loginData.password}
                    onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                    required
                    className="text-sm sm:text-base"
                  />
                  {errors.password && <p className="text-xs sm:text-sm text-destructive">{errors.password}</p>}
                </div>
                <Button type="submit" className="w-full text-sm sm:text-base" disabled={loading}>
                  {loading ? 'Signing in...' : 'Sign In'}
                </Button>
              </form>
            </TabsContent>
            
            <TabsContent value="signup">
              <form onSubmit={handleSignup} className="space-y-3 sm:space-y-4">
                <div className="space-y-1 sm:space-y-2">
                  <Label htmlFor="signup-name" className="text-sm">Full Name</Label>
                  <Input
                    id="signup-name"
                    type="text"
                    placeholder="John Doe"
                    value={signupData.fullName}
                    onChange={(e) => setSignupData({ ...signupData, fullName: e.target.value })}
                    required
                    className="text-sm sm:text-base"
                  />
                  {errors.fullName && <p className="text-xs sm:text-sm text-destructive">{errors.fullName}</p>}
                </div>
                <div className="space-y-1 sm:space-y-2">
                  <Label htmlFor="signup-email" className="text-sm">Email</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="you@example.com"
                    value={signupData.email}
                    onChange={(e) => setSignupData({ ...signupData, email: e.target.value })}
                    required
                    className="text-sm sm:text-base"
                  />
                  {errors.email && <p className="text-xs sm:text-sm text-destructive">{errors.email}</p>}
                </div>
                <div className="space-y-1 sm:space-y-2">
                  <Label htmlFor="signup-phone" className="text-sm">Phone (Optional)</Label>
                  <Input
                    id="signup-phone"
                    type="tel"
                    placeholder="+1234567890"
                    value={signupData.phone}
                    onChange={(e) => setSignupData({ ...signupData, phone: e.target.value })}
                    className="text-sm sm:text-base"
                  />
                </div>
                <div className="space-y-1 sm:space-y-2">
                  <Label htmlFor="signup-password" className="text-sm">Password</Label>
                  <Input
                    id="signup-password"
                    type="password"
                    value={signupData.password}
                    onChange={(e) => setSignupData({ ...signupData, password: e.target.value })}
                    required
                    className="text-sm sm:text-base"
                  />
                  {errors.password && <p className="text-xs sm:text-sm text-destructive">{errors.password}</p>}
                </div>
                <Button type="submit" variant="secondary" className="w-full text-sm sm:text-base" disabled={loading}>
                  {loading ? 'Creating account...' : 'Create Account'}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
