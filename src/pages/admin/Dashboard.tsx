import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { Navbar } from '@/components/Navbar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Package, Store, Truck } from 'lucide-react';

const AdminDashboard = () => {
  const { userRoles } = useAuth();
  const navigate = useNavigate();

  if (!userRoles.includes('admin')) {
    navigate('/');
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold mb-8">Admin Dashboard</h1>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card><CardHeader><Users className="h-8 w-8 text-primary mb-2" /><CardTitle>Users</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold">-</p></CardContent></Card>
          <Card><CardHeader><Package className="h-8 w-8 text-primary mb-2" /><CardTitle>Products</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold">-</p></CardContent></Card>
          <Card><CardHeader><Store className="h-8 w-8 text-primary mb-2" /><CardTitle>Vendors</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold">-</p></CardContent></Card>
          <Card><CardHeader><Truck className="h-8 w-8 text-primary mb-2" /><CardTitle>Orders</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold">-</p></CardContent></Card>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
