import { useState, type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';

interface Option {
  label: string;
  value: string;
  icon?: ReactNode;
}

interface Props {
  label?: string;
  value: string;
  options: Option[];
  onChange: (value: string) => void;
}

export function ChipSelect({ label, value, options, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between rounded-xl border-2 border-brand-100 bg-white px-4 py-3 text-left font-semibold text-ink"
        aria-label={label}
      >
        <span className="flex items-center gap-2">
          {selected?.icon}
          {selected?.label ?? label ?? 'Select'}
        </span>
        <ChevronDown size={18} className="text-brand-400" />
      </button>
      {open && (
        <div className="absolute z-30 mt-1 w-full rounded-xl border-2 border-brand-100 bg-white shadow-lg overflow-hidden">
          {options.map((o) => (
            <button
              key={o.value}
              type="button"
              onClick={() => {
                onChange(o.value);
                setOpen(false);
              }}
              className={`w-full flex items-center gap-2 px-4 py-3 text-left hover:bg-brand-50 ${
                o.value === value ? 'bg-brand-50 font-bold text-brand-800' : 'text-ink'
              }`}
            >
              {o.icon}
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
