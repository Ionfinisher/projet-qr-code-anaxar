// Liste des rendez-vous : ligne d'un camion (créneau, conteneur, tracteur, chauffeur, statut, contrôles).
import { TERMINALS, OPS, checkCounts, driverName, relDay, fmtDayLong } from '../../../lib/domain.js';
import { Icon } from '../../../components/ui/index.js';
import { ContainerNumber, Plate, RdvStatusBadge, ChecksBar } from '../../../components/domain/index.js';
import { cn } from '../../../lib/cn.js';
import { cap } from '../selectors.js';

export function LotChip({ index, size, prefix = '' }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-2 py-0.5 text-[11px] font-semibold text-violet-800 ring-1 ring-inset ring-violet-200">
      <Icon name="layers" size={12} /> {prefix}{index}/{size}
    </span>
  );
}

function RdvSide({ r, now, className }) {
  const { ok, ko } = checkCounts(r);
  return (
    <span className={className}>
      <RdvStatusBadge rdv={r} now={now} />
      <span className="inline-flex items-center gap-2 text-xs tabular-nums text-slate-500"><ChecksBar rdv={r} /> {ok}/6{ko ? ` · ${ko} rejet` : ''}</span>
      {r.lot && <LotChip index={r.lotIndex} size={r.lotSize} />}
    </span>
  );
}

/** Ligne cliquable d'un rendez-vous. */
export function RdvRow({ r, st, now, current, onClick }) {
  const muted = st === 'annule' || st === 'termine';
  return (
    <button type="button" onClick={onClick} aria-current={current ? 'true' : undefined}
      className={cn('flex w-full cursor-pointer items-start gap-3 rounded-2xl border bg-white px-3.5 py-3 text-left shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 sm:items-center sm:gap-4 sm:px-4',
        current ? 'border-brand-400 ring-1 ring-brand-400' : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50', muted && 'opacity-70')}>
      <span className="flex w-14 shrink-0 flex-col items-center rounded-xl bg-slate-100 py-1.5">
        <strong className="text-[15px] font-bold tabular-nums text-slate-900">{r.slot.start}</strong>
        <span className="text-xs tabular-nums text-slate-500">{r.slot.end}</span>
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="flex flex-wrap items-center gap-2">
          <ContainerNumber value={r.container.number} size="sm" placeholder="Conteneur vide à attribuer" />
          <span className="rounded-[4px] bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] text-slate-600">{r.container.iso}</span>
        </span>
        <span className="flex min-w-0 flex-wrap items-center gap-2 text-sm text-slate-600">
          <Plate country={r.vehicle.country} value={r.vehicle.tractor} size="sm" />
          <span className="truncate">{driverName(r.driver)}</span>
        </span>
        <span className="text-xs text-slate-500">{TERMINALS[r.terminal]?.short} · {OPS[r.op]?.short} · <span className="font-mono">{r.id}</span></span>
        <RdvSide r={r} now={now} className="mt-1.5 flex flex-wrap items-center gap-2 sm:hidden" />
      </span>
      <RdvSide r={r} now={now} className="hidden shrink-0 flex-col items-end gap-1.5 sm:flex" />
    </button>
  );
}

/** En-tête d'un groupe de jour (Aujourd'hui, Demain, date longue, nombre de camions). */
export function DayLabel({ date, today, count }) {
  return (
    <div className="flex flex-wrap items-baseline gap-x-2 px-1">
      <strong className="text-sm font-semibold text-slate-900">{relDay(date, today)}</strong>
      <span className="text-sm text-slate-500">{cap(fmtDayLong(date + 'T12:00:00Z'))} · {count} camion{count > 1 ? 's' : ''}</span>
    </div>
  );
}
