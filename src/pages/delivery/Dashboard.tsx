import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { Navbar } from '@/components/Navbar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Truck, Package } from 'lucide-react';

const DeliveryDashboard = () => {
  const { userRoles } = useAuth();
  const navigate = useNavigate();

  if (!userRoles.includes('delivery')) {
    navigate('/');
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold mb-8">Delivery Dashboard</h1>
        <div className="grid md:grid-cols-2 gap-6">
          <Card><CardHeader><Package className="h-8 w-8 text-primary mb-2" /><CardTitle>Assigned Orders</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold">-</p></CardContent></Card>
          <Card><CardHeader><Truck className="h-8 w-8 text-primary mb-2" /><CardTitle>Completed Today</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold">-</p></CardContent></Card>
        </div>
      </div>
    </div>
  );
};

export default DeliveryDashboard;
