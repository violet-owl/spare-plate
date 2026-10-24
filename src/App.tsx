import { useState } from 'react';
import { Home, List, User, Bike, MapPin } from 'lucide-react';
import { AuthProvider, useAuth } from '@/lib/auth';
import type { Role } from '@/lib/types';
import { Landing } from '@/screens/Landing';
import { ReceiverPage } from '@/screens/ReceiverPage';
import { AppHeader, Screen } from '@/components/Layout';
import { CommunityTotal } from '@/components/CommunityTotal';
import { DonorProfile } from '@/screens/donor/DonorProfile';
import { DonorListings } from '@/screens/donor/DonorListings';
import { PostListing } from '@/screens/donor/PostListing';
import { RunnerProfile } from '@/screens/runner/RunnerProfile';
import { RunnerFeed } from '@/screens/runner/RunnerFeed';
import { RunnerJob } from '@/screens/runner/RunnerJob';
import { ServiceRecord } from '@/screens/runner/ServiceRecord';
import { HostProfile } from '@/screens/host/HostProfile';
import { HostIncoming } from '@/screens/host/HostIncoming';
import type { Listing } from '@/lib/types';

type Tab = 'home' | 'list' | 'profile';

function AppInner() {
  const { session, profile, loading, signOut } = useAuth();
  const [receiverMode, setReceiverMode] = useState(false);
  const [tab, setTab] = useState<Tab>('home');
  const [posting, setPosting] = useState(false);
  const [repeatFrom, setRepeatFrom] = useState<Listing | null>(null);
  const [runnerService, setRunnerService] = useState(false);
  const [hostIncoming, setHostIncoming] = useState(false);

  if (loading) {
    return <div className="min-h-screen bg-cream flex items-center justify-center"><p className="text-brand-400 font-semibold">Loading…</p></div>;
  }

  if (receiverMode) {
    return <ReceiverPage onBack={() => setReceiverMode(false)} />;
  }

  if (!session || !profile) {
    return <Landing onGoReceiver={() => setReceiverMode(true)} />;
  }

  function goHome() {
    setTab('home');
    setPosting(false);
    setRunnerService(false);
    setHostIncoming(false);
  }

  const role = profile.role;

  // Donor screens
  if (role === 'donor') {
    const needsProfile = !profile.address;
    if (needsProfile && tab !== 'profile') setTab('profile');
    return (
      <Shell role={role} tab={tab} setTab={setTab} signOut={signOut} goHome={goHome}
        receiverBtn={<button onClick={() => setReceiverMode(true)} className="btn-ghost text-sm px-2 py-1.5"><MapPin size={16} /></button>}>
        {tab === 'profile' ? <DonorProfile /> : posting ? (
          <PostListing repeatFrom={repeatFrom} onDone={() => { setPosting(false); setRepeatFrom(null); setTab('list'); }} />
        ) : tab === 'list' ? (
          <DonorListings onPost={() => { setRepeatFrom(null); setPosting(true); }} onRepeat={(l) => { setRepeatFrom(l); setPosting(true); }} />
        ) : (
          <div className="space-y-4">
            <CommunityTotal />
            <DonorListings onPost={() => { setRepeatFrom(null); setPosting(true); }} onRepeat={(l) => { setRepeatFrom(l); setPosting(true); }} />
          </div>
        )}
      </Shell>
    );
  }

  // Runner screens
  if (role === 'runner') {
    const needsProfile = !profile.travel_mode;
    if (needsProfile && tab !== 'profile') setTab('profile');
    return (
      <Shell role={role} tab={tab} setTab={setTab} signOut={signOut} goHome={goHome}
        receiverBtn={<button onClick={() => setReceiverMode(true)} className="btn-ghost text-sm px-2 py-1.5"><MapPin size={16} /></button>}>
        {runnerService ? (
          <ServiceRecord onBack={() => setRunnerService(false)} />
        ) : tab === 'profile' ? (
          <RunnerProfile onServiceRecord={() => setRunnerService(true)} />
        ) : tab === 'list' ? (
          <RunnerFeed onClaimed={() => setTab('home')} />
        ) : (
          <RunnerJob onDone={() => setTab('list')} />
        )}
      </Shell>
    );
  }

  // Host screens
  if (role === 'host') {
    const needsProfile = !profile.site_address;
    if (needsProfile && tab !== 'profile') setTab('profile');
    return (
      <Shell role={role} tab={tab} setTab={setTab} signOut={signOut} goHome={goHome}
        receiverBtn={<button onClick={() => setReceiverMode(true)} className="btn-ghost text-sm px-2 py-1.5"><MapPin size={16} /></button>}>
        {hostIncoming ? (
          <HostIncoming onBack={() => setHostIncoming(false)} />
        ) : tab === 'profile' ? (
          <HostProfile onIncoming={() => setHostIncoming(true)} />
        ) : tab === 'list' ? (
          <HostIncoming onBack={() => setTab('home')} />
        ) : (
          <div className="space-y-4">
            <CommunityTotal />
            <HostProfile onIncoming={() => setHostIncoming(true)} />
          </div>
        )}
      </Shell>
    );
  }

  return <Landing onGoReceiver={() => setReceiverMode(true)} />;
}

interface ShellProps {
  role: Role;
  tab: Tab;
  setTab: (t: Tab) => void;
  signOut: () => void;
  goHome: () => void;
  receiverBtn: React.ReactNode;
  children: React.ReactNode;
}

function Shell({ role, tab, setTab, signOut, goHome, receiverBtn, children }: ShellProps) {
  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: 'home', label: role === 'donor' ? 'Home' : role === 'runner' ? 'My job' : 'Home', icon: <Home size={22} /> },
    { key: 'list', label: role === 'donor' ? 'My listings' : role === 'runner' ? 'Feed' : 'Incoming', icon: role === 'runner' ? <Bike size={22} /> : <List size={22} /> },
    { key: 'profile', label: 'Profile', icon: <User size={22} /> },
  ];

  return (
    <div className="min-h-screen bg-cream">
      <AppHeader onHome={goHome} onSignOut={signOut} right={receiverBtn} />
      <Screen>
        {children}
      </Screen>
      <nav className="fixed bottom-0 inset-x-0 bg-white border-t border-brand-100 z-20">
        <div className="mx-auto max-w-app grid grid-cols-3">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex flex-col items-center gap-0.5 py-2.5 font-semibold text-xs ${tab === t.key ? 'text-brand-800' : 'text-ink/40'}`}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>
      </nav>
      <div className="h-16" />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppInner />
    </AuthProvider>
  );
}
