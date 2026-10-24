import { useState, useEffect } from 'react';
import { Home, Phone, MapPin, UserCircle, Clock, Snowflake, MapPinned } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import type { Profile, SiteType, Area } from '@/lib/types';
import { SITE_TYPE_LABELS } from '@/lib/types';
import { ChipSelect } from '@/components/ChipSelect';
import { mealsFromPounds } from '@/lib/utils';

interface Props {
  onIncoming: () => void;
}

export function HostProfile({ onIncoming }: Props) {
  const { profile, refreshProfile } = useAuth();
  const [editing, setEditing] = useState(false);

  if (!profile) return null;
  if (!editing && profile.site_address) {
    return <HostSummary profile={profile} onEdit={() => setEditing(true)} onIncoming={onIncoming} />;
  }
  return <HostForm profile={profile} onDone={async () => { await refreshProfile(); setEditing(false); }} />;
}

function HostSummary({ profile, onEdit, onIncoming }: { profile: Profile; onEdit: () => void; onIncoming: () => void }) {
  const meals = mealsFromPounds(profile.total_pounds);
  return (
    <div className="space-y-4">
      <div className="card p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-ink/60 font-semibold">Drop-off site host</p>
            <h2 className="text-xl font-bold text-brand-800">{profile.display_name}</h2>
            <p className="text-sm text-ink/60">{profile.site_type ? SITE_TYPE_LABELS[profile.site_type] : ''}</p>
          </div>
          <button onClick={onEdit} className="btn-outline text-sm px-3 py-2">Edit</button>
        </div>
        <div className="mt-4 space-y-2 text-sm">
          <p className="flex items-center gap-2 text-ink/80"><Phone size={16} className="text-brand-400" /> {profile.phone}</p>
          <p className="flex items-center gap-2 text-ink/80"><MapPin size={16} className="text-brand-400" /> {profile.site_address}</p>
          {profile.contact_person && <p className="flex items-center gap-2 text-ink/80"><UserCircle size={16} className="text-brand-400" /> {profile.contact_person}</p>}
          <p className="flex items-center gap-2 text-ink/80"><Clock size={16} className="text-brand-400" /> Open 24/7</p>
          <p className="flex items-center gap-2 text-ink/80">
            {profile.cold_capable ? <Snowflake size={16} className="text-brand-400" /> : <Snowflake size={16} className="text-ink/30" />}
            {profile.cold_capable ? 'Can take cold food' : 'No cold storage'}
          </p>
        </div>
      </div>

      <div className="card-soft p-5">
        <h3 className="font-bold text-brand-800 mb-3">Your impact</h3>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div>
            <p className="text-3xl font-bold text-brand-800">{meals}</p>
            <p className="text-xs text-ink/60 font-semibold">meals<br/>(estimated)</p>
          </div>
          <div>
            <p className="text-3xl font-bold text-brand-800">{profile.total_pounds}</p>
            <p className="text-xs text-ink/60 font-semibold">lb kept<br/>from waste</p>
          </div>
          <div>
            <p className="text-3xl font-bold text-brand-800">{profile.total_deliveries_received}</p>
            <p className="text-xs text-ink/60 font-semibold">deliveries<br/>received</p>
          </div>
        </div>
        <p className="text-xs text-ink/50 mt-3 text-center">Since {new Date(profile.summary_since).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</p>
      </div>

      <button onClick={onIncoming} className="btn-primary w-full text-lg py-4">
        <Home size={22} /> See incoming deliveries
      </button>
    </div>
  );
}

function HostForm({ profile, onDone }: { profile: Profile; onDone: () => void }) {
  const [name, setName] = useState(profile.display_name ?? '');
  const [siteType, setSiteType] = useState<SiteType>(profile.site_type ?? 'community_fridge');
  const [address, setAddress] = useState(profile.site_address ?? '');
  const [contact, setContact] = useState(profile.contact_person ?? '');
  const [phone, setPhone] = useState(profile.phone ?? '');
  const [cold, setCold] = useState(profile.cold_capable);
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
        display_name: name,
        site_type: siteType,
        site_address: address,
        contact_person: contact || null,
        phone,
        site_hours: 'Open 24/7',
        open_days: 'Mon,Tue,Wed,Thu,Fri,Sat,Sun',
        open_hour: 0,
        close_hour: 24,
        cold_capable: cold,
        area_id: areaId,
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
      <h2 className="text-xl font-bold text-brand-800">Set up your site</h2>
      <div>
        <label className="label" htmlFor="hname">Site name</label>
        <input id="hname" className="input" value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      {areas.length > 1 && (
        <div>
          <label className="label">Your area</label>
          <ChipSelect
            value={areaId}
            onChange={setAreaId}
            options={areas.map((a) => ({ label: a.name, value: a.id, icon: <MapPinned size={16} className="text-brand-400" /> }))}
          />
        </div>
      )}
      <div>
        <label className="label">Site type</label>
        <ChipSelect value={siteType} onChange={(v) => setSiteType(v as SiteType)}
          options={(Object.keys(SITE_TYPE_LABELS) as SiteType[]).map((k) => ({ label: SITE_TYPE_LABELS[k], value: k }))} />
      </div>
      <div>
        <label className="label" htmlFor="haddr">Address</label>
        <input id="haddr" className="input" value={address} onChange={(e) => setAddress(e.target.value)} />
      </div>
      <div>
        <label className="label" htmlFor="hcontact">Contact person</label>
        <input id="hcontact" className="input" value={contact} onChange={(e) => setContact(e.target.value)} />
      </div>
      <div>
        <label className="label" htmlFor="hphone">Phone</label>
        <input id="hphone" type="tel" className="input" value={phone} onChange={(e) => setPhone(e.target.value)} />
      </div>
      <div className="rounded-xl bg-brand-50 border border-brand-100 p-3">
        <p className="text-sm font-semibold text-ink flex items-center gap-2"><Clock size={16} className="text-brand-400" /> Drop-off sites are open 24/7</p>
      </div>
      <label className="flex items-center gap-3 rounded-xl bg-brand-50 border border-brand-100 p-3 cursor-pointer">
        <button type="button" onClick={() => setCold(!cold)}
          className={`shrink-0 rounded-lg w-6 h-6 flex items-center justify-center ${cold ? 'bg-brand-800 text-white' : 'bg-white border-2 border-brand-200'}`}>
          {cold && <Snowflake size={14} />}
        </button>
        <span className="text-sm font-semibold text-ink">This site can take cold food (refrigeration available)</span>
      </label>
      {error && <p className="text-danger text-sm font-medium">{error}</p>}
      <button onClick={save} className="btn-primary w-full" disabled={saving}>{saving ? 'Saving…' : 'Save site'}</button>
    </div>
  );
}
