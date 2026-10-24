import { useState } from 'react';
import { Camera, Check, Soup, Croissant, Apple, Package, Milk, Snowflake, Thermometer, Flame } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import type { FoodType, CarrySize, TempNeeds, Listing } from '@/lib/types';
import { FOOD_TYPE_LABELS, FOOD_TYPE_SHELF_LIFE, CARRY_SIZE_LABELS, TEMP_LABELS } from '@/lib/types';
import { ChipSelect } from '@/components/ChipSelect';
import { formatDateShort, formatTime } from '@/lib/utils';

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
  onDone: () => void;
  repeatFrom?: Listing | null;
}

export function PostListing({ onDone, repeatFrom }: Props) {
  const { profile } = useAuth();
  const [foodText, setFoodText] = useState(repeatFrom?.food_text ?? '');
  const [foodType, setFoodType] = useState<FoodType>(repeatFrom?.food_type ?? 'prepared_meal');
  const [quantity, setQuantity] = useState(String(repeatFrom?.quantity ?? ''));
  const [unit, setUnit] = useState(repeatFrom?.unit ?? 'servings');
  const [carrySize, setCarrySize] = useState<CarrySize>(repeatFrom?.carry_size ?? 'one_bag');
  const [pickupBy, setPickupBy] = useState('');
  const [tempNeeds, setTempNeeds] = useState<TempNeeds>(repeatFrom?.temp_needs ?? 'room_temp');
  const [address, setAddress] = useState(repeatFrom?.address ?? profile?.address ?? '');
  const [instructions, setInstructions] = useState(repeatFrom?.pickup_instructions ?? profile?.pickup_instructions ?? '');
  const [allergens, setAllergens] = useState(repeatFrom?.allergens ?? '');
  const [shelfLife, setShelfLife] = useState(String(repeatFrom?.shelf_life_hours ?? FOOD_TYPE_SHELF_LIFE['prepared_meal']));
  const [pounds, setPounds] = useState(String(repeatFrom?.pounds ?? ''));
  const [safety, setSafety] = useState(false);
  const [photoUrl, setPhotoUrl] = useState<string | null>(repeatFrom?.photo_url ?? null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function onFoodTypeChange(v: FoodType) {
    setFoodType(v);
    setShelfLife(String(FOOD_TYPE_SHELF_LIFE[v]));
  }

  async function uploadPhoto(file: File) {
    setUploading(true);
    setError(null);
    try {
      const ext = file.name.split('.').pop() ?? 'jpg';
      const path = `${profile!.id}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from('listing-photos').upload(path, file, { upsert: true });
      if (upErr) throw upErr;
      const { data } = supabase.storage.from('listing-photos').getPublicUrl(path);
      setPhotoUrl(data.publicUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  }

  async function submit() {
    setError(null);
    if (!safety) { setError('Please confirm the food was stored safely.'); return; }
    if (!foodText || !quantity || !address || !pickupBy) {
      setError('Please fill in all required fields.'); return;
    }
    setSaving(true);
    try {
      const by = new Date(pickupBy).toISOString();
      const { error } = await supabase.from('listings').insert({
        donor_id: profile!.id,
        area_id: profile!.area_id,
        food_text: foodText,
        food_type: foodType,
        quantity: parseFloat(quantity),
        unit,
        carry_size: carrySize,
        pickup_by: by,
        temp_needs: tempNeeds,
        address,
        pickup_instructions: instructions || null,
        allergens: allergens || null,
        photo_url: photoUrl,
        shelf_life_hours: parseInt(shelfLife, 10),
        pounds: parseFloat(pounds) || 0,
        safety_confirmed: safety,
        status: 'posted',
      });
      if (error) throw error;
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not post listing');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="card p-5 space-y-4">
        <h2 className="text-xl font-bold text-brand-800">Post food</h2>

        <div>
          <label className="label" htmlFor="ftext">What is it?</label>
          <input id="ftext" className="input" value={foodText} onChange={(e) => setFoodText(e.target.value)} placeholder="Tomato soup and bread rolls" />
        </div>

        <div>
          <label className="label">Food type</label>
          <div className="grid grid-cols-3 gap-2">
            {(Object.keys(FOOD_TYPE_LABELS) as FoodType[]).map((k) => {
              const Icon = FOOD_ICON[k];
              return (
                <button
                  key={k}
                  onClick={() => onFoodTypeChange(k)}
                  className={`flex flex-col items-center gap-1 rounded-xl border-2 py-3 text-xs font-semibold ${foodType === k ? 'border-brand-400 bg-brand-50 text-brand-800' : 'border-brand-100 bg-white text-ink/70'}`}
                >
                  <Icon size={22} /> {FOOD_TYPE_LABELS[k]}
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="qty">How much?</label>
            <input id="qty" type="number" className="input" value={quantity} onChange={(e) => setQuantity(e.target.value)} placeholder="12" />
          </div>
          <div>
            <label className="label" htmlFor="unit">Unit</label>
            <input id="unit" className="input" value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="servings" />
          </div>
        </div>

        <div>
          <label className="label">Size to carry</label>
          <ChipSelect
            value={carrySize}
            onChange={(v) => setCarrySize(v as CarrySize)}
            options={(Object.keys(CARRY_SIZE_LABELS) as CarrySize[]).map((k) => ({ label: CARRY_SIZE_LABELS[k], value: k }))}
          />
        </div>

        <div>
          <label className="label" htmlFor="pb">Pick up by</label>
          <input id="pb" type="datetime-local" className="input" value={pickupBy} onChange={(e) => setPickupBy(e.target.value)} />
        </div>

        <div>
          <label className="label">Temperature</label>
          <div className="grid grid-cols-3 gap-2">
            {(Object.keys(TEMP_LABELS) as TempNeeds[]).map((k) => {
              const Icon = TEMP_ICON[k];
              return (
                <button
                  key={k}
                  onClick={() => setTempNeeds(k)}
                  className={`flex flex-col items-center gap-1 rounded-xl border-2 py-3 text-xs font-semibold ${tempNeeds === k ? 'border-brand-400 bg-brand-50 text-brand-800' : 'border-brand-100 bg-white text-ink/70'}`}
                >
                  <Icon size={22} /> {TEMP_LABELS[k]}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label className="label" htmlFor="daddr">Pickup address</label>
          <input id="daddr" className="input" value={address} onChange={(e) => setAddress(e.target.value)} />
        </div>
        <div>
          <label className="label" htmlFor="dinst">Pickup instructions (optional)</label>
          <input id="dinst" className="input" value={instructions} onChange={(e) => setInstructions(e.target.value)} />
        </div>

        <div>
          <label className="label" htmlFor="aller">Allergen notes (optional)</label>
          <input id="aller" className="input" value={allergens} onChange={(e) => setAllergens(e.target.value)} placeholder="Contains wheat, dairy" />
        </div>

        <div>
          <label className="label" htmlFor="shelf">Shelf life (hours)</label>
          <input id="shelf" type="number" className="input" value={shelfLife} onChange={(e) => setShelfLife(e.target.value)} />
        </div>

        <div>
          <label className="label" htmlFor="lbs">Estimated pounds (for impact tracking)</label>
          <input id="lbs" type="number" step="0.1" className="input" value={pounds} onChange={(e) => setPounds(e.target.value)} placeholder="8" />
        </div>

        <div>
          <label className="label">Photo (optional)</label>
          <label className="btn-outline w-full cursor-pointer">
            <Camera size={20} /> {uploading ? 'Uploading…' : photoUrl ? 'Photo added — change' : 'Add photo'}
            <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && uploadPhoto(e.target.files[0])} />
          </label>
          {photoUrl && <img src={photoUrl} alt="Food" className="mt-2 rounded-xl w-full max-h-48 object-cover" />}
        </div>

        <label className="flex items-start gap-3 rounded-xl bg-brand-50 border border-brand-100 p-3 cursor-pointer">
          <button
            type="button"
            onClick={() => setSafety(!safety)}
            className={`mt-0.5 shrink-0 rounded-lg w-6 h-6 flex items-center justify-center ${safety ? 'bg-brand-800 text-white' : 'bg-white border-2 border-brand-200'}`}
            aria-pressed={safety}
          >
            {safety && <Check size={16} />}
          </button>
          <span className="text-sm font-semibold text-ink">This food was stored safely and is not past its date.</span>
        </label>

        {error && <p className="text-danger text-sm font-medium">{error}</p>}
        <button onClick={submit} className="btn-primary w-full" disabled={saving}>
          {saving ? 'Posting…' : 'Post this food'}
        </button>
      </div>

      {repeatFrom && (
        <p className="text-xs text-ink/50 text-center">Repeating listing from {formatDateShort(repeatFrom.created_at)} · {formatTime(repeatFrom.created_at)}</p>
      )}
    </div>
  );
}
