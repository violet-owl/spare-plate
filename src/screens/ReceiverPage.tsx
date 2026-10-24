import { useState, useEffect, useCallback } from 'react';
import { MapPin, Footprints, Clock, Navigation, Phone, Volume2, X, Utensils, Snowflake, Soup, Croissant, Apple, Package, Milk } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { AvailableFood, FoodType } from '@/lib/types';
import { haversineMiles, walkMinutes, mapsUrl, telUrl, hoursAgo, timeLeft } from '@/lib/utils';

const ES: Record<string, string> = {
  findFood: 'Buscar comida cerca de mí',
  findFoodSub: 'Toca para usar tu ubicación',
  pickArea: 'O elige un barrio',
  available: 'Comida disponible ahora',
  none: 'No hay comida disponible ahora misma',
  noneTip: 'El sitio más cercano abierto es:',
  directions: 'Indicaciones',
  call: 'Llamar',
  open: 'Abierto',
  closed: 'Cerrado',
  droppedAgo: 'Entregado hace',
  listen: 'Escuchar',
  stop: 'Detener',
  back: 'Volver al inicio',
  miles: 'mi',
  min: 'min a pie',
};

const EN: Record<string, string> = {
  findFood: 'Find food near me',
  findFoodSub: 'Tap to use your location',
  pickArea: 'Or pick a neighborhood',
  available: 'Food available now',
  none: 'No food available right now',
  noneTip: 'The nearest open site is:',
  directions: 'Directions',
  call: 'Call',
  open: 'Open',
  closed: 'Closed',
  droppedAgo: 'Dropped off',
  listen: 'Read aloud',
  stop: 'Stop',
  back: 'Back to home',
  miles: 'mi',
  min: 'min walk',
};

const NEIGHBORHOODS = [
  { label: 'Downtown Fredericksburg', lat: 38.3032, lng: -77.4605 },
  { label: 'College Ave / UMW', lat: 38.3040, lng: -77.4645 },
  { label: 'Fairview', lat: 38.2985, lng: -77.4590 },
  { label: 'Chatham Heights', lat: 38.3120, lng: -77.4500 },
  { label: 'Eastland / Courthouse Rd', lat: 38.2820, lng: -77.4200 },
];

const FOOD_ICONS: Record<FoodType, typeof Soup> = {
  prepared_meal: Soup,
  baked_goods: Croissant,
  produce: Apple,
  packaged: Package,
  drinks: Milk,
};

interface Props {
  onBack: () => void;
}

export function ReceiverPage({ onBack }: Props) {
  const [lang, setLang] = useState<'en' | 'es'>('en');
  const t = lang === 'es' ? ES : EN;
  const [food, setFood] = useState<AvailableFood[]>([]);
  const [loading, setLoading] = useState(true);
  const [origin, setOrigin] = useState<{ lat: number; lng: number } | null>(null);
  const [locError, setLocError] = useState<string | null>(null);
  const [showAreas, setShowAreas] = useState(false);
  const [speakingId, setSpeakingId] = useState<string | null>(null);

  const loadFood = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('available_food').select('*');
    setFood((data as AvailableFood[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadFood();
    const interval = setInterval(loadFood, 30000);
    return () => clearInterval(interval);
  }, [loadFood]);

  function useLocation() {
    setLocError(null);
    if (!navigator.geolocation) {
      setLocError('Location not supported on this device. Pick a neighborhood.');
      setShowAreas(true);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setOrigin({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setShowAreas(false);
      },
      () => {
        setLocError('Location declined. Pick a neighborhood to sort the list.');
        setShowAreas(true);
      },
      { timeout: 8000 }
    );
  }

  function stopSpeaking() {
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    setSpeakingId(null);
  }

  function speak(id: string, text: string) {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    if (speakingId === id) {
      setSpeakingId(null);
      return;
    }
    const u = new SpeechSynthesisUtterance(text);
    u.lang = lang === 'es' ? 'es-US' : 'en-US';
    u.rate = 0.9;
    u.onend = () => setSpeakingId(null);
    setSpeakingId(id);
    window.speechSynthesis.speak(u);
  }

  const sorted = origin
    ? [...food].sort((a, b) => {
        const da = a.site_lat && a.site_lng ? haversineMiles(origin.lat, origin.lng, a.site_lat, a.site_lng) : 999;
        const db = b.site_lat && b.site_lng ? haversineMiles(origin.lat, origin.lng, b.site_lat, b.site_lng) : 999;
        return da - db;
      })
    : food;

  function isOpen(_f: AvailableFood): boolean {
    return true;
  }

  const nearestOpen = sorted.find((f) => isOpen(f));

  return (
    <div className="min-h-screen bg-cream">
      <header className="sticky top-0 z-20 bg-cream/95 backdrop-blur border-b border-brand-100">
        <div className="mx-auto max-w-app px-4 py-3 flex items-center gap-2">
          <span className="bg-brand-800 text-white rounded-xl p-1.5">
            <Utensils size={20} />
          </span>
          <span className="font-bold text-brand-800 text-lg">Spare Plate</span>
          <div className="ml-auto flex items-center gap-1">
            <button
              onClick={() => { setLang('en'); stopSpeaking(); }}
              className={`px-3 py-1.5 rounded-lg font-bold text-sm ${lang === 'en' ? 'bg-brand-800 text-white' : 'bg-brand-50 text-brand-800'}`}
            >
              EN
            </button>
            <button
              onClick={() => { setLang('es'); stopSpeaking(); }}
              className={`px-3 py-1.5 rounded-lg font-bold text-sm ${lang === 'es' ? 'bg-brand-800 text-white' : 'bg-brand-50 text-brand-800'}`}
            >
              ES
            </button>
            <button onClick={() => { onBack(); stopSpeaking(); }} className="ml-1 text-brand-400 p-1.5" aria-label={t.back}>
              <X size={20} />
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-app px-4 py-4">
        {!origin && (
          <div className="card p-6 text-center mb-4">
            <button onClick={useLocation} className="btn-primary w-full text-lg py-4">
              <MapPin size={24} /> {t.findFood}
            </button>
            <p className="text-ink/60 text-sm mt-2">{t.findFoodSub}</p>
            {locError && <p className="text-amber font-semibold text-sm mt-2">{locError}</p>}
            <button onClick={() => setShowAreas(true)} className="btn-ghost mt-2 text-sm">
              {t.pickArea}
            </button>
          </div>
        )}

        {showAreas && (
          <div className="card p-4 mb-4">
            <p className="font-semibold text-brand-800 mb-3">{t.pickArea}</p>
            <div className="space-y-2">
              {NEIGHBORHOODS.map((n) => (
                <button
                  key={n.label}
                  onClick={() => { setOrigin({ lat: n.lat, lng: n.lng }); setShowAreas(false); }}
                  className="w-full flex items-center gap-2 rounded-xl bg-brand-50 border border-brand-100 px-4 py-3 text-left font-semibold text-ink hover:bg-brand-100"
                >
                  <MapPin size={18} className="text-brand-400" /> {n.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {origin && (
          <div className="flex items-center justify-between mb-3">
            <p className="font-bold text-brand-800 text-lg">{t.available}</p>
            <button onClick={() => setOrigin(null)} className="text-sm text-brand-400 font-semibold">
              {t.pickArea}
            </button>
          </div>
        )}

        {loading && <p className="text-center text-ink/50 py-8">…</p>}

        {!loading && sorted.length === 0 && (
          <div className="card p-6 text-center">
            <p className="text-lg font-semibold text-ink mb-2">{t.none}</p>
            {nearestOpen && (
              <div className="mt-4">
                <p className="text-sm text-ink/60 mb-2">{t.noneTip}</p>
                <p className="font-bold text-brand-800">{nearestOpen.site_name}</p>
                <p className="text-sm text-ink/60">{nearestOpen.site_address}</p>
                <a href={mapsUrl(nearestOpen.site_lat, nearestOpen.site_lng, nearestOpen.site_address)} target="_blank" rel="noreferrer" className="btn-primary mt-3 inline-flex">
                  <Navigation size={20} /> {t.directions}
                </a>
              </div>
            )}
          </div>
        )}

        <div className="space-y-4">
          {sorted.map((f) => {
            const Icon = FOOD_ICONS[f.food_type];
            const dist = origin && f.site_lat && f.site_lng
              ? haversineMiles(origin.lat, origin.lng, f.site_lat, f.site_lng)
              : null;
            const walk = dist !== null ? walkMinutes(dist) : null;
            const fresh = timeLeft(f.expires_at);
            const open = isOpen(f);
            const freshColor = fresh.level === 'green' ? 'bg-success' : fresh.level === 'amber' ? 'bg-amber' : 'bg-danger';
            const speakText = lang === 'es'
              ? `${f.food_text}. En ${f.site_name}. ${dist ? `A ${dist.toFixed(1)} millas, ${walk} minutos a pie.` : ''} ${open ? 'Abierto ahora' : 'Cerrado ahora'}. ${fresh.label}. Entregado hace ${hoursAgo(f.delivered_at)}.`
              : `${f.food_text}. At ${f.site_name}. ${dist ? `${dist.toFixed(1)} miles, ${walk} minute walk.` : ''} ${open ? 'Open now' : 'Closed now'}. ${fresh.label}. Dropped off ${hoursAgo(f.delivered_at)}.`;

            return (
              <div key={f.id} className="card overflow-hidden">
                <div className="flex items-start gap-3 p-4">
                  <div className="shrink-0 bg-brand-50 rounded-xl p-3">
                    <Icon size={36} className="text-brand-800" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-lg text-ink leading-tight">{f.food_text}</h3>
                    <p className="text-ink/70 text-sm font-semibold">{f.site_name}</p>
                    {f.temp_needs === 'cold' && (
                      <span className="inline-flex items-center gap-1 text-xs text-brand-600 font-semibold mt-1">
                        <Snowflake size={14} /> Keep cold
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => speakingId === f.id ? stopSpeaking() : speak(f.id, speakText)}
                    className="shrink-0 rounded-xl bg-brand-50 p-2.5 text-brand-800"
                    aria-label={speakingId === f.id ? t.stop : t.listen}
                  >
                    <Volume2 size={22} className={speakingId === f.id ? 'fill-brand-800' : ''} />
                  </button>
                </div>

                <div className="px-4 pb-3 space-y-2.5">
                  {dist !== null && (
                    <div className="flex items-center gap-2 text-ink font-semibold">
                      <Footprints size={18} className="text-brand-400" />
                      <span>{dist.toFixed(1)} {t.miles}</span>
                      <span className="text-ink/50">·</span>
                      <span className="text-ink/70">{walk} {t.min}</span>
                    </div>
                  )}

                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <Clock size={18} className={open ? 'text-success' : 'text-danger'} />
                    <span className={open ? 'text-success' : 'text-danger'}>{open ? t.open : t.closed}</span>
                    <span className="text-ink/40">·</span>
                    <span className="text-ink/60">{f.site_hours}</span>
                  </div>

                  <div>
                    <div className="flex items-center justify-between text-xs font-semibold mb-1">
                      <span className="text-ink/70 flex items-center gap-1">
                        <Clock size={14} /> {fresh.label}
                      </span>
                      <span className="text-ink/50">{hoursAgo(f.delivered_at)}</span>
                    </div>
                    <div className="h-2 rounded-full bg-brand-100 overflow-hidden">
                      <div className={`h-full rounded-full ${freshColor}`} style={{ width: `${fresh.pct}%` }} />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 p-4 pt-0">
                  <a href={mapsUrl(f.site_lat, f.site_lng, f.site_address)} target="_blank" rel="noreferrer" className="btn-primary">
                    <Navigation size={20} /> {t.directions}
                  </a>
                  <a href={telUrl(f.phone)} className="btn-outline">
                    <Phone size={20} /> {t.call}
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
