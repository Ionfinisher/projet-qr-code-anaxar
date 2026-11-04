import { punctuality, TERMINALS, relDay, fmtTime } from '../../../../lib/domain.js';
import { Badge, Icon } from '../../../../Components/ui/index.js';
import { cn } from '../../../../lib/cn.js';

/** Créneau réservé et ponctualité de l'arrivée (tolérance ±15 min). */
export function SlotCheck({ rdv: r, now }) {
  const p = punctuality(r, r.arrivedAt ? Date.parse(r.arrivedAt) : now);
  const ok = p.tone === 'ok';
  return (
    <div className={cn('grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-3 gap-y-2 rounded-2xl border px-4 py-3 sm:grid-cols-[auto_minmax(0,1fr)_auto]', ok ? 'border-slate-200 bg-white' : 'border-amber-200 bg-amber-50')}>
      <span className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-xl', ok ? 'bg-sky-50 text-sky-700' : 'bg-amber-100 text-amber-800')}>
        <Icon name={ok ? 'calendar-clock' : 'timer'} size={22} />
      </span>
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Créneau réservé · {TERMINALS[r.terminal]?.short}</p>
        <p className="text-lg font-bold tabular-nums text-slate-900">{relDay(r.slot.date)} · {r.slot.start}–{r.slot.end}</p>
      </div>
      <div className="col-start-2 flex flex-col items-start gap-1 sm:col-start-auto sm:items-end">
        <Badge tone={ok ? 'ok' : 'warn'} icon={ok ? 'check' : 'clock'}>{ok ? 'Créneau confirmé' : p.label}</Badge>
        <span className="text-[13px] text-slate-500">{r.arrivedAt ? `Arrivée enregistrée à ${fmtTime(r.arrivedAt)}` : 'Arrivée non enregistrée'}{ok ? '' : ' · hors tolérance de ±15 min'}</span>
      </div>
    </div>
  );
}
