import { useEffect, useState } from 'react';
import { Utensils } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { CommunityTotals } from '@/lib/types';

export function CommunityTotal() {
  const [totals, setTotals] = useState<CommunityTotals | null>(null);

  useEffect(() => {
    supabase.from('community_totals').select('*').eq('id', 1).maybeSingle()
      .then(({ data }) => setTotals(data as CommunityTotals | null));
    const interval = setInterval(() => {
      supabase.from('community_totals').select('*').eq('id', 1).maybeSingle()
        .then(({ data }) => setTotals(data as CommunityTotals | null));
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  if (!totals) return null;
  const meals = Math.round(Number(totals.total_meals));

  return (
    <div className="card-soft p-4 text-center">
      <p className="text-xs font-semibold text-brand-600 uppercase tracking-wide flex items-center justify-center gap-1">
        <Utensils size={14} /> Meals rescued together
      </p>
      <p className="text-4xl font-bold text-brand-800 mt-1">{meals.toLocaleString()}</p>
      <p className="text-xs text-ink/50 mt-0.5">{Number(totals.total_pounds).toLocaleString()} lb kept from waste</p>
    </div>
  );
}
