import { useState, useEffect, useCallback } from 'react';
import { Soup, Croissant, Apple, Package, Milk, MapPin, Navigation, Clock, Check, X, Snowflake, Home, Package2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import type { Listing, FoodType, Site } from '@/lib/types';
import { CARRY_SIZE_LABELS, TEMP_LABELS, SITE_TYPE_LABELS } from '@/lib/types';
import { formatTime, countdown, mapsUrl, haversineMiles } from '@/lib/utils';

const FOOD_ICON: Record<FoodType, typeof Soup> = {
  prepared_meal: Soup,
  baked_goods: Croissant,
  produce: Apple,
  packaged: Package,
  drinks: Milk,
};

const AREA_CENTER = { lat: 38.3032, lng: -77.4605 };

interface Props {
  onDone: () => void;
}

export function RunnerJob({ onDone }: Props) {
  const { profile } = useAuth();
  const [job, setJob] = useState<Listing | null>(null);
  const [dropoffSite, setDropoffSite] = useState<Site | null>(null);
  const [loading, setLoading] = useState(true);
  const [sites, setSites] = useState<Site[]>([]);
  const [pickSite, setPickSite] = useState(false);
  const [selectedSite, setSelectedSite] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState(false);

  const load = useCallback(async () => {
    if (!profile) return;
    const { data } = await supabase
      .from('listings')
      .select('*')
      .eq('runner_id', profile.id)
      .in('status', ['claimed', 'picked_up'])
      .maybeSingle();
    const currentJob = (data as Listing) ?? null;
    setJob(currentJob);
    if (currentJob?.site_id) {
      const { data: siteData } = await supabase
        .from('sites')
        .select('*')
        .eq('host_id', currentJob.site_id)
        .maybeSingle();
      setDropoffSite((siteData as Site) ?? null);
    } else {
      setDropoffSite(null);
    }
    setLoading(false);
  }, [profile]);

  useEffect(() => {
    load();
    const interval = setInterval(load, 10000);
    return () => clearInterval(interval);
  }, [load]);

  async function loadSites() {
    const { data } = await supabase.from('sites').select('*').eq('area_id', profile!.area_id);
    const all = (data as Site[]) ?? [];
    const eligible = all.filter((s) => {
      const coldOk = job?.temp_needs !== 'cold' || s.cold_capable;
      return coldOk;
    });
    const sorted = [...eligible].sort((a, b) => {
      if (!a.site_lat || !b.site_lat) return 0;
      const da = haversineMiles(AREA_CENTER.lat, AREA_CENTER.lng, a.site_lat, a.site_lng ?? 0);
      const db = haversineMiles(AREA_CENTER.lat, AREA_CENTER.lng, b.site_lat, b.site_lng ?? 0);
      return da - db;
    });
    setSites(sorted);
  }

  async function confirmSite(hostId: string) {
    setBusy(true);
    setError(null);
    try {
      const { error } = await supabase.rpc('set_delivery_site', {
        p_runner: profile!.id, p_listing: job!.id, p_host: hostId,
      });
      if (error) throw error;
      setPickSite(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not set site');
    } finally {
      setBusy(false);
    }
  }

  async function markPickedUp() {
    setBusy(true);
    setError(null);
    try {
      const { error } = await supabase.rpc('mark_picked_up', { p_runner: profile!.id, p_listing: job!.id });
      if (error) throw error;
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update');
    } finally {
      setBusy(false);
    }
  }

  async function confirmDelivery() {
    setBusy(true);
    setError(null);
    try {
      const { error } = await supabase.rpc('confirm_delivery', {
        p_runner: profile!.id, p_listing: job!.id, p_code: code.trim(),
      });
      if (error) throw error;
      setSuccess(true);
      setTimeout(() => onDone(), 1800);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not confirm');
    } finally {
      setBusy(false);
    }
  }

  async function release() {
    if (!confirm("Can't make it? This releases the listing back to the feed.")) return;
    setBusy(true);
    try {
      const { error } = await supabase.rpc('release_claim', { p_runner: profile!.id, p_listing: job!.id });
      if (error) throw error;
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not release');
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <p className="text-center text-ink/50 py-8">Loading…</p>;

  if (success) {
    return (
      <div className="card p-8 text-center">
        <div className="bg-green-100 rounded-full w-16 h-16 mx-auto flex items-center justify-center mb-4">
          <Check size={32} className="text-success" />
        </div>
        <h2 className="text-xl font-bold text-brand-800">Delivered!</h2>
        <p className="text-ink/60 mt-1">Your hours have been credited.</p>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="card p-6 text-center">
        <p className="text-ink/60">No active job. Pick one from the feed.</p>
        <button onClick={onDone} className="btn-primary mt-3">See feed</button>
      </div>
    );
  }

  const Icon = FOOD_ICON[job.food_type];
  const step = job.status === 'picked_up' ? 2 : 1;
  const showCodeEntry = job.status === 'picked_up' && job.site_id;

  return (
    <div className="space-y-4">
      <div className="card p-4">
        <div className="flex items-start gap-3">
          <div className="shrink-0 bg-brand-50 rounded-xl p-2.5">
            <Icon size={28} className="text-brand-800" />
          </div>
          <div className="flex-1">
            <h2 className="font-bold text-ink text-lg">{job.food_text}</h2>
            <p className="text-sm text-ink/60">{CARRY_SIZE_LABELS[job.carry_size]} · {TEMP_LABELS[job.temp_needs]}</p>
          </div>
        </div>
        <div className="mt-3 bg-brand-50 rounded-xl p-3 text-center">
          <p className="text-xs text-ink/60 font-semibold">Countdown to pickup deadline</p>
          <p className="text-2xl font-bold text-brand-800">{countdown(job.pickup_by)}</p>
        </div>
      </div>

      <div className="card p-4">
        <p className="text-sm font-bold text-brand-800 mb-3">Steps</p>
        <div className="flex items-center gap-2 mb-4">
          <div className={`flex-1 h-1.5 rounded-full ${step >= 1 ? 'bg-brand-800' : 'bg-brand-100'}`} />
          <div className={`flex-1 h-1.5 rounded-full ${step >= 2 ? 'bg-brand-800' : 'bg-brand-100'}`} />
        </div>

        <div className={`rounded-xl p-3 mb-2 ${job.status === 'claimed' ? 'bg-brand-50 border-2 border-brand-300' : 'bg-green-50'}`}>
          <p className="font-semibold text-sm flex items-center gap-2">
            {job.status === 'claimed' ? <Clock size={16} className="text-brand-800" /> : <Check size={16} className="text-success" />}
            1. Picked up
          </p>
        </div>
        <div className={`rounded-xl p-3 ${job.status === 'picked_up' ? 'bg-brand-50 border-2 border-brand-300' : 'bg-brand-50/40'}`}>
          <p className="font-semibold text-sm flex items-center gap-2">
            {job.status === 'delivered' ? <Check size={16} className="text-success" /> : <Clock size={16} className={job.status === 'picked_up' ? 'text-brand-800' : 'text-ink/40'} />}
            2. Delivered
          </p>
        </div>
      </div>

      <div className="card p-4 space-y-3">
        <div>
          <p className="text-xs font-semibold text-ink/60 mb-1">PICKUP</p>
          <p className="font-semibold text-ink flex items-start gap-2"><MapPin size={18} className="text-brand-400 mt-0.5 shrink-0" /> {job.address}</p>
          <a href={mapsUrl(null, null, job.address)} target="_blank" rel="noreferrer" className="btn-outline text-sm mt-2 w-full">
            <Navigation size={18} /> Directions to pickup
          </a>
        </div>
        {job.site_id && dropoffSite && (
          <div className="pt-3 border-t border-brand-50">
            <p className="text-xs font-semibold text-ink/60 mb-1">DROPOFF</p>
            <p className="font-semibold text-ink flex items-start gap-2"><MapPin size={18} className="text-brand-400 mt-0.5 shrink-0" /> {dropoffSite.site_name}</p>
            <p className="text-sm text-ink/60 ml-6">{dropoffSite.site_address}</p>
            <a href={mapsUrl(dropoffSite.site_lat, dropoffSite.site_lng, dropoffSite.site_address)} target="_blank" rel="noreferrer" className="btn-outline text-sm mt-2 w-full">
              <Navigation size={18} /> Directions to drop-off
            </a>
          </div>
        )}
      </div>

      {!job.site_id && job.status === 'claimed' && (
        <div className="card p-4">
          <p className="font-semibold text-brand-800 mb-2">Choose a drop-off site</p>
          <p className="text-sm text-ink/60 mb-3">All sites are open 24/7. Nearest first.</p>
          <button onClick={() => { loadSites(); setPickSite(true); }} className="btn-primary w-full">
            <Home size={20} /> Pick a site
          </button>
        </div>
      )}

      {pickSite && (
        <div className="card p-4 space-y-2">
          <p className="font-bold text-brand-800">Drop-off sites near you</p>
          {sites.length === 0 && <p className="text-sm text-ink/60">No sites can take this food right now. Try again shortly.</p>}
          {sites.map((s) => (
            <button key={s.host_id} onClick={() => confirmSite(s.host_id)}
              className={`w-full text-left rounded-xl border-2 p-3 ${selectedSite === s.host_id ? 'border-brand-400 bg-brand-50' : 'border-brand-100 bg-white'}`}>
              <p className="font-semibold text-ink">{s.site_name}</p>
              <p className="text-sm text-ink/60">{s.site_address}</p>
              <div className="flex gap-1.5 mt-1">
                <span className="badge-brand text-xs">{SITE_TYPE_LABELS[s.site_type]}</span>
                {s.cold_capable && <span className="badge-brand text-xs"><Snowflake size={10} /> Cold OK</span>}
              </div>
            </button>
          ))}
          <button onClick={() => setPickSite(false)} className="btn-ghost w-full text-sm">Cancel</button>
        </div>
      )}

      {job.status === 'claimed' && job.site_id && (
        <button onClick={markPickedUp} disabled={busy} className="btn-primary w-full text-lg py-4">
          <Check size={22} /> Mark picked up
        </button>
      )}

      {showCodeEntry && (
        <div className="card p-5 space-y-3">
          <p className="font-bold text-brand-800 text-center">Enter delivery code</p>
          <p className="text-sm text-ink/60 text-center">The host at the site will read you a 6-digit code.</p>
          <input
            className="input text-center text-2xl tracking-[0.5em] font-bold"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            placeholder="000000"
            inputMode="numeric"
          />
          <button onClick={confirmDelivery} disabled={busy || code.length < 6} className="btn-primary w-full">
            {busy ? 'Confirming…' : 'Confirm delivery'}
          </button>
        </div>
      )}

      {error && <p className="text-danger text-sm font-medium text-center">{error}</p>}

      <button onClick={release} disabled={busy} className="btn-danger w-full">
        <X size={20} /> Can't make it
      </button>
    </div>
  );
}
