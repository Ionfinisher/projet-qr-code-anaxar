import { OPS, TERMINALS, ISO_TYPE, driverName, transporterName, formatPhone, relDay } from '../../../../lib/domain.js';
import { KeyValue } from '../../../../Components/ui/index.js';
import { Plate, ContainerNumber, RdvStatusBadge } from '../../../../Components/domain/index.js';

/** Identité du camion : plaque, conteneur, chauffeur et permis à comparer avec les originaux. */
export function TruckIdentity({ rdv: r, now }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.05)] sm:p-5">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-2.5">
          <Plate country={r.vehicle.country} value={r.vehicle.tractor} size="lg" />
          <div className="flex flex-wrap items-center gap-2.5">
            <ContainerNumber value={r.container.number} size="lg" placeholder="Conteneur vide à attribuer" />
            <span className="rounded-md bg-slate-100 px-1.5 py-0.5 font-mono text-[13px] text-slate-700">{r.container.iso}</span>
          </div>
        </div>
        <RdvStatusBadge rdv={r} now={now} size="lg" />
      </div>
      <KeyValue dense items={[
        ['Référence', <span className="font-mono">{r.id}{r.lot ? <span className="text-slate-500"> · lot {r.lot} ({r.lotIndex}/{r.lotSize})</span> : null}</span>],
        r.entryAt && ['Créneau', `${relDay(r.slot.date)} · ${r.slot.start}–${r.slot.end}`],
        ['Opération', `${OPS[r.op]?.label} · ${TERMINALS[r.terminal]?.label}`],
        ['Chauffeur', <>{driverName(r.driver)}{r.driver.phone ? <span className="tabular-nums text-slate-500"> · {formatPhone(r.driver.phone)}</span> : null}</>],
        ['Permis de conduire', r.driver.license
          ? <><span className="font-mono">{r.driver.license}</span><span className="text-slate-500"> · à comparer avec l’original</span></>
          : <span className="text-slate-500">Non inscrit dans ce QR</span>],
        ['Transporteur', transporterName(r.transporter)],
        r.vehicle.trailer && ['Remorque', <Plate country={r.vehicle.country} value={r.vehicle.trailer} size="sm" />],
        r.container.bl && ['Connaissement', <span className="font-mono">{r.container.bl}</span>],
        r.container.goods && ['Marchandise', r.container.goods],
        ['Type ISO', `${r.container.iso} · ${ISO_TYPE[r.container.iso]?.label || ''}`],
      ]} />
    </div>
  );
}
