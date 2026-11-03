import { Fragment } from 'react';
import { slotRange, hhmm, fmtDayLong, fmtDayNum, fmtWeekday } from '../../../lib/domain.js';
import { Meter } from '../../../components/ui/index.js';
import { cn } from '../../../lib/cn.js';

const MONTH = new Intl.DateTimeFormat('fr-FR', { month: 'short', timeZone: 'UTC' });
const noon = d => new Date(d + 'T12:00:00Z');

/** « Semaine du 2 nov. au 8 nov. » */
export const weekLabel = days => `Semaine du ${fmtDayNum(noon(days[0]))} ${MONTH.format(noon(days[0]))} au ${fmtDayNum(noon(days[6]))} ${MONTH.format(noon(days[6]))}`;

/**
 * Grille hebdomadaire des créneaux : une ligne par heure de début, une colonne par jour.
 * Chaque cellule indique les places réservées et ouvre le détail du créneau.
 */
export function WeekGrid({ days, slots, usages, today, now, onOpen }) {
  const times = [...new Set(slots.map(x => x.start))].sort();
  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white p-2">
      <div role="grid" aria-label="Créneaux de la semaine" className="grid min-w-[760px] grid-cols-[64px_repeat(7,minmax(92px,1fr))] gap-1.5">
        <span aria-hidden="true" className="sticky left-0 z-10 bg-white" />
        {days.map(d => (
          <span key={d} role="columnheader" className={cn('flex flex-col items-center rounded-xl py-2 leading-tight', d === today ? 'bg-brand-50 text-brand-800' : 'text-slate-600')}>
            <small className="text-[11px] font-semibold uppercase tracking-wide">{fmtWeekday(noon(d))}</small>
            <b className="text-lg font-bold tabular-nums">{fmtDayNum(noon(d))}</b>
          </span>
        ))}
        {times.map(t => (
          <Fragment key={t}>
            <span className="sticky left-0 z-10 flex items-center justify-end bg-white pr-2 text-xs font-semibold tabular-nums text-slate-500">{t}</span>
            {days.map(d => {
              const x = slots.find(y => y.date === d && y.start === t);
              if (!x) return <span key={d} aria-hidden="true" className="rounded-xl border border-dashed border-slate-100" />;
              const u = usages.get(x.id);
              const past = slotRange(x).end.getTime() < now;
              return (
                <button key={d} type="button" onClick={() => onOpen(x.id)}
                  aria-label={`${fmtDayLong(noon(d))} ${x.start}–${x.end} : ${x.open ? `${u.used} sur ${x.capacity} places réservées` : 'fermé'}`}
                  className={cn('flex min-h-[64px] cursor-pointer flex-col items-start justify-between gap-1.5 rounded-xl border px-2.5 py-2 text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500',
                    !x.open ? 'border-slate-200 bg-slate-100 text-slate-500 hover:bg-slate-200/70' : u.rate >= 1 ? 'border-rose-200 bg-rose-50 hover:border-rose-300' : 'border-slate-200 bg-white hover:border-brand-300 hover:bg-brand-50/40',
                    past && 'opacity-50')}>
                  <span className="text-sm font-semibold tabular-nums text-slate-900">
                    {x.open ? <>{u.used}<small className="text-xs font-medium text-slate-500">/{x.capacity}</small></> : 'Fermé'}
                  </span>
                  <Meter rate={u.rate} closed={!x.open} segments={8} />
                  {x.end !== hhmm(+t.slice(0, 2) + 2) && <span className="text-[11px] text-slate-500">→ {x.end}</span>}
                </button>
              );
            })}
          </Fragment>
        ))}
      </div>
    </div>
  );
}
