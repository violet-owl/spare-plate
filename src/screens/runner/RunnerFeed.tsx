import { useState, useEffect, useCallback } from 'react';
import { Soup, Croissant, Apple, Package, Milk, Clock, MapPin, Package2, Snowflake, Thermometer, Flame, Navigation, Footprints, Hand } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import type { Listing, FoodType, CarrySize, TempNeeds, Site } from '@/lib/types';
import { FOOD_TYPE_LABELS, CARRY_SIZE_LABELS, TEMP_LABELS } from '@/lib/types';
import { formatTime, countdown, haversineMiles } from '@/lib/utils';

const FOOD_ICON: Record<FoodType, typeof Soup> = {
  prepared_meal: Soup,
  baked_goods: Croissant,
  produce: Apple,
  packaged: Package,
  drinks: Milk,
};

const TEMP_ICON: Record<TempNeeds, typeof Soup> = {
  cold: Snowflake,
  room_temp: Thermometer,
  hot: Flame,
};

const AREA_CENTER = { lat: 38.3032, lng: -77.4605 };

export function RunnerFeed({ onClaimed }: { onClaimed: () => void }) {
  const { profile } = useAuth();
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data } = await supabase.from('feed_listings').select('*');
    setListings((data as Listing[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, 15000);
    return () => clearInterval(interval);
  }, [load]);

  async function claim(l: Listing) {
    setError(null);
    setBusyId(l.id);
    try {
      const { error } = await supabase.rpc('claim_listing', {
        p_runner: profile!.id,
        p_listing: l.id,
      });
      if (error) throw error;
      onClaimed();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not claim');
    } finally {
      setBusyId(null);
    }
  }

  if (loading) return <p className="text-center text-ink/50 py-8">Loading…</p>;

  const isMinor = profile?.age_bracket === 'under_18';
  const sorted = [...listings].sort((a, b) => {
    const da = haversineMiles(AREA_CENTER.lat, AREA_CENTER.lng, 38.3, -77.46);
    return da - da;
  });

  return (
    <div className="space-y-4">
      {error && <p className="text-danger text-sm font-medium text-center">{error}</p>}
      {listings.length === 0 && (
        <div className="card p-6 text-center">
          <p className="text-ink/60">No open listings right now. Check back soon.</p>
        </div>
      )}
      {sorted.map((l) => {
        const Icon = FOOD_ICON[l.food_type];
        const TempI = TEMP_ICON[l.temp_needs];
        const blocked = isMinor && l.carry_size !== 'one_bag';
        return (
          <div key={l.id} className="card p-4">
            <div className="flex items-start gap-3">
              <div className="shrink-0 bg-brand-50 rounded-xl p-2.5">
                <Icon size={28} className="text-brand-800" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-ink">{l.food_text}</h3>
                <p className="text-sm text-ink/60">{FOOD_TYPE_LABELS[l.food_type]} · {l.quantity} {l.unit}</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <span className="badge-brand"><Package2 size={12} /> {CARRY_SIZE_LABELS[l.carry_size]}</span>
                  <span className="badge-brand"><TempI size={12} /> {TEMP_LABELS[l.temp_needs]}</span>
                </div>
                <div className="mt-2 space-y-1 text-sm text-ink/70">
                  <p className="flex items-center gap-1.5"><Clock size={14} className="text-brand-400" /> Pick up by {formatTime(l.pickup_by)}</p>
                  <p className="flex items-center gap-1.5"><MapPin size={14} className="text-brand-400" /> {l.address}</p>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-brand-50">
              <span className="text-xs font-semibold text-amber">Pickup deadline: {countdown(l.pickup_by)}</span>
              {blocked ? (
                <span className="badge bg-gray-100 text-ink/50">One-bag only</span>
              ) : (
                <button onClick={() => claim(l)} disabled={busyId === l.id} className="btn-primary text-sm py-2">
                  {busyId === l.id ? 'Claiming…' : 'Claim'}
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
