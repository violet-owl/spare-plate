import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { formatDateShort } from '@/lib/utils';

interface Props {
  onBack: () => void;
}

export function ServiceRecord({ onBack }: Props) {
  const { profile } = useAuth();
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    if (!profile) return;
    setLoading(true);
    setError(null);
    try {
      const fromD = from ? new Date(from) : new Date(profile.summary_since);
      const toD = to ? new Date(to) : new Date();
      const { data: deliveries } = await supabase
        .from('listings')
        .select('id, food_text, delivered_at, claimed_at, site_id')
        .eq('runner_id', profile.id)
        .eq('status', 'delivered')
        .gte('delivered_at', fromD.toISOString())
        .lte('delivered_at', toD.toISOString())
        .order('delivered_at', { ascending: true });

      type DeliveryRow = { id: string; food_text: string; delivered_at: string; claimed_at: string; site_id: string };
      const rows = (deliveries as DeliveryRow[]) ?? [];
      const siteIds = [...new Set(rows.map((r: { site_id: string }) => r.site_id).filter(Boolean))] as string[];
      const { data: hosts } = await supabase
        .from('profiles')
        .select('id, display_name, phone, site_address')
        .in('id', siteIds);
      const hostMap: Record<string, { display_name: string; phone: string; site_address: string }> = {};
      (hosts ?? []).forEach((h: { id: string; display_name: string; phone: string; site_address: string }) => {
        hostMap[h.id] = h;
      });

      const totalHours = rows.reduce((sum: number, r: { claimed_at: string; delivered_at: string }) => {
        const hrs = Math.max(0.25, (new Date(r.delivered_at).getTime() - new Date(r.claimed_at).getTime()) / 3600000);
        return sum + hrs;
      }, 0);

      const html = buildPdfHtml({
        runnerName: profile.display_name,
        schoolGroup: profile.school_group ?? '',
        fromDate: formatDateShort(fromD.toISOString()),
        toDate: formatDateShort(toD.toISOString()),
        rows: rows.map((r) => {
          const host = hostMap[r.site_id];
          const hrs = Math.max(0.25, (new Date(r.delivered_at).getTime() - new Date(r.claimed_at).getTime()) / 3600000);
          return {
            date: formatDateShort(r.delivered_at),
            siteName: host?.display_name ?? '—',
            siteAddress: host?.site_address ?? '—',
            desc: r.food_text,
            hours: hrs.toFixed(2),
            hostName: host?.display_name ?? '—',
            hostPhone: host?.phone ?? '—',
          };
        }),
        totalHours: totalHours.toFixed(2),
        totalDeliveries: rows.length,
      });

      openPrintWindow(html);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not generate record');
    } finally {
      setLoading(false);
    }
  }

  function openPrintWindow(html: string) {
    const w = window.open('', '_blank');
    if (!w) { setError('Pop-up blocked. Allow pop-ups to print your record.'); return; }
    w.document.write(html);
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 400);
  }

  return (
    <div className="space-y-4">
      <button onClick={onBack} className="btn-ghost text-sm">Back</button>
      <div className="card p-5 space-y-4">
        <h2 className="text-xl font-bold text-brand-800">My service record</h2>
        <p className="text-sm text-ink/60">Pick a date range and print a record for a parent, teacher, or scout leader to sign.</p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="from">From</label>
            <input id="from" type="date" className="input" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div>
            <label className="label" htmlFor="to">To</label>
            <input id="to" type="date" className="input" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
        </div>
        {error && <p className="text-danger text-sm font-medium">{error}</p>}
        <button onClick={generate} disabled={loading} className="btn-primary w-full">
          {loading ? 'Building…' : 'Generate printable record'}
        </button>
      </div>
    </div>
  );
}

function buildPdfHtml(opts: {
  runnerName: string;
  schoolGroup: string;
  fromDate: string;
  toDate: string;
  rows: { date: string; siteName: string; siteAddress: string; desc: string; hours: string; hostName: string; hostPhone: string }[];
  totalHours: string;
  totalDeliveries: number;
}): string {
  const rowsHtml = opts.rows.map((r) => `
    <tr>
      <td>${r.date}</td>
      <td>${r.siteName}<br/><span style="font-size:10px;color:#666">${r.siteAddress}</span></td>
      <td>${r.desc}</td>
      <td style="text-align:center">${r.hours}</td>
      <td>${r.hostName}<br/><span style="font-size:10px;color:#666">${r.hostPhone}</span></td>
    </tr>`).join('');

  return `<!doctype html><html><head><title>Service Record — ${opts.runnerName}</title>
  <style>
    * { font-family: Georgia, serif; color: #1F1A2B; }
    body { padding: 40px; max-width: 800px; margin: 0 auto; }
    h1 { color: #4B2A7B; font-size: 22px; margin-bottom: 4px; }
    h2 { font-size: 14px; color: #666; font-weight: normal; margin-top: 0; }
    .info { margin: 16px 0; font-size: 14px; }
    .info b { color: #4B2A7B; }
    table { width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 12px; }
    th { background: #F3EEFA; color: #4B2A7B; text-align: left; padding: 8px; border-bottom: 2px solid #4B2A7B; }
    td { padding: 8px; border-bottom: 1px solid #ddd; vertical-align: top; }
    .totals { margin: 16px 0; font-size: 14px; }
    .totals b { color: #4B2A7B; font-size: 18px; }
    .sign { margin-top: 40px; display: flex; gap: 60px; }
    .sign div { border-top: 1px solid #333; padding-top: 4px; font-size: 12px; color: #666; width: 250px; }
    @media print { body { padding: 20px; } }
  </style></head><body>
    <h1>Spare Plate — Volunteer Service Record</h1>
    <h2>Food rescue community service</h2>
    <div class="info">
      <p><b>Runner:</b> ${opts.runnerName}</p>
      ${opts.schoolGroup ? `<p><b>School / Group:</b> ${opts.schoolGroup}</p>` : ''}
      <p><b>Date range:</b> ${opts.fromDate} — ${opts.toDate}</p>
    </div>
    <table>
      <thead><tr><th>Date</th><th>Drop-off site</th><th>Food delivered</th><th style="text-align:center">Hours</th><th>Confirming host</th></tr></thead>
      <tbody>${rowsHtml || '<tr><td colspan="5">No deliveries in this range.</td></tr>'}</tbody>
    </table>
    <div class="totals">
      <p><b>Total hours:</b> ${opts.totalHours} &nbsp; <b>Total deliveries:</b> ${opts.totalDeliveries}</p>
    </div>
    <div class="sign">
      <div>Signature (parent, teacher, or scout leader)</div>
      <div>Date</div>
    </div>
  </body></html>`;
}
