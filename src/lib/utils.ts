export function mealsFromPounds(pounds: number): number {
  return Math.round(pounds / 1.2);
}

export function formatDateShort(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', 'minute': '2-digit' });
}

export function hoursAgo(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 3600000;
  if (diff < 1) return `${Math.max(1, Math.round(diff * 60))} min ago`;
  if (diff < 24) return `${Math.round(diff)} hr ago`;
  return `${Math.round(diff / 24)} days ago`;
}

export function timeLeft(iso: string): { label: string; pct: number; level: 'green' | 'amber' | 'red' } {
  const total = new Date(iso).getTime();
  const now = Date.now();
  const diffMs = total - now;
  if (diffMs <= 0) return { label: 'Expired', pct: 0, level: 'red' };
  const diffHr = diffMs / 3600000;
  const label =
    diffHr < 1 ? `${Math.max(1, Math.round(diffHr * 60))} min left` :
    diffHr < 24 ? `${Math.round(diffHr)} hr left` :
    `${Math.round(diffHr / 24)} days left`;
  const pct = Math.max(0, Math.min(100, (diffMs / (48 * 3600000)) * 100));
  const level = diffHr < 3 ? 'red' : diffHr < 12 ? 'amber' : 'green';
  return { label, pct, level };
}

export function countdown(iso: string): string {
  const diff = new Date(iso).getTime() - Date.now();
  if (diff <= 0) return '0:00';
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

const R = 3958.8;
export function haversineMiles(
  lat1: number, lng1: number, lat2: number, lng2: number
): number {
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function walkMinutes(miles: number): number {
  return Math.max(1, Math.round((miles / 3.1) * 60));
}

export function mapsUrl(lat?: number | null, lng?: number | null, address?: string | null): string {
  if (lat && lng) return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
  if (address) return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`;
  return '#';
}

export function telUrl(phone: string | null): string {
  if (!phone) return '#';
  return `tel:${phone.replace(/[^0-9+]/g, '')}`;
}
