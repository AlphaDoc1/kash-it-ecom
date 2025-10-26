import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { MapPin, Save, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/lib/auth';

interface AddressFormData {
  label: string;
  full_address: string;
  city: string;
  state: string;
  pincode: string;
  phone: string;
  is_default: boolean;
  latitude?: number;
  longitude?: number;
}

interface AddressFormProps {
  address?: AddressFormData & { id: string };
  onSuccess?: () => void;
  onCancel?: () => void;
}

export const AddressForm = ({ address, onSuccess, onCancel }: AddressFormProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState<AddressFormData>({
    label: '',
    full_address: '',
    city: '',
    state: '',
    pincode: '',
    phone: '',
    is_default: false,
    latitude: undefined,
    longitude: undefined,
  });
  const [isGettingLocation, setIsGettingLocation] = useState(false);

  useEffect(() => {
    if (address) {
      setFormData({
        label: address.label,
        full_address: address.full_address,
        city: address.city,
        state: address.state,
        pincode: address.pincode,
        phone: address.phone,
        is_default: address.is_default,
        latitude: address.latitude,
        longitude: address.longitude,
      });
    }
  }, [address]);

  const getCurrentLocation = async () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by this browser');
      return;
    }

    setIsGettingLocation(true);
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000,
        });
      });

      const { latitude, longitude } = position.coords;
      setFormData(prev => ({
        ...prev,
        latitude,
        longitude,
      }));

      // Try to get address from coordinates using reverse geocoding
      try {
        const response = await fetch(
          `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`
        );
        const data = await response.json();
        
        if (data.city && data.principalSubdivision && data.postcode) {
          setFormData(prev => ({
            ...prev,
            city: data.city || prev.city,
            state: data.principalSubdivision || prev.state,
            pincode: data.postcode || prev.pincode,
            full_address: data.localityInfo?.administrative?.[0]?.name || prev.full_address,
          }));
        }
      } catch (error) {
        console.log('Reverse geocoding failed, using coordinates only');
      }

      toast.success('Location detected successfully');
    } catch (error) {
      toast.error('Failed to get current location');
    } finally {
      setIsGettingLocation(false);
    }
  };

  const saveAddress = useMutation({
    mutationFn: async (data: AddressFormData) => {
      if (!user) throw new Error('User not authenticated');

      // If setting as default, first unset any existing default
      if (data.is_default) {
        await supabase
          .from('addresses')
          .update({ is_default: false })
          .eq('user_id', user.id)
          .eq('is_default', true);
      }

      if (address) {
        // Update existing address
        const { error } = await supabase
          .from('addresses')
          .update({
            label: data.label,
            full_address: data.full_address,
            city: data.city,
            state: data.state,
            pincode: data.pincode,
            phone: data.phone,
            is_default: data.is_default,
            latitude: data.latitude,
            longitude: data.longitude,
          })
          .eq('id', address.id);
        
        if (error) throw error;
      } else {
        // Create new address
        const { error } = await supabase
          .from('addresses')
          .insert({
            user_id: user.id,
            label: data.label,
            full_address: data.full_address,
            city: data.city,
            state: data.state,
            pincode: data.pincode,
            phone: data.phone,
            is_default: data.is_default,
            latitude: data.latitude,
            longitude: data.longitude,
          });
        
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(address ? 'Address updated successfully' : 'Address added successfully');
      queryClient.invalidateQueries({ queryKey: ['addresses', user?.id] });
      onSuccess?.();
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to save address');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Basic validation
    if (!formData.label.trim()) {
      toast.error('Please enter a label for the address');
      return;
    }
    if (!formData.full_address.trim()) {
      toast.error('Please enter the full address');
      return;
    }
    if (!formData.city.trim()) {
      toast.error('Please enter the city');
      return;
    }
    if (!formData.state.trim()) {
      toast.error('Please enter the state');
      return;
    }
    if (!formData.pincode.trim()) {
      toast.error('Please enter the pincode');
      return;
    }
    if (!formData.phone.trim()) {
      toast.error('Please enter the phone number');
      return;
    }

    saveAddress.mutate(formData);
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg sm:text-xl flex items-center gap-2">
          <MapPin className="h-5 w-5" />
          {address ? 'Edit Address' : 'Add New Address'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Label */}
          <div className="space-y-2">
            <Label htmlFor="label">Address Label *</Label>
            <Input
              id="label"
              placeholder="e.g., Home, Office, Work"
              value={formData.label}
              onChange={(e) => setFormData(prev => ({ ...prev, label: e.target.value }))}
              required
            />
          </div>

          {/* Full Address */}
          <div className="space-y-2">
            <Label htmlFor="full_address">Full Address *</Label>
            <Textarea
              id="full_address"
              placeholder="Enter complete address with house number, street, area..."
              value={formData.full_address}
              onChange={(e) => setFormData(prev => ({ ...prev, full_address: e.target.value }))}
              rows={3}
              required
            />
          </div>

          {/* City, State, Pincode Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="city">City *</Label>
              <Input
                id="city"
                placeholder="City"
                value={formData.city}
                onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="state">State *</Label>
              <Input
                id="state"
                placeholder="State"
                value={formData.state}
                onChange={(e) => setFormData(prev => ({ ...prev, state: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pincode">Pincode *</Label>
              <Input
                id="pincode"
                placeholder="Pincode"
                value={formData.pincode}
                onChange={(e) => setFormData(prev => ({ ...prev, pincode: e.target.value }))}
                required
              />
            </div>
          </div>

          {/* Phone */}
          <div className="space-y-2">
            <Label htmlFor="phone">Phone Number *</Label>
            <Input
              id="phone"
              placeholder="Phone number"
              value={formData.phone}
              onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
              required
            />
          </div>

          {/* Location and Default */}
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div className="flex items-center space-x-2">
              <Switch
                id="is_default"
                checked={formData.is_default}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_default: checked }))}
              />
              <Label htmlFor="is_default" className="text-sm">
                Set as default address
              </Label>
            </div>
            
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={getCurrentLocation}
              disabled={isGettingLocation}
              className="flex items-center gap-2"
            >
              {isGettingLocation ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <MapPin className="h-4 w-4" />
              )}
              {isGettingLocation ? 'Getting Location...' : 'Use Current Location'}
            </Button>
          </div>

          {/* Coordinates Display */}
          {formData.latitude && formData.longitude && (
            <div className="p-3 bg-muted rounded-md">
              <p className="text-xs text-muted-foreground">
                Coordinates: {formData.latitude.toFixed(6)}, {formData.longitude.toFixed(6)}
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <Button
              type="submit"
              disabled={saveAddress.isPending}
              className="flex-1 sm:flex-none"
            >
              {saveAddress.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              {saveAddress.isPending ? 'Saving...' : (address ? 'Update Address' : 'Add Address')}
            </Button>
            
            {onCancel && (
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                className="flex-1 sm:flex-none"
              >
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
};
