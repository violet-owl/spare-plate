import { useState, useEffect, useCallback } from 'react';
import { Plus, Repeat, Trash2, Soup, Croissant, Apple, Package, Milk, Clock, MapPin, Package2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import type { Listing, FoodType, ListingStatus } from '@/lib/types';
import { FOOD_TYPE_LABELS, CARRY_SIZE_LABELS, TEMP_LABELS, STATUS_LABELS } from '@/lib/types';
import { formatTime, formatDateShort, countdown } from '@/lib/utils';

const FOOD_ICON: Record<FoodType, typeof Soup> = {
  prepared_meal: Soup,
  baked_goods: Croissant,
  produce: Apple,
  packaged: Package,
  drinks: Milk,
};

interface Props {
  onPost: () => void;
  onRepeat: (l: Listing) => void;
}

const STATUS_COLOR: Record<ListingStatus, string> = {
  posted: 'bg-brand-100 text-brand-800',
  claimed: 'bg-gold-500 text-brand-900',
  picked_up: 'bg-blue-100 text-blue-700',
  delivered: 'bg-green-100 text-success',
  cancelled: 'bg-gray-200 text-gray-600',
};

export function DonorListings({ onPost, onRepeat }: Props) {
  const { profile } = useAuth();
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [runnerName, setRunnerName] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    if (!profile) return;
    const { data } = await supabase
      .from('listings')
      .select('*')
      .eq('donor_id', profile.id)
      .order('created_at', { ascending: false });
    const rows = (data as Listing[]) ?? [];
    setListings(rows);
    const claimed = rows.filter((r) => r.runner_id);
    if (claimed.length) {
      const ids = [...new Set(claimed.map((r) => r.runner_id!))];
      const { data: runners } = await supabase.from('profiles').select('id, display_name').in('id', ids);
      const map: Record<string, string> = {};
      (runners ?? []).forEach((r: { id: string; display_name: string }) => { map[r.id] = r.display_name; });
      setRunnerName(map);
    }
    setLoading(false);
  }, [profile]);

  useEffect(() => {
    load();
    const interval = setInterval(load, 15000);
    return () => clearInterval(interval);
  }, [load]);

  async function cancelListing(id: string) {
    if (!confirm('Cancel this listing? It will be removed from the feed.')) return;
    await supabase.from('listings').delete().eq('id', id);
    load();
  }

  if (loading) return <p className="text-center text-ink/50 py-8">Loading…</p>;

  const active = listings.filter((l) => l.status !== 'delivered' && l.status !== 'cancelled');
  const past = listings.filter((l) => l.status === 'delivered' || l.status === 'cancelled');

  return (
    <div className="space-y-4">
      <button onClick={onPost} className="btn-primary w-full text-lg py-4">
        <Plus size={22} /> Post food
      </button>

      {listings.length === 0 && (
        <div className="card p-6 text-center">
          <p className="text-ink/60">You haven't posted any food yet.</p>
          <button onClick={onPost} className="btn-outline mt-3">Post your first listing</button>
        </div>
      )}

      {active.length > 0 && (
        <div className="space-y-3">
          {active.map((l) => {
            const Icon = FOOD_ICON[l.food_type];
            return (
              <div key={l.id} className="card p-4">
                <div className="flex items-start gap-3">
                  <div className="shrink-0 bg-brand-50 rounded-xl p-2.5">
                    <Icon size={28} className="text-brand-800" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`badge ${STATUS_COLOR[l.status]}`}>{STATUS_LABELS[l.status]}</span>
                      {l.status === 'claimed' && l.runner_id && (
                        <span className="text-xs text-ink/60 font-semibold">Claimed by {runnerName[l.runner_id]?.split(' ')[0] ?? 'a runner'}</span>
                      )}
                    </div>
                    <h3 className="font-bold text-ink mt-1">{l.food_text}</h3>
                    <p className="text-sm text-ink/60">{FOOD_TYPE_LABELS[l.food_type]} · {l.quantity} {l.unit}</p>
                    <div className="mt-2 space-y-1 text-sm text-ink/70">
                      <p className="flex items-center gap-1.5"><Clock size={14} className="text-brand-400" /> Pick up by {formatTime(l.pickup_by)}</p>
                      <p className="flex items-center gap-1.5"><MapPin size={14} className="text-brand-400" /> {l.address}</p>
                      <p className="flex items-center gap-1.5"><Package2 size={14} className="text-brand-400" /> {CARRY_SIZE_LABELS[l.carry_size]} · {TEMP_LABELS[l.temp_needs]}</p>
                    </div>
                  </div>
                </div>
                {l.status === 'posted' && (
                  <div className="flex gap-2 mt-3 pt-3 border-t border-brand-50">
                    <button onClick={() => onRepeat(l)} className="btn-outline text-sm flex-1 py-2">
                      <Repeat size={16} /> Post again
                    </button>
                    <button onClick={() => cancelListing(l.id)} className="btn-danger text-sm py-2 px-3">
                      <Trash2 size={16} />
                    </button>
                  </div>
                )}
                {l.status === 'claimed' && l.pickup_by && (
                  <p className="text-xs text-amber font-semibold mt-2">Pickup deadline: {countdown(l.pickup_by)}</p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {past.length > 0 && (
        <div>
          <h3 className="font-bold text-brand-800 mt-4 mb-2">Past donations</h3>
          <div className="space-y-2">
            {past.map((l) => (
              <div key={l.id} className="card p-3 flex items-center gap-3">
                <div className="shrink-0 bg-brand-50 rounded-lg p-1.5">
                  {(() => { const Icon = FOOD_ICON[l.food_type]; return <Icon size={20} className="text-brand-800" />; })()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-ink text-sm truncate">{l.food_text}</p>
                  <p className="text-xs text-ink/50">{formatDateShort(l.created_at)} · {STATUS_LABELS[l.status]}</p>
                </div>
                {l.status === 'delivered' && (
                  <button onClick={() => onRepeat(l)} className="text-brand-400 text-sm font-semibold">Repeat</button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
