import { useState, useEffect } from 'react';
import { Building2, User, Phone, MapPin, MessageSquare, UserCircle, MapPinned } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import type { Profile, DonorType, BusinessType, Area } from '@/lib/types';
import { BUSINESS_TYPE_LABELS } from '@/lib/types';
import { ChipSelect } from '@/components/ChipSelect';
import { mealsFromPounds } from '@/lib/utils';

export function DonorProfile() {
  const { profile, refreshProfile } = useAuth();
  const [editing, setEditing] = useState(false);
  const [saved, setSaved] = useState(false);

  if (!profile) return null;
  if (!editing && profile.address) return <DonorSummary profile={profile} onEdit={() => setEditing(true)} />;

  return (
    <DonorForm
      profile={profile}
      onDone={async () => {
        await refreshProfile();
        setEditing(false);
        setSaved(true);
        setTimeout(() => setSaved(false), 2500);
      }}
    />
  );
}

function DonorSummary({ profile, onEdit }: { profile: Profile; onEdit: () => void }) {
  const meals = mealsFromPounds(profile.total_pounds);
  return (
    <div className="space-y-4">
      <div className="card p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-ink/60 font-semibold">
              {profile.donor_type === 'business' ? 'Business donor' : 'Individual donor'}
            </p>
            <h2 className="text-xl font-bold text-brand-800">{profile.display_name}</h2>
            {profile.business_type && (
              <p className="text-sm text-ink/60">{BUSINESS_TYPE_LABELS[profile.business_type]}</p>
            )}
          </div>
          <button onClick={onEdit} className="btn-outline text-sm px-3 py-2">Edit</button>
        </div>

        <div className="mt-4 space-y-2 text-sm">
          <p className="flex items-center gap-2 text-ink/80"><Phone size={16} className="text-brand-400" /> {profile.phone}</p>
          <p className="flex items-center gap-2 text-ink/80"><MapPin size={16} className="text-brand-400" /> {profile.address}</p>
          {profile.contact_person && <p className="flex items-center gap-2 text-ink/80"><UserCircle size={16} className="text-brand-400" /> {profile.contact_person}</p>}
          {profile.pickup_instructions && <p className="flex items-center gap-2 text-ink/80"><MessageSquare size={16} className="text-brand-400" /> {profile.pickup_instructions}</p>}
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
            <p className="text-xs text-ink/60 font-semibold">lb rescued</p>
          </div>
          <div>
            <p className="text-3xl font-bold text-brand-800">{profile.total_donations}</p>
            <p className="text-xs text-ink/60 font-semibold">donations</p>
          </div>
        </div>
        <p className="text-xs text-ink/50 mt-3 text-center">Since {new Date(profile.summary_since).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</p>
      </div>
    </div>
  );
}

function DonorForm({ profile, onDone }: { profile: Profile; onDone: () => void }) {
  const [donorType, setDonorType] = useState<DonorType>(profile.donor_type ?? 'individual');
  const [name, setName] = useState(profile.display_name ?? '');
  const [phone, setPhone] = useState(profile.phone ?? '');
  const [address, setAddress] = useState(profile.address ?? '');
  const [instructions, setInstructions] = useState(profile.pickup_instructions ?? '');
  const [contact, setContact] = useState(profile.contact_person ?? '');
  const [businessType, setBusinessType] = useState<BusinessType>(profile.business_type ?? 'cafe');
  const [closeTime, setCloseTime] = useState(profile.usual_close_time ?? '');
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
    setError(null);
    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          donor_type: donorType,
          display_name: name,
          phone,
          address,
          area_id: areaId,
          pickup_instructions: instructions || null,
          contact_person: contact || null,
          business_type: donorType === 'business' ? businessType : null,
          usual_close_time: donorType === 'business' ? closeTime || null : null,
        })
        .eq('id', profile.id);
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
      <h2 className="text-xl font-bold text-brand-800">Donor profile</h2>

      <div>
        <label className="label">Are you an individual or a business?</label>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => setDonorType('individual')}
            className={`flex items-center justify-center gap-2 rounded-xl border-2 py-3 font-semibold ${donorType === 'individual' ? 'border-brand-400 bg-brand-50 text-brand-800' : 'border-brand-100 bg-white text-ink/70'}`}
          >
            <User size={18} /> Individual
          </button>
          <button
            onClick={() => setDonorType('business')}
            className={`flex items-center justify-center gap-2 rounded-xl border-2 py-3 font-semibold ${donorType === 'business' ? 'border-brand-400 bg-brand-50 text-brand-800' : 'border-brand-100 bg-white text-ink/70'}`}
          >
            <Building2 size={18} /> Business
          </button>
        </div>
      </div>

      <div>
        <label className="label" htmlFor="dname">{donorType === 'business' ? 'Business name' : 'Your name'}</label>
        <input id="dname" className="input" value={name} onChange={(e) => setName(e.target.value)} />
      </div>

      {donorType === 'business' && (
        <>
          <div>
            <label className="label">Business type</label>
            <ChipSelect
              value={businessType}
              onChange={(v) => setBusinessType(v as BusinessType)}
              options={(Object.keys(BUSINESS_TYPE_LABELS) as BusinessType[]).map((k) => ({ label: BUSINESS_TYPE_LABELS[k], value: k }))}
            />
          </div>
          <div>
            <label className="label" htmlFor="close">Usual closing time</label>
            <input id="close" type="time" className="input" value={closeTime} onChange={(e) => setCloseTime(e.target.value)} />
          </div>
        </>
      )}

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
        <label className="label" htmlFor="dphone">Phone</label>
        <input id="dphone" type="tel" className="input" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="540-555-0100" />
      </div>
      <div>
        <label className="label" htmlFor="daddr">Pickup address</label>
        <input id="daddr" className="input" value={address} onChange={(e) => setAddress(e.target.value)} />
      </div>
      <div>
        <label className="label" htmlFor="dinst">Pickup instructions (optional)</label>
        <input id="dinst" className="input" value={instructions} onChange={(e) => setInstructions(e.target.value)} placeholder="Back door, ask for Pat" />
      </div>
      <div>
        <label className="label" htmlFor="dcontact">Contact person</label>
        <input id="dcontact" className="input" value={contact} onChange={(e) => setContact(e.target.value)} />
      </div>

      {error && <p className="text-danger text-sm font-medium">{error}</p>}
      <button onClick={save} className="btn-primary w-full" disabled={saving}>
        {saving ? 'Saving…' : 'Save profile'}
      </button>
    </div>
  );
}
