import type { ReactNode } from 'react';
import { Utensils } from 'lucide-react';

interface Props {
  children?: ReactNode;
  onSignOut?: () => void;
  onHome?: () => void;
  right?: ReactNode;
}

export function AppHeader({ children, onSignOut, onHome, right }: Props) {
  return (
    <header className="sticky top-0 z-20 bg-cream/95 backdrop-blur border-b border-brand-100">
      <div className="mx-auto max-w-app px-4 py-3 flex items-center gap-3">
        {onHome ? (
          <button onClick={onHome} className="flex items-center gap-2" aria-label="Home">
            <span className="bg-brand-800 text-white rounded-xl p-1.5">
              <Utensils size={20} />
            </span>
            <span className="font-bold text-brand-800 text-lg">Spare Plate</span>
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <span className="bg-brand-800 text-white rounded-xl p-1.5">
              <Utensils size={20} />
            </span>
            <span className="font-bold text-brand-800 text-lg">Spare Plate</span>
          </div>
        )}
        <div className="ml-auto flex items-center gap-2">
          {right}
          {onSignOut && (
            <button onClick={onSignOut} className="btn-ghost text-sm px-3 py-2">
              Sign out
            </button>
          )}
        </div>
      </div>
      {children && <div className="mx-auto max-w-app px-4 pb-3">{children}</div>}
    </header>
  );
}

export function Screen({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-cream">
      <div className="mx-auto max-w-app px-4 py-4">{children}</div>
    </div>
  );
}
