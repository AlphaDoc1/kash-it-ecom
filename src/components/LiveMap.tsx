import { useEffect, useRef } from 'react';
import L from 'leaflet';

export type LatLng = { lat: number; lon: number };

export const LiveMap = ({ center, partner, selected, height = 220, selectable = false, onSelect }: { center?: LatLng; partner?: LatLng | null; selected?: LatLng | null; height?: number; selectable?: boolean; onSelect?: (coords: LatLng) => void }) => {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const instRef = useRef<L.Map | null>(null);
  const centerMarkerRef = useRef<L.Marker | null>(null);
  const partnerMarkerRef = useRef<L.Marker | null>(null);
  const selectionMarkerRef = useRef<L.Marker | null>(null);

  // Initialize map
  useEffect(() => {
    if (!mapRef.current || instRef.current) return;
    const m = L.map(mapRef.current).setView([center?.lat || 20.5937, center?.lon || 78.9629], center ? 14 : 5);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(m);
    instRef.current = m;
    if (selectable) {
      m.on('click', (e: L.LeafletMouseEvent) => {
        const { lat, lng } = e.latlng;
        if (selectionMarkerRef.current) {
          selectionMarkerRef.current.setLatLng([lat, lng]);
        } else {
          selectionMarkerRef.current = L.marker([lat, lng]).addTo(m);
          selectionMarkerRef.current.bindPopup('📍 Selected drop location').openPopup();
        }
        onSelect && onSelect({ lat, lon: lng });
      });
    }
  }, []);

  // Reflect externally provided selected coordinate
  useEffect(() => {
    if (!instRef.current || !selectable) return;
    if (selected && selected.lat != null && selected.lon != null) {
      if (selectionMarkerRef.current) {
        selectionMarkerRef.current.setLatLng([selected.lat, selected.lon]);
      } else {
        selectionMarkerRef.current = L.marker([selected.lat, selected.lon]).addTo(instRef.current);
        selectionMarkerRef.current.bindPopup('📍 Selected drop location').openPopup();
      }
      instRef.current.setView([selected.lat, selected.lon], 16);
    }
  }, [selected, selectable]);

  // Update center marker (user location)
  useEffect(() => {
    if (!instRef.current) return;
    
    const userIcon = L.icon({
      iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
      iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
      shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      tooltipAnchor: [16, -28],
      shadowSize: [41, 41],
    });

    if (center?.lat && center?.lon) {
      if (!centerMarkerRef.current) {
        centerMarkerRef.current = L.marker([center.lat, center.lon], { 
          icon: userIcon 
        }).addTo(instRef.current);
        centerMarkerRef.current.bindPopup('📍 Your Location').openPopup();
      } else {
        centerMarkerRef.current.setLatLng([center.lat, center.lon]);
      }
    } else if (centerMarkerRef.current) {
      instRef.current.removeLayer(centerMarkerRef.current);
      centerMarkerRef.current = null;
    }
  }, [center]);

  // Update partner marker (delivery partner location)
  useEffect(() => {
    if (!instRef.current) return;
    
    const partnerIcon = L.icon({
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
      if (!partnerMarkerRef.current) {
        partnerMarkerRef.current = L.marker([partner.lat, partner.lon], { 
          icon: partnerIcon 
        }).addTo(instRef.current);
        partnerMarkerRef.current.bindPopup('🚚 Delivery Partner').openPopup();
      } else {
        partnerMarkerRef.current.setLatLng([partner.lat, partner.lon]);
      }
    } else if (partnerMarkerRef.current) {
      instRef.current.removeLayer(partnerMarkerRef.current);
      partnerMarkerRef.current = null;
    }
  }, [partner]);

  // Update map view to show both markers
  useEffect(() => {
    if (!instRef.current) return;
    
    const markers: L.LatLng[] = [];
    if (center?.lat && center?.lon) markers.push([center.lat, center.lon]);
    if (partner?.lat && partner?.lon) markers.push([partner.lat, partner.lon]);
    
    if (markers.length > 0) {
      const group = new L.featureGroup(markers.map(latlng => L.marker(latlng)));
      instRef.current.fitBounds(group.getBounds().pad(0.1));
    } else if (center?.lat && center?.lon) {
      instRef.current.setView([center.lat, center.lon], 14);
    } else if (partner?.lat && partner?.lon) {
      instRef.current.setView([partner.lat, partner.lon], 15);
    }
  }, [center, partner]);

  return (
    <div
      ref={mapRef}
      style={{ height, width: '100%', borderRadius: 8, overflow: 'hidden', border: '1px solid hsl(var(--border))' }}
    />
  );
};

export default LiveMap;


