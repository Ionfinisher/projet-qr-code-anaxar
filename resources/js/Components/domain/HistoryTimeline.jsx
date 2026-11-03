import { fmtDateTime } from '../../Lib/domain.js';
import { Icon } from '../ui/Icon.jsx';
import { cn } from '../../Lib/cn.js';

const HIST = {
  soumise: { label: 'Demande soumise', icon: 'send' },
  modifiee: { label: 'Demande modifiée', icon: 'pencil' },
  mise_a_jour: { label: 'Demande mise à jour', icon: 'pencil' },
  complements: { label: 'Compléments demandés', icon: 'file-up', tone: 'warn' },
  validee: { label: 'Validée', icon: 'circle-check', tone: 'ok' },
  rejetee: { label: 'Rejetée', icon: 'circle-x', tone: 'bad' },
  annulee: { label: 'Annulée', icon: 'circle-x' },
};
const TONE = { ok: 'bg-emerald-50 text-emerald-700 ring-emerald-200', warn: 'bg-amber-50 text-amber-700 ring-amber-200', bad: 'bg-rose-50 text-rose-700 ring-rose-200' };

/** Historique d'un dossier (le plus récent en premier) : items [{ type, at, by, detail }]. */
export function HistoryTimeline({ items, className }) {
  const list = [...(items || [])].sort((a, b) => b.at.localeCompare(a.at));
  return (
    <ol className={cn('relative flex flex-col gap-4', className)}>
      {list.map((h, i) => {
        const t = HIST[h.type] || { label: h.type, icon: 'circle' };
        return (
          <li key={i} className="relative flex gap-3">
            {i < list.length - 1 && <span aria-hidden="true" className="absolute left-4 top-9 h-[calc(100%-12px)] w-px bg-slate-200" />}
            <span className={cn('relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full ring-1 ring-inset', TONE[t.tone] || 'bg-slate-100 text-slate-600 ring-slate-200')}>
              <Icon name={t.icon} size={15} />
            </span>
            <div className="min-w-0 flex-1 pt-1">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                <p className="text-sm font-semibold text-slate-900">{t.label}</p>
                <time className="text-xs text-slate-500" dateTime={h.at}>{fmtDateTime(h.at)}</time>
              </div>
              <p className="text-[13px] text-slate-500">{h.by}{h.detail ? ` · ${h.detail}` : ''}</p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
