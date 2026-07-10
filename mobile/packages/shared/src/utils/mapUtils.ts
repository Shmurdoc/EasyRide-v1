import { PHALABORWA_CENTER } from '../constants';

export function generateRouteCoords(
  from: { lat: number; lng: number },
  to: { lat: number; lng: number }
): Array<{ latitude: number; longitude: number }> {
  const points: Array<{ latitude: number; longitude: number }> = [];
  const steps = 20;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const lat = from.lat + (to.lat - from.lat) * t;
    const lng = from.lng + (to.lng - from.lng) * t;
    const jitter = (1 - Math.abs(2 * t - 1)) * 0.001;
    points.push({
      latitude: lat + (Math.random() - 0.5) * jitter,
      longitude: lng + (Math.random() - 0.5) * jitter,
    });
  }
  return points;
}

export function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function formatDistance(km: number): string {
  return km < 1 ? `${Math.round(km * 1000)}m` : `${km.toFixed(1)} km`;
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${Math.round(minutes)} min`;
  const hrs = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  return mins > 0 ? `${hrs}h ${mins}m` : `${hrs}h`;
}

export function formatZAR(amount: number | string): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  return `R${(num || 0).toFixed(2)}`;
}

export function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good Morning';
  if (hour < 17) return 'Good Afternoon';
  return 'Good Evening';
}
