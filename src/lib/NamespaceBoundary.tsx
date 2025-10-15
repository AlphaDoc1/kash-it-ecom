import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { sessionNamespace } from '@/integrations/supabase/client';

const getNsFromPath = (pathname: string) => {
  const seg = pathname.split('/').filter(Boolean)[0] || '';
  if (seg === 'admin') return 'admin';
  if (seg === 'vendor') return 'vendor';
  return 'user';
};

export const NamespaceBoundary = () => {
  const location = useLocation();

  useEffect(() => {
    const ns = getNsFromPath(location.pathname);
    if (ns !== sessionNamespace) {
      // Force a full reload so Supabase client is recreated with correct storageKey
      window.location.href = location.pathname + location.search + location.hash;
    }
  }, [location]);

  return null;
};

export default NamespaceBoundary;


