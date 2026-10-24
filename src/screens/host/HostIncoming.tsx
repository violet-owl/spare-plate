import { useState, useEffect, useCallback } from 'react';
import { KeyRound, Soup, Croissant, Apple, Package, Milk, Clock, User, Phone, Snowflake, Thermometer, Flame, Package2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import type { IncomingDelivery, FoodType, TempNeeds } from '@/lib/types';
import { CARRY_SIZE_LABELS, TEMP_LABELS } from '@/lib/types';
import { formatTime, hoursAgo } from '@/lib/utils';

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

interface Props {
  onBack: () => void;
}

export function HostIncoming({ onBack }: Props) {
  const { profile } = useAuth();
  const [deliveries, setDeliveries] = useState<IncomingDelivery[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!profile) return;
    const { data, error } = await supabase.rpc('get_incoming_deliveries', { p_host: profile.id });
    if (!error) setDeliveries((data as IncomingDelivery[]) ?? []);
    setLoading(false);
  }, [profile]);

  useEffect(() => {
    load();
    const interval = setInterval(load, 10000);
    return () => clearInterval(interval);
  }, [load]);

  if (loading) return <p className="text-center text-ink/50 py-8">Loading…</p>;

  const incoming = deliveries.filter((d) => d.status === 'claimed');
  const onTheWay = deliveries.filter((d) => d.status === 'picked_up');

  return (
    <div className="space-y-4">
      <button onClick={onBack} className="btn-ghost text-sm">Back</button>

      {deliveries.length === 0 && (
        <div className="card p-6 text-center">
          <p className="text-ink/60">No deliveries heading your way right now.</p>
        </div>
      )}

      {onTheWay.length > 0 && (
        <div>
          <h3 className="font-bold text-brand-800 mb-2">On the way</h3>
          <div className="space-y-3">
            {onTheWay.map((d) => {
              const Icon = FOOD_ICON[d.food_type];
              const TempI = TEMP_ICON[d.temp_needs];
              return (
                <div key={d.id} className="card p-4 border-2 border-blue-200">
                  <div className="flex items-start gap-3">
                    <div className="shrink-0 bg-brand-50 rounded-xl p-2.5">
                      <Icon size={28} className="text-brand-800" />
                    </div>
                    <div className="flex-1">
                      <span className="badge bg-blue-100 text-blue-700">Picked up</span>
                      <h3 className="font-bold text-ink mt-1">{d.food_text}</h3>
                      <p className="text-sm text-ink/60">{d.quantity} {d.unit} · {CARRY_SIZE_LABELS[d.carry_size]}</p>
                      <div className="mt-2 flex items-center gap-2 text-sm text-ink/70">
                        <span className="flex items-center gap-1"><TempI size={14} /> {TEMP_LABELS[d.temp_needs]}</span>
                        <span className="text-ink/40">·</span>
                        <span className="flex items-center gap-1"><Clock size={14} /> picked up {hoursAgo(d.picked_up_at!)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 bg-gold-500 rounded-xl p-4 text-center">
                    <p className="text-xs font-bold text-brand-900 uppercase tracking-wide mb-1 flex items-center justify-center gap-1">
                      <KeyRound size={14} /> Delivery code
                    </p>
                    <p className="text-3xl font-bold text-brand-900 tracking-[0.3em]">{d.delivery_code}</p>
                    <p className="text-xs text-brand-900/70 mt-1">Read this to the runner when they arrive</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {incoming.length > 0 && (
        <div>
          <h3 className="font-bold text-brand-800 mb-2">Claimed — heading to pickup</h3>
          <div className="space-y-3">
            {incoming.map((d) => {
              const Icon = FOOD_ICON[d.food_type];
              return (
                <div key={d.id} className="card p-4">
                  <div className="flex items-start gap-3">
                    <div className="shrink-0 bg-brand-50 rounded-xl p-2.5">
                      <Icon size={28} className="text-brand-800" />
                    </div>
                    <div className="flex-1">
                      <span className="badge-gold">Claimed</span>
                      <h3 className="font-bold text-ink mt-1">{d.food_text}</h3>
                      <p className="text-sm text-ink/60">{d.quantity} {d.unit} · {CARRY_SIZE_LABELS[d.carry_size]}</p>
                      <div className="mt-2 space-y-1 text-sm text-ink/70">
                        <p className="flex items-center gap-1.5"><User size={14} className="text-brand-400" /> Runner: {d.runner_name}</p>
                        <p className="flex items-center gap-1.5"><Clock size={14} className="text-brand-400" /> Claimed {hoursAgo(d.claimed_at)}</p>
                        <p className="flex items-center gap-1.5"><Package2 size={14} className="text-brand-400" /> From: {d.donor_name}</p>
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 bg-brand-50 rounded-xl p-3 text-center">
                    <p className="text-xs text-ink/60 font-semibold flex items-center justify-center gap-1">
                      <KeyRound size={14} /> Code ready when runner arrives
                    </p>
                    <p className="text-lg font-bold text-brand-800 tracking-[0.3em] mt-1">{d.delivery_code}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
