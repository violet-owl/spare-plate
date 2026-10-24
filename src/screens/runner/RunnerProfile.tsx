import { useState, useEffect } from 'react';
import { Bike, Footprints, Car, Phone, GraduationCap, Award, FileText, MapPinned } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import type { Profile, TravelMode, AgeBracket, Area } from '@/lib/types';
import { ChipSelect } from '@/components/ChipSelect';

interface Props {
  onServiceRecord: () => void;
}

export function RunnerProfile({ onServiceRecord }: Props) {
  const { profile, refreshProfile } = useAuth();
  const [editing, setEditing] = useState(false);

  if (!profile) return null;
  if (!editing && profile.travel_mode) {
    return <RunnerSummary profile={profile} onEdit={() => setEditing(true)} onServiceRecord={onServiceRecord} />;
  }
  return <RunnerForm profile={profile} onDone={async () => { await refreshProfile(); setEditing(false); }} />;
}

function RunnerSummary({ profile, onEdit, onServiceRecord }: { profile: Profile; onEdit: () => void; onServiceRecord: () => void }) {
  const badges = [
    { hrs: 50, label: 'Gold', earned: profile.total_hours >= 50 },
    { hrs: 25, label: 'Silver', earned: profile.total_hours >= 25 },
    { hrs: 5, label: 'Bronze', earned: profile.total_hours >= 5 },
  ].filter((b) => b.earned);

  return (
    <div className="space-y-4">
      <div className="card p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-ink/60 font-semibold">Volunteer runner</p>
            <h2 className="text-xl font-bold text-brand-800">{profile.display_name}</h2>
          </div>
          <button onClick={onEdit} className="btn-outline text-sm px-3 py-2">Edit</button>
        </div>
        <div className="mt-4 space-y-2 text-sm">
          <p className="flex items-center gap-2 text-ink/80"><Phone size={16} className="text-brand-400" /> {profile.phone}</p>
          <p className="flex items-center gap-2 text-ink/80"><Bike size={16} className="text-brand-400" /> Travels by {profile.travel_mode}</p>
          <p className="flex items-center gap-2 text-ink/80">
            {profile.age_bracket === 'under_18' ? <Footprints size={16} className="text-brand-400" /> : <Car size={16} className="text-brand-400" />}
            {profile.age_bracket === 'under_18' ? 'Under 18 — walkable, one-bag jobs only' : '18 or older'}
          </p>
          {profile.school_group && (
            <p className="flex items-center gap-2 text-ink/80"><GraduationCap size={16} className="text-brand-400" /> {profile.school_group}</p>
          )}
        </div>
      </div>

      <div className="card-soft p-5">
        <h3 className="font-bold text-brand-800 mb-3">Your service</h3>
        <div className="grid grid-cols-2 gap-2 text-center">
          <div>
            <p className="text-3xl font-bold text-brand-800">{profile.total_hours}</p>
            <p className="text-xs text-ink/60 font-semibold">hours served</p>
          </div>
          <div>
            <p className="text-3xl font-bold text-brand-800">{profile.total_deliveries}</p>
            <p className="text-xs text-ink/60 font-semibold">deliveries</p>
          </div>
        </div>
        {badges.length > 0 && (
          <div className="mt-4">
            <p className="text-sm font-semibold text-ink/70 mb-2 flex items-center gap-1"><Award size={16} className="text-gold-600" /> Badges</p>
            <div className="flex gap-2">
              {badges.map((b) => (
                <span key={b.hrs} className="badge-gold">{b.label} · {b.hrs}h</span>
              ))}
            </div>
          </div>
        )}
        <p className="text-xs text-ink/50 mt-3 text-center">Since {new Date(profile.summary_since).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</p>
      </div>

      <button onClick={onServiceRecord} className="btn-outline w-full">
        <FileText size={20} /> My service record
      </button>
    </div>
  );
}

function RunnerForm({ profile, onDone }: { profile: Profile; onDone: () => void }) {
  const [name, setName] = useState(profile.display_name ?? '');
  const [phone, setPhone] = useState(profile.phone ?? '');
  const [travel, setTravel] = useState<TravelMode>(profile.travel_mode ?? 'walk');
  const [age, setAge] = useState<AgeBracket>(profile.age_bracket ?? 'adult');
  const [school, setSchool] = useState(profile.school_group ?? '');
  const [areas, setAreas] = useState<Area[]>([]);
  const [areaId, setAreaId] = useState(profile.area_id ?? '');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase.from('areas').select('*').order('created_at').then(({ data }) => {
      const a = (data as Area[]) ?? [];
      setAreas(a);
      if (!areaId && a.length) setAreaId(a[0].id);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const { error } = await supabase.from('profiles').update({
        display_name: name, phone, travel_mode: travel, age_bracket: age, school_group: school || null, area_id: areaId,
      }).eq('id', profile.id);
      if (error) throw error;
      await onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="card p-5 space-y-4">
      <h2 className="text-xl font-bold text-brand-800">Runner profile</h2>
      <div>
        <label className="label" htmlFor="rname">Your name</label>
        <input id="rname" className="input" value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      {areas.length > 1 && (
        <div>
          <label className="label">Your home area</label>
          <ChipSelect
            value={areaId}
            onChange={setAreaId}
            options={areas.map((a) => ({ label: a.name, value: a.id, icon: <MapPinned size={16} className="text-brand-400" /> }))}
          />
        </div>
      )}
      <div>
        <label className="label" htmlFor="rphone">Phone</label>
        <input id="rphone" type="tel" className="input" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="540-555-0200" />
      </div>
      <div>
        <label className="label">How do you travel?</label>
        <div className="grid grid-cols-3 gap-2">
          {([
            { v: 'walk', icon: <Footprints size={20} />, label: 'Walk' },
            { v: 'bike', icon: <Bike size={20} />, label: 'Bike' },
            { v: 'car', icon: <Car size={20} />, label: 'Car' },
          ] as const).map((o) => (
            <button key={o.v} onClick={() => setTravel(o.v)}
              className={`flex flex-col items-center gap-1 rounded-xl border-2 py-3 font-semibold text-sm ${travel === o.v ? 'border-brand-400 bg-brand-50 text-brand-800' : 'border-brand-100 bg-white text-ink/70'}`}>
              {o.icon} {o.label}
            </button>
          ))}
        </div>
      </div>
      <div>
        <label className="label">Age bracket</label>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => setAge('under_18')}
            className={`flex items-center justify-center gap-2 rounded-xl border-2 py-3 font-semibold ${age === 'under_18' ? 'border-brand-400 bg-brand-50 text-brand-800' : 'border-brand-100 bg-white text-ink/70'}`}>
            <Footprints size={18} /> Under 18
          </button>
          <button onClick={() => setAge('adult')}
            className={`rounded-xl border-2 py-3 font-semibold ${age === 'adult' ? 'border-brand-400 bg-brand-50 text-brand-800' : 'border-brand-100 bg-white text-ink/70'}`}>
            18 or older
          </button>
        </div>
        {age === 'under_18' && (
          <p className="text-xs text-amber font-semibold mt-2">Under-18 runners see only walkable, one-bag jobs.</p>
        )}
      </div>
      <div>
        <label className="label" htmlFor="rschool">School or scout group (optional)</label>
        <input id="rschool" className="input" value={school} onChange={(e) => setSchool(e.target.value)} placeholder="UMW Volunteer Corps" />
      </div>
      {error && <p className="text-danger text-sm font-medium">{error}</p>}
      <button onClick={save} className="btn-primary w-full" disabled={saving}>{saving ? 'Saving…' : 'Save profile'}</button>
    </div>
  );
}
