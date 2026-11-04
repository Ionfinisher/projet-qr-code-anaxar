import { useMemo, useState } from 'react';
import { dayStr, statusOf, checkCounts, relDay, fmtDayLong, transporterName, driverName } from '../../../lib/domain.js';
import { useNow } from '../../../hooks/useNow.js';
import { PageHeader, Segmented, DataTable, EmptyState, Button } from '../../../Components/ui/index.js';
import { Plate, ContainerNumber, RdvStatusBadge, ChecksBar } from '../../../Components/domain/index.js';
import { useGateSession } from '../GateSession.jsx';
import { ARR_FILTERS, cap } from '../constants.js';
import { gateArrivals } from '../selectors.js';

/** Camions du jour : attendus, en contrôle, dans le port et sortis. */
export function ArriveesPage() {
  const { rdvs, openFromList } = useGateSession();
  const now = useNow(15000);
  const [f, setF] = useState('all');
  const today = dayStr(now);
  const rows = useMemo(() => gateArrivals(rdvs, now)
    .map(r => ({ r, st: statusOf(r, now) }))
    .sort((a, b) => (a.r.slot.date + a.r.slot.start).localeCompare(b.r.slot.date + b.r.slot.start)), [rdvs, now]);
  const counts = Object.fromEntries(ARR_FILTERS.map(x => [x.value, rows.filter(y => x.test(y.st)).length]));
  const shown = rows.filter(x => ARR_FILTERS.find(y => y.value === f).test(x.st));
  const checks = r => { const { ok, ko } = checkCounts(r); return `${ok}/6${ko ? ` · ${ko} rejet` : ''}`; };
  const open = r => <Button size="sm" variant="secondary" iconRight="chevron-right" onClick={() => openFromList(r)} aria-label={`Ouvrir ${r.id}`}>Ouvrir</Button>;

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="Arrivées du jour" subtitle={`${cap(fmtDayLong(now))} · camions attendus, en contrôle et dans le port`} className="mb-0"
        actions={<Segmented label="Filtrer" value={f} onChange={setF} options={ARR_FILTERS.map(x => ({ value: x.value, label: x.label, count: counts[x.value] }))} />} />
      {shown.length === 0 ? (
        <div className="rounded-3xl border border-slate-200 bg-white"><EmptyState icon="truck" title="Aucun camion dans cette vue" /></div>
      ) : (
        <>
          <DataTable className="hidden md:block" caption="Arrivées du jour" rows={shown} rowKey={x => x.r.id} columns={[
            { key: 'slot', header: 'Créneau', render: ({ r }) => <><span className="font-semibold tabular-nums text-slate-900">{r.slot.start}–{r.slot.end}</span>{r.slot.date !== today && <span className="block text-xs text-slate-500">{relDay(r.slot.date)}</span>}</> },
            { key: 'ref', header: 'Référence', render: ({ r }) => <><span className="font-mono text-slate-900">{r.id}</span>{r.lot && <span className="block text-xs text-slate-500">Lot {r.lotIndex}/{r.lotSize}</span>}</> },
            { key: 'tractor', header: 'Tracteur', render: ({ r }) => <Plate country={r.vehicle.country} value={r.vehicle.tractor} size="sm" /> },
            { key: 'ctr', header: 'Conteneur', render: ({ r }) => <ContainerNumber value={r.container.number} size="sm" placeholder="Vide" /> },
            { key: 'tr', header: 'Transporteur', render: ({ r }) => <>{transporterName(r.transporter)}<span className="block text-xs text-slate-500">{driverName(r.driver)}</span></> },
            { key: 'chk', header: 'Contrôles', render: ({ r }) => <span className="inline-flex items-center gap-2 tabular-nums"><ChecksBar rdv={r} /> {checks(r)}</span> },
            { key: 'st', header: 'Statut', render: ({ r }) => <RdvStatusBadge rdv={r} now={now} /> },
            { key: 'act', header: 'Action', srOnly: true, className: 'text-right', render: ({ r }) => open(r) },
          ]} />
          <ul className="flex flex-col gap-3 md:hidden">
            {shown.map(({ r }) => (
              <li key={r.id} className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.05)]">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-lg font-bold tabular-nums text-slate-900">{r.slot.start}–{r.slot.end}</p>
                    {r.slot.date !== today && <p className="text-sm text-slate-500">{relDay(r.slot.date)}</p>}
                    <p className="font-mono text-sm text-slate-600">{r.id}{r.lot ? ` · lot ${r.lotIndex}/${r.lotSize}` : ''}</p>
                  </div>
                  <RdvStatusBadge rdv={r} now={now} />
                </div>
                <div className="flex flex-wrap items-center gap-2.5">
                  <Plate country={r.vehicle.country} value={r.vehicle.tractor} size="sm" />
                  <ContainerNumber value={r.container.number} size="sm" placeholder="Vide" />
                </div>
                <p className="text-sm text-slate-600">{transporterName(r.transporter)} · {driverName(r.driver)}</p>
                <div className="flex items-center justify-between gap-3">
                  <span className="inline-flex items-center gap-2 text-sm tabular-nums text-slate-700"><ChecksBar rdv={r} /> {checks(r)}</span>
                  {open(r)}
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
