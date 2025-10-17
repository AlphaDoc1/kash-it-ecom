import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Google Maps URL helpers
export const buildMapsDirectionUrl = (params: {
  origin?: { lat: number; lon: number } | string;
  destination: { lat: number; lon: number } | string;
  waypoints?: Array<{ lat: number; lon: number } | string>;
  travelMode?: 'driving' | 'walking' | 'bicycling' | 'transit';
  navigate?: boolean;
}) => {
  const base = 'https://www.google.com/maps/dir/?api=1';
  const encode = (v: { lat: number; lon: number } | string) =>
    typeof v === 'string' ? encodeURIComponent(v) : `${v.lat},${v.lon}`;

  const origin = params.origin ? `&origin=${encode(params.origin)}` : '';
  const destination = `&destination=${encode(params.destination)}`;
  const waypoints = params.waypoints && params.waypoints.length
    ? `&waypoints=${params.waypoints.map(encode).join('|')}`
    : '';
  const mode = `&travelmode=${params.travelMode || 'driving'}`;
  const navigate = params.navigate ? `&dir_action=navigate` : '';
  return `${base}${origin}${destination}${waypoints}${mode}${navigate}`;
}

export const openGoogleMaps = (url: string) => {
  try {
    window.open(url, '_blank');
  } catch {
    // noop
  }
}

export const getCurrentPosition = (): Promise<{ lat: number; lon: number } | null> => {
  return new Promise((resolve) => {
    if (!('geolocation' in navigator)) return resolve(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
    );
  });
}

export const startPositionWatch = (
  onPosition: (pos: { lat: number; lon: number }) => void
): (() => void) => {
  if (!('geolocation' in navigator)) return () => {};
  const id = navigator.geolocation.watchPosition(
    (pos) => onPosition({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
    () => {},
    { enableHighAccuracy: true, maximumAge: 3000 }
  );
  return () => navigator.geolocation.clearWatch(id);
}