import { OPS, TERMINALS, ISO_TYPE, KID, driverName, fmtDateTime, relDay } from '../../Lib/domain.js';
import { Icon } from '../ui/Icon.jsx';
import { LogoMark } from './Logo.jsx';
import { QrCode } from './QrCode.jsx';
import { RdvStatusBadge, ContainerNumber, Plate } from './Rdv.jsx';
import { cn } from '../../Lib/cn.js';

/** Gate pass numérique (ticket) : QR signé, créneau, conteneur, tracteur, chauffeur. */
export function GatePass({ rdv: r, compact = false, now, className }) {
  const op = OPS[r.op];
  return (
    <article aria-label={`Gate pass ${r.id}`} className={cn('overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_12px_32px_rgba(15,23,42,0.10)]', className)}>
      <div className="bg-slate-900 px-5 py-3 text-white">
        <div className="flex items-center justify-between gap-3">
          <span className="flex items-center gap-2 text-sm font-bold"><LogoMark size={22} /> PortFlow</span>
          <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-brand-400">Gate pass numérique</span>
        </div>
      </div>
      <div className={cn('grid gap-5 p-5', compact ? 'grid-cols-[minmax(0,140px)_minmax(0,1fr)]' : 'grid-cols-1 sm:grid-cols-[minmax(0,220px)_minmax(0,1fr)]')}>
        <div className="mx-auto w-full max-w-[260px] rounded-2xl border border-slate-200 p-2">
          <QrCode text={r.token} label={`QR code signé du rendez-vous ${r.id}`} />
        </div>
        <div className="flex min-w-0 flex-col gap-2">
          <p className="font-mono text-2xl font-semibold tracking-tight text-slate-900">{r.id}</p>
          {r.lot && <p className="text-sm text-slate-500">Lot {r.lot} · camion {r.lotIndex}/{r.lotSize}</p>}
          <p className="flex flex-wrap items-baseline gap-x-2">
            <span className="text-sm text-slate-500">{relDay(r.slot.date)}</span>
            <strong className="text-3xl font-extrabold tabular-nums tracking-tight text-slate-900">{r.slot.start}–{r.slot.end}</strong>
          </p>
          <p className="flex items-center gap-1.5 text-sm text-slate-600"><Icon name="map-pin" size={15} /> {TERMINALS[r.terminal]?.short} · {op?.short}</p>
          <div><RdvStatusBadge rdv={r} now={now} /></div>
        </div>
      </div>
      <div className="border-t border-dashed border-slate-300 bg-slate-50/70 px-5 py-4">
        <dl className="grid grid-cols-1 gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
          <div className="sm:col-span-2"><dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Conteneur</dt>
            <dd className="mt-1 flex items-center gap-2"><ContainerNumber value={r.container.number} /> <span className="rounded-[4px] bg-slate-200 px-1.5 py-0.5 font-mono text-xs text-slate-700">{r.container.iso}</span></dd></div>
          <div><dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Tracteur</dt><dd className="mt-1"><Plate country={r.vehicle.country} value={r.vehicle.tractor} size="sm" /></dd></div>
          <div><dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Chauffeur</dt>
            <dd className="mt-1 text-slate-900">{driverName(r.driver)}{r.driver.license && <span className="block font-mono text-xs text-slate-500">Permis {r.driver.license}</span>}</dd></div>
          {!compact && <div><dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Connaissement</dt><dd className="mt-1 font-mono text-slate-900">{r.container.bl || '—'}</dd></div>}
          {!compact && <div><dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Type ISO</dt><dd className="mt-1 text-slate-900">{ISO_TYPE[r.container.iso]?.label}</dd></div>}
        </dl>
        <p className="mt-4 flex items-center gap-1.5 text-xs text-slate-500"><Icon name="fingerprint" size={14} /> Signé ES256 · clé {KID} · émis le {fmtDateTime(r.issuedAt)}</p>
      </div>
    </article>
  );
}
