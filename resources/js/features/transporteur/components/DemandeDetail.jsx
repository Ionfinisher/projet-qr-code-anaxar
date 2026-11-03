// Demandes de rendez-vous : ligne de liste et détail (statut, modification, annulation, camions, documents, historique).
import { useState } from 'react';
import {
  DEM_STATUS, DOCS, OPS, TERMINALS, slotRange, fmtDayLong, fmtDateTime, fmtAgo, fmtDayNum, driverName, transporterName,
} from '../../../lib/domain.js';
import { passPng, lotSheetPng } from '../../../lib/passImage.js';
import { saveFile } from '../../../lib/download.js';
import { chooseReason, notify } from '../../../lib/alerts.js';
import { useNav, AppLink } from '../../../lib/navigation.jsx';
import { usePortFlow } from '../../../providers/PortFlowProvider.jsx';
import { Alert, Button, Card, SectionTitle, KeyValue, Meter, Icon, buttonClass } from '../../../components/ui/index.js';
import { StatusTag, ContainerNumber, Plate, RdvStatusBadge, DocumentList, HistoryTimeline, SentMessages } from '../../../components/domain/index.js';
import { cn } from '../../../lib/cn.js';
import { useTransporteurApi } from '../api.js';
import { demandeRdvs, canModifyDemande, canCancelDemande, slotUsageFor, cap } from '../selectors.js';
import { CANCEL_MOTIFS } from '../demandeForm.js';

const MONTH = new Intl.DateTimeFormat('fr-FR', { month: 'short', timeZone: 'UTC' });
const monthShort = date => MONTH.format(new Date(date + 'T12:00:00Z')).replace('.', '');

/** Ligne cliquable d'une demande. */
export function DemandeRow({ d, now, current, onClick }) {
  return (
    <button type="button" onClick={onClick} aria-current={current ? 'true' : undefined}
      className={cn('flex w-full cursor-pointer items-center gap-3 rounded-2xl border bg-white px-3.5 py-3 text-left shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 sm:gap-4 sm:px-4',
        current ? 'border-brand-400 ring-1 ring-brand-400' : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50')}>
      <span className="flex w-14 shrink-0 flex-col items-center rounded-xl bg-slate-100 py-1.5">
        <strong className="text-lg font-bold tabular-nums leading-tight text-slate-900">{fmtDayNum(d.slot.date + 'T12:00:00Z')}</strong>
        <span className="text-xs text-slate-500">{monthShort(d.slot.date)}</span>
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
          <span className="font-mono text-sm font-semibold text-slate-900">{d.id}</span>
          <span className="text-sm font-semibold tabular-nums text-slate-700">{d.slot.start}–{d.slot.end}</span>
        </span>
        <span className="text-sm text-slate-600">{OPS[d.op].short} · {TERMINALS[d.terminal].short} · {d.rdvIds.length} camion{d.rdvIds.length > 1 ? 's' : ''}</span>
        <span className="text-xs text-slate-500">Mise à jour {fmtAgo(d.updatedAt, now)}</span>
      </span>
      <span className="shrink-0"><StatusTag map={DEM_STATUS} status={d.status} short /></span>
    </button>
  );
}

/** Contenu du panneau de détail d'une demande. */
export function DemandeDetail({ d, now }) {
  const { data } = usePortFlow();
  const tapi = useTransporteurApi();
  const nav = useNav();
  const rs = demandeRdvs(data, d);
  const canMod = canModifyDemande(data, d, now);
  const canCan = canCancelDemande(data, d, now);
  const [busy, setBusy] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const slot = data.slots.find(x => x.id === d.slotId) || data.slots.find(x => x.date === d.slot.date && x.start === d.slot.start);
  const usage = slot ? slotUsageFor(slot, data.rdvs) : null;

  const cancel = async () => {
    const choice = await chooseReason({
      title: `Annuler ${d.id} ?`,
      text: `${d.status === 'validee' ? 'Les QR codes seront refusés à la guérite. ' : ''}Le créneau est libéré.`,
      reasons: CANCEL_MOTIFS, allowOther: false, confirmText: 'Confirmer l’annulation', tone: 'danger',
    });
    if (!choice) return;
    setBusy(true);
    try {
      const r = await tapi.cancelDemande(d.id, choice.reason);
      if (!r.ok) { notify(r.error, 'bad'); return; }
      notify(`Demande ${d.id} annulée · créneau libéré`, 'neutral');
    } finally { setBusy(false); }
  };
  const downloadQr = async () => {
    setDownloading(true);
    try {
      if (rs.length > 1) await saveFile(`${d.id}-qr-codes.png`, await lotSheetPng(rs));
      else await saveFile(`${rs[0].id}-gate-pass.png`, await passPng(rs[0]));
    } finally { setDownloading(false); }
  };
  const retry = () => nav.go('transporteur.demandes.new', undefined, { query: { date: d.slot.date, start: d.slot.start } });

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <StatusTag map={DEM_STATUS} status={d.status} />
        <span className="text-[13px] text-slate-500">Soumise le {fmtDateTime(d.submittedAt)}</span>
      </div>

      {d.status === 'en_attente' && (
        <Alert tone="info" icon="hourglass" title="En attente de validation">
          L’administration du port vérifie la demande. Vous recevrez un e-mail et un SMS dès son traitement ; les QR codes seront alors disponibles.
        </Alert>
      )}
      {d.status === 'validee' && (
        <Alert tone="ok" title={`Validée le ${fmtDateTime(d.decision?.at)} par ${d.decision?.byName}`}>
          <p>{rs.length} QR code{rs.length > 1 ? 's' : ''} signé{rs.length > 1 ? 's' : ''} : téléchargez-les ou envoyez-les à vos chauffeurs.</p>
          {rs.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              <Button size="sm" icon="qr-code" onClick={() => nav.go('transporteur.rdv.detail', { id: rs[0].id })}>Voir {rs.length > 1 ? 'les rendez-vous' : 'le rendez-vous'}</Button>
              <Button size="sm" variant="secondary" icon="download" loading={downloading} onClick={downloadQr}>{rs.length > 1 ? 'Télécharger la planche des QR' : 'Télécharger le QR'}</Button>
            </div>
          )}
        </Alert>
      )}
      {d.status === 'rejetee' && (
        <Alert tone="bad" title={`Rejetée le ${fmtDateTime(d.decision?.at)} · ${d.decision?.motif}`}>
          {d.decision?.comment && <p>{d.decision.comment}</p>}
          <div className="mt-3"><Button size="sm" variant="secondary" icon="repeat" onClick={retry}>Faire une nouvelle demande</Button></div>
        </Alert>
      )}
      {d.status === 'annulee' && (
        <Alert tone="info" icon="circle-x" title={`Annulée le ${fmtDateTime(d.cancelledAt)}`}>{d.cancelMotif || 'Créneau libéré.'}</Alert>
      )}

      {(canMod || canCan) && (
        <Card className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[13.5px] text-slate-600 sm:max-w-xs">
            {d.status === 'validee' ? 'Une modification renvoie la demande en validation et désactive les QR codes actuels.' : 'Vous pouvez modifier ou annuler la demande tant qu’elle n’est pas traitée.'}
          </p>
          <div className="flex flex-wrap gap-2">
            {canMod && <Button variant="secondary" icon="pencil" onClick={() => nav.go('transporteur.demandes.edit', { id: d.id })}>Modifier la demande</Button>}
            {canCan && <Button variant="danger-outline" icon="circle-x" loading={busy} onClick={cancel}>Annuler la demande</Button>}
          </div>
        </Card>
      )}

      <Card>
        <SectionTitle icon="calendar-clock">Créneau et opération</SectionTitle>
        <KeyValue items={[
          ['Créneau', `${cap(fmtDayLong(slotRange(d.slot).start))} · ${d.slot.start}–${d.slot.end}`],
          usage && d.status === 'en_attente' && ['Occupation', <span className="inline-flex items-center gap-2.5"><Meter rate={usage.rate} /> <span className="tabular-nums">{usage.used}/{slot.capacity}</span></span>],
          ['Opération', OPS[d.op].label],
          ['Terminal', TERMINALS[d.terminal].label],
          ['Transporteur', transporterName(d.transporter)],
          d.transitaire && ['Transitaire', d.transitaire],
          d.notes && ['Instructions', d.notes],
        ]} />
      </Card>

      <Card>
        <SectionTitle icon="truck">Camions · {rs.length}</SectionTitle>
        <ul className="flex flex-col gap-2">
          {rs.map((r, i) => {
            const inner = (
              <>
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-900 text-xs font-bold tabular-nums text-white">{String(i + 1).padStart(2, '0')}</span>
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2"><ContainerNumber value={r.container.number} size="sm" placeholder="Vide à attribuer" /> <span className="rounded-[4px] bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] text-slate-600">{r.container.iso}</span></span>
                  <span className="mt-1 flex flex-wrap items-center gap-2 text-[13px] text-slate-500"><Plate country={r.vehicle.country} value={r.vehicle.tractor} size="sm" /><span>{driverName(r.driver)}</span><span className="font-mono">{r.id}</span></span>
                </span>
                <span className="shrink-0"><RdvStatusBadge rdv={r} now={now} /></span>
              </>
            );
            const cls = 'flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 px-3 py-2.5 sm:flex-nowrap';
            return (
              <li key={r.id}>
                {d.status === 'validee' && r.token ? (
                  <AppLink to="transporteur.rdv.detail" params={{ id: r.id }} className={cn(cls, 'transition-colors hover:border-slate-300 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500')}>{inner}</AppLink>
                ) : <div className={cls}>{inner}</div>}
              </li>
            );
          })}
        </ul>
      </Card>

      <Card>
        <SectionTitle icon="file-check">Documents · 6/6</SectionTitle>
        <DocumentList defs={DOCS} docs={d.docs} />
      </Card>

      <Card>
        <SectionTitle icon="history">Historique</SectionTitle>
        <HistoryTimeline items={d.history} />
      </Card>
    </>
  );
}

/** Confirmation après l'envoi (ou la modification) d'une demande. */
export function DemandeSent({ res, onNew }) {
  const d = res.demande;
  const edited = d.history.some(h => h.type === 'modifiee') && d.history[d.history.length - 1].type === 'modifiee';
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div className="flex flex-col items-center gap-3 text-center">
        <span className="flex h-16 w-16 items-center justify-center rounded-3xl bg-sky-50 text-sky-700 ring-1 ring-sky-200"><Icon name="hourglass" size={30} /></span>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">{edited ? 'Modifications enregistrées' : 'Demande envoyée'}</h1>
        <p className="max-w-xl text-[15px] text-slate-600">
          <span className="font-mono font-semibold text-slate-900">{d.id}</span> · {cap(fmtDayLong(slotRange(d.slot).start))}, {d.slot.start}–{d.slot.end} · {d.rdvIds.length} camion{d.rdvIds.length > 1 ? 's' : ''}.
          {' '}La demande est en attente de validation par l’administration du port ; vous serez informé par e-mail et SMS, et les QR codes apparaîtront dans vos rendez-vous.
        </p>
      </div>
      <SentMessages messages={res.msgs} />
      <div className="flex flex-wrap justify-center gap-2">
        <AppLink to="transporteur.demandes.detail" params={{ id: d.id }} className={buttonClass()}>
          <Icon name="list-todo" size={18} /> Voir ma demande
        </AppLink>
        <Button variant="secondary" icon="plus" onClick={onNew}>Nouvelle demande</Button>
      </div>
    </div>
  );
}
