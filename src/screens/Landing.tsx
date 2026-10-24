import { useState } from 'react';
import { Utensils, Heart, Bike, Home, MapPin, Users } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import type { Role } from '@/lib/types';

const DEMO_ACCOUNTS: { role: Role; label: string; email: string; desc: string }[] = [
  { role: 'donor', label: 'Donor — Amy (individual)', email: 'donor1@spareplate.app', desc: 'Post leftover food' },
  { role: 'donor', label: 'Donor — Bakery (business)', email: 'donor2@spareplate.app', desc: 'Post leftover food' },
  { role: 'donor', label: 'Donor — Cafe (business)', email: 'donor3@spareplate.app', desc: 'Post leftover food' },
  { role: 'runner', label: 'Runner — Jordan (adult, bike)', email: 'runner1@spareplate.app', desc: 'Pick up & deliver' },
  { role: 'runner', label: 'Runner — Sam (under 18, walk)', email: 'runner2@spareplate.app', desc: 'Walkable jobs only' },
  { role: 'host', label: 'Host — Downtown Greens Fridge', email: 'host1@spareplate.app', desc: 'Runs a drop-off site' },
  { role: 'host', label: 'Host — UMW Gwen Hale Center', email: 'host2@spareplate.app', desc: 'Runs a drop-off site' },
];

interface Props {
  onGoReceiver: () => void;
}

export function Landing({ onGoReceiver }: Props) {
  const { refreshProfile } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [role, setRole] = useState<Role>('donor');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (mode === 'signin') {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { role, display_name: displayName || email.split('@')[0] } },
        });
        if (error) throw error;
        await refreshProfile();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setBusy(false);
    }
  }

  async function demoLogin(emailAddr: string) {
    setError(null);
    setBusy(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: emailAddr,
        password: 'demo1234',
      });
      if (error) throw error;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Demo login failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-cream">
      <div className="mx-auto max-w-app px-4 py-6">
        <div className="text-center pt-4 pb-6">
          <span className="inline-flex bg-brand-800 text-white rounded-2xl p-3 mb-3">
            <Utensils size={32} />
          </span>
          <h1 className="text-3xl font-bold text-brand-800">Spare Plate</h1>
          <p className="text-ink/70 mt-2 max-w-sm mx-auto">
            Rescue leftover food. Share it with neighbors who need it. Volunteers carry it door to door.
          </p>
        </div>

        <div className="card p-4 mb-5 text-center">
          <button
            onClick={onGoReceiver}
            className="btn-outline w-full"
          >
            <MapPin size={20} /> Just looking for food? Find food near me
          </button>
        </div>

        <div className="card p-5 mb-5">
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setMode('signin')}
              className={`flex-1 py-2 rounded-xl font-semibold ${mode === 'signin' ? 'bg-brand-800 text-white' : 'bg-brand-50 text-brand-800'}`}
            >
              Sign in
            </button>
            <button
              onClick={() => setMode('signup')}
              className={`flex-1 py-2 rounded-xl font-semibold ${mode === 'signup' ? 'bg-brand-800 text-white' : 'bg-brand-50 text-brand-800'}`}
            >
              Sign up
            </button>
          </div>

          <form onSubmit={submit} className="space-y-3">
            {mode === 'signup' && (
              <div>
                <label className="label" htmlFor="role">I am a…</label>
                <div className="grid grid-cols-3 gap-2">
                  {([
                    { r: 'donor', icon: <Heart size={18} />, label: 'Donor' },
                    { r: 'runner', icon: <Bike size={18} />, label: 'Runner' },
                    { r: 'host', icon: <Home size={18} />, label: 'Host' },
                  ] as const).map((o) => (
                    <button
                      key={o.r}
                      type="button"
                      onClick={() => setRole(o.r)}
                      className={`flex flex-col items-center gap-1 rounded-xl border-2 py-3 font-semibold ${
                        role === o.r ? 'border-brand-400 bg-brand-50 text-brand-800' : 'border-brand-100 bg-white text-ink/70'
                      }`}
                    >
                      {o.icon}
                      {o.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {mode === 'signup' && (
              <div>
                <label className="label" htmlFor="name">Name (or business name)</label>
                <input id="name" className="input" value={displayName} onChange={(e) => setDisplayName(e.target.value)} required />
              </div>
            )}
            <div>
              <label className="label" htmlFor="email">Email</label>
              <input id="email" type="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
            </div>
            <div>
              <label className="label" htmlFor="pw">Password</label>
              <input id="pw" type="password" className="input" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete={mode === 'signin' ? 'current-password' : 'new-password'} />
            </div>
            {error && <p className="text-danger text-sm font-medium">{error}</p>}
            <button type="submit" className="btn-primary w-full" disabled={busy}>
              {busy ? 'Please wait…' : mode === 'signin' ? 'Sign in' : 'Create account'}
            </button>
          </form>
        </div>

        <div className="card-soft p-4 mb-5">
          <p className="font-semibold text-brand-800 mb-3 flex items-center gap-2">
            <Users size={18} /> Try a demo role
          </p>
          <div className="space-y-2">
            {DEMO_ACCOUNTS.map((a) => (
              <button
                key={a.email}
                onClick={() => demoLogin(a.email)}
                disabled={busy}
                className="w-full flex items-center justify-between rounded-xl bg-white border border-brand-100 px-4 py-3 text-left hover:bg-brand-50 disabled:opacity-50"
              >
                <div>
                  <p className="font-semibold text-ink text-sm">{a.label}</p>
                  <p className="text-xs text-ink/60">{a.desc}</p>
                </div>
                <span className="text-brand-400 text-sm font-semibold">Open</span>
              </button>
            ))}
          </div>
          <p className="text-xs text-ink/50 mt-3">All demo passwords: <span className="font-mono font-semibold">demo1234</span></p>
        </div>

        <div className="pb-8" />
      </div>
    </div>
  );
}
