// Choix d'un créneau : 14 jours, places restantes en temps réel (jauge), créneaux fermés ou passés.
import { useMemo } from 'react';
import { dayStr, addDays, slotRange, fmtWeekday, fmtDayNum } from '../../../lib/domain.js';
import { usePortFlow } from '../../../providers/PortFlowProvider.jsx';
import { EmptyState, Meter, Icon } from '../../../Components/ui/index.js';
import { cn } from '../../../lib/cn.js';
import { slotUsageFor, mineOnSlot } from '../selectors.js';

/**
 * date / setDate : jour affiché ; value : heure de début choisie ; onPick(slot) ;
 * need : places nécessaires (nombre de camions) ; exceptDemande : demande modifiée (ses places restent disponibles).
 */
export function SlotPicker({ date, setDate, value, onPick, need = 1, exceptDemande = null, now, userId, days = 14 }) {
  const { data } = usePortFlow();
  const today = dayStr(now);
  const dates = useMemo(() => Array.from({ length: days }, (_, i) => addDays(today, i)), [today, days]);
  const dayInfo = useMemo(() => Object.fromEntries(dates.map(d => {
    const list = data.slots.filter(x => x.date === d && x.open && slotRange(x).end.getTime() - 30 * 60000 > now);
    return [d, { free: list.reduce((a, x) => a + slotUsageFor(x, data.rdvs, exceptDemande).remaining, 0), count: list.length }];
  })), [data.slots, data.rdvs, dates, now, exceptDemande]);
  const list = data.slots.filter(x => x.date === date).sort((a, b) => a.start.localeCompare(b.start));

  return (
    <div className="flex flex-col gap-4">
      <div role="radiogroup" aria-label="Date du rendez-vous" className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-2">
        {dates.map((d, i) => {
          const on = date === d;
          const info = dayInfo[d];
          return (
            <button key={d} type="button" role="radio" aria-checked={on} onClick={() => setDate(d)}
              className={cn('flex w-[74px] shrink-0 cursor-pointer flex-col items-center gap-0.5 rounded-xl border px-2 py-2 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500',
                on ? 'border-brand-500 bg-brand-50 ring-1 ring-brand-500' : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50')}>
              <small className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{i === 0 ? 'Auj.' : i === 1 ? 'Demain' : fmtWeekday(d + 'T12:00:00Z')}</small>
              <strong className="text-xl font-bold tabular-nums leading-tight text-slate-900">{fmtDayNum(d + 'T12:00:00Z')}</strong>
              <span className={cn('text-[11px] font-medium', info.count ? (info.free ? 'text-emerald-700' : 'text-rose-700') : 'text-slate-400')}>
                {info.count ? `${info.free} pl.` : 'Fermé'}
              </span>
            </button>
          );
        })}
      </div>
      {list.length === 0 ? (
        <EmptyState icon="calendar-x" title="Aucun créneau ce jour" className="py-8">L’administration n’a pas encore ouvert de créneaux pour cette date.</EmptyState>
      ) : (
        <div role="radiogroup" aria-label="Créneaux" className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
          {list.map(x => {
            const u = slotUsageFor(x, data.rdvs, exceptDemande);
            const past = slotRange(x).end.getTime() - 30 * 60000 < now;
            const closed = !x.open;
            const short = u.remaining < need;
            const mine = mineOnSlot(data.rdvs, userId, x, exceptDemande);
            const state = past ? 'Passé' : closed ? 'Fermé' : u.remaining === 0 ? 'Complet' : `${u.remaining} place${u.remaining > 1 ? 's' : ''}`;
            const on = value === x.start && date === x.date;
            return (
              <button key={x.id} type="button" role="radio" aria-checked={on} disabled={past || closed || short} onClick={() => onPick(x)}
                aria-label={`${x.start} à ${x.end}, ${state}${mine ? `, dont ${mine} de vos camions` : ''}`}
                className={cn('flex min-h-[92px] cursor-pointer flex-col items-start gap-1.5 rounded-xl border px-3 py-2.5 text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 disabled:cursor-not-allowed',
                  on ? 'border-brand-500 bg-brand-50 ring-1 ring-brand-500'
                    : closed ? 'border-dashed border-slate-300 bg-slate-50'
                      : past || short ? 'border-slate-200 bg-slate-50 opacity-60' : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50')}>
                <span className="text-[15px] font-bold tabular-nums text-slate-900">{x.start}–{x.end}</span>
                <Meter rate={u.rate} closed={closed} />
                <span className="flex w-full flex-wrap items-center justify-between gap-x-2 text-xs">
                  <span className={cn('font-medium', closed || past ? 'text-slate-500' : u.remaining === 0 ? 'text-rose-700' : 'text-slate-700')}>{state}</span>
                  {!past && !closed && short && u.remaining > 0 && <span className="font-medium text-amber-700">Insuffisant</span>}
                </span>
                {mine > 0 && <span className="inline-flex items-center gap-1 text-[11px] font-medium text-brand-700"><Icon name="truck" size={12} /> {mine} à vous</span>}
                {closed && x.closeReason && <span className="text-[11px] leading-snug text-slate-500">{x.closeReason}</span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/** Légende des jauges d'occupation. */
export function SlotLegend({ className }) {
  return (
    <div aria-label="Légende" className={cn('flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-600', className)}>
      <span className="inline-flex items-center gap-2"><Meter rate={0.4} segments={4} /> Disponible</span>
      <span className="inline-flex items-center gap-2"><Meter rate={0.9} segments={4} /> Presque complet</span>
      <span className="inline-flex items-center gap-2"><Meter rate={1} segments={4} /> Complet</span>
      <span className="inline-flex items-center gap-2"><Meter rate={0} closed segments={4} /> Fermé</span>
    </div>
  );
}
