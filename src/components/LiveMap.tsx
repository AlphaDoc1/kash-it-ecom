import { useEffect, useRef } from 'react';
import L from 'leaflet';

export type LatLng = { lat: number; lon: number };

export const LiveMap = ({ center, partner, height = 220 }: { center?: LatLng; partner?: LatLng | null; height?: number }) => {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const instRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);

  useEffect(() => {
    if (!mapRef.current || instRef.current) return;
    const m = L.map(mapRef.current).setView([center?.lat || 20.5937, center?.lon || 78.9629], center ? 14 : 5);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(m);
    instRef.current = m;
  }, [center]);

  useEffect(() => {
    if (!instRef.current) return;
    const defaultIcon = L.icon({
      iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
      iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
      shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      tooltipAnchor: [16, -28],
      shadowSize: [41, 41],
    });
    if (partner?.lat && partner?.lon) {
      if (!markerRef.current) {
        markerRef.current = L.marker([partner.lat, partner.lon], { icon: defaultIcon }).addTo(instRef.current);
      } else {
        markerRef.current.setLatLng([partner.lat, partner.lon]);
      }
      instRef.current.setView([partner.lat, partner.lon], 15);
    }
  }, [partner]);

  return (
    <div
      ref={mapRef}
      style={{ height, width: '100%', borderRadius: 8, overflow: 'hidden', border: '1px solid hsl(var(--border))' }}
    />
  );
};

export default LiveMap;


