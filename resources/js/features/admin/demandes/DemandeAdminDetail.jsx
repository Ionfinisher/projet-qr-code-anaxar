// Détail d'une demande de rendez-vous côté port : contrôles automatiques, décision, camions, documents, historique.
import { useState } from 'react';
import {
  OPS, TERMINALS, DOCS, DEM_STATUS, DEM_REJECT, ACCOUNT_KINDS, slotRange, relDay, fmtDayLong, fmtDateTime, accountName,
  transporterName, driverName, formatPhone, parseContainer, licenseValid,
} from '../../../lib/domain.js';
import { confirmAction, notify } from '../../../lib/alerts.js';
import { usePortFlow, useCurrentUser } from '../../../providers/PortFlowProvider.jsx';
import { Card, SectionTitle, KeyValue, Meter, Badge, Alert, Button, Icon, DataTable } from '../../../Components/ui/index.js';
import { StatusTag, ContainerNumber, Plate, DocumentList, HistoryTimeline, SentMessages } from '../../../Components/domain/index.js';
import { UrgencyBadge, DecisionBar, ReadOnlyNote } from '../components/Parts.jsx';
import { rejectWithMotif, introHtml, kvHtml, warnHtml } from '../components/dialogs.js';
import { cap, demandeChecks } from '../selectors.js';
import { useAdminApi } from '../api.js';

export function DemandeAdminDetail({ d, now }) {
  const { data } = usePortFlow();
  const { can } = useCurrentUser();
  const admin = useAdminApi();
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(null);
  const { owner, rs, slot, usage, checks, allOk } = demandeChecks(data, d, now);
  const canAct = can('demandes.traiter') && d.status === 'en_attente';
  const history = data.messages.filter(m => m.ref === d.id).slice(0, 4);

  const decide = async (decision, opts = {}) => {
    setBusy(true);
    try {
      const r = await admin.processDemande(d.id, decision, { ...opts, updatedAt: d.updatedAt || '' });
      if (!r.ok) { notify(r.error, 'bad'); return; }
      setSent(r.msgs || []);
      notify(decision === 'validee' ? `Demande ${d.id} validée · ${rs.length} QR code${rs.length > 1 ? 's' : ''} émis` : `Demande ${d.id} rejetée`, decision === 'validee' ? 'ok' : 'neutral');
    } finally { setBusy(false); }
  };
  const validate = async () => {
    const n = rs.length;
    const ok = await confirmAction({
      title: `Valider ${d.id}`,
      html: introHtml(`${n} QR code${n > 1 ? 's' : ''} signé${n > 1 ? 's' : ''} (JWS ES256) ${n > 1 ? 'seront émis' : 'sera émis'} pour **${owner ? accountName(owner) : ''}**, créneau ${relDay(d.slot.date).toLowerCase()} ${d.slot.start}–${d.slot.end}.`)
        + (allOk ? '' : warnHtml('Certains contrôles automatiques ne sont pas conformes. Vérifiez-les avant de valider.'))
        + kvHtml([['Notifications', [owner?.email && 'e-mail', 'SMS'].filter(Boolean).join(' + ')], ['Rendez-vous', rs.map(r => r.id).join(', ')]]),
      confirmText: 'Valider et notifier', tone: 'ok',
    });
    if (ok) decide('validee');
  };
  const reject = async () => {
    const res = await rejectWithMotif({ title: `Rejeter ${d.id}`, motifs: DEM_REJECT });
    if (res) decide('rejetee', { motif: res.motif, comment: res.comment });
  };

  return (
    <div className="flex flex-col gap-5">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-brand-700">Demande de rendez-vous</p>
        <h2 className="mt-1 font-mono text-2xl font-semibold text-slate-900">{d.id}</h2>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <StatusTag map={DEM_STATUS} status={d.status} />
          {d.status === 'en_attente' && <UrgencyBadge demande={d} now={now} />}
          <span className="text-[13px] text-slate-500">Soumise le {fmtDateTime(d.submittedAt)}</span>
        </div>
      </div>

      {d.decision && (
        <Alert tone={d.status === 'validee' ? 'ok' : 'bad'} icon={d.status === 'validee' ? 'circle-check' : 'circle-x'}
          title={`${d.status === 'validee' ? 'Validée' : `Rejetée · ${d.decision.motif}`} le ${fmtDateTime(d.decision.at)} par ${d.decision.byName}`}>
          {d.decision.comment || null}
        </Alert>
      )}
      {d.status === 'annulee' && <Alert tone="info" icon="circle-x" title={`Annulée par le transporteur le ${fmtDateTime(d.cancelledAt)}`}>{d.cancelMotif || null}</Alert>}

      {d.status === 'en_attente' && (
        <Card>
          <SectionTitle icon="list-checks" aside={<Badge tone={allOk ? 'ok' : 'warn'} icon={allOk ? 'check' : 'triangle-alert'}>{allOk ? 'Tout est conforme' : 'Points à vérifier'}</Badge>}>Contrôles automatiques</SectionTitle>
          <ul className="flex flex-col gap-2.5">
            {checks.map(c => (
              <li key={c.t} className="flex items-start gap-3">
                <Icon name={c.ok ? 'circle-check' : 'circle-x'} size={18} className={c.ok ? 'mt-0.5 text-emerald-600' : 'mt-0.5 text-rose-600'} />
                <span className="min-w-0 text-sm"><b className="block font-semibold text-slate-900">{c.t}</b><small className="text-[13px] text-slate-500">{c.d}</small></span>
              </li>
            ))}
          </ul>
          <div className="mt-4">
            {canAct ? (
              <DecisionBar>
                <Button variant="ok" icon="qr-code" loading={busy} onClick={validate}>Valider · émettre {rs.length} QR</Button>
                <Button variant="danger-outline" icon="x" disabled={busy} onClick={reject}>Rejeter</Button>
              </DecisionBar>
            ) : <ReadOnlyNote>Votre profil permet de consulter les demandes, pas de les traiter.</ReadOnlyNote>}
          </div>
        </Card>
      )}
      <SentMessages messages={sent || (history.length ? history : null)} title={sent ? 'Messages envoyés au transporteur' : 'Derniers messages au transporteur'} />

      <div className="flex flex-col gap-5">
        <Card>
          <SectionTitle icon="building-2">Demandeur</SectionTitle>
          <KeyValue dense items={[
            ['Compte', owner ? <>{accountName(owner)} <span className="text-slate-500">· {ACCOUNT_KINDS[owner.acct]?.short}</span></> : '—'],
            owner?.email && ['E-mail', owner.email],
            owner && ['Téléphone', <span className="tabular-nums">{formatPhone(owner.phone)}</span>],
            owner?.acct === 'transit' && ['Transporteur mandaté', `${transporterName(d.transporter)} · ${formatPhone(d.transporter.phone)}`],
            d.transitaire && owner?.acct !== 'transit' && ['Transitaire', d.transitaire],
          ]} />
        </Card>
        <Card>
          <SectionTitle icon="calendar-clock">Créneau et opération</SectionTitle>
          <KeyValue dense items={[
            ['Créneau', `${cap(fmtDayLong(slotRange(d.slot).start))} · ${d.slot.start}–${d.slot.end}`],
            usage && ['Occupation', <span className="inline-flex flex-wrap items-center gap-2.5"><Meter rate={usage.rate} closed={!slot.open} /> <span className="tabular-nums">{usage.used}/{slot.capacity}</span><span className="text-xs text-slate-500">dont {usage.pending} en attente</span></span>],
            ['Opération', OPS[d.op]?.label],
            ['Terminal', TERMINALS[d.terminal]?.label],
            d.notes && ['Instructions', d.notes],
          ]} />
        </Card>
      </div>

      <section>
        <SectionTitle icon="truck">Camions · {rs.length}</SectionTitle>
        <DataTable rows={rs} caption={`Camions de la demande ${d.id}`} columns={[
          { key: 'ctr', header: 'Conteneur', render: r => {
            const c = parseContainer(r.container.number);
            return (
              <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
                <ContainerNumber value={r.container.number} size="sm" placeholder="Vide" />
                {r.container.number && <Icon name={c.valid ? 'circle-check' : 'circle-x'} size={15} className={c.valid ? 'text-emerald-600' : 'text-rose-600'} label={c.valid ? 'ISO 6346 valide' : 'ISO 6346 invalide'} />}
              </span>
            );
          } },
          { key: 'iso', header: 'Type', render: r => <span className="rounded-md bg-slate-100 px-1.5 py-0.5 font-mono text-xs text-slate-700">{r.container.iso}</span> },
          { key: 'bl', header: 'Connaissement', className: 'font-mono text-[13px]', render: r => r.container.bl || '—' },
          { key: 'veh', header: 'Tracteur', render: r => <Plate country={r.vehicle.country} value={r.vehicle.tractor} size="sm" /> },
          { key: 'drv', header: 'Chauffeur', render: r => <>{driverName(r.driver)}<span className="block text-xs tabular-nums text-slate-500">{formatPhone(r.driver.phone)}</span></> },
          { key: 'lic', header: 'N° de permis', render: r => (licenseValid(r.driver.license) ? <span className="font-mono text-[13px]">{r.driver.license}</span> : <Badge tone="bad" icon="triangle-alert">Manquant</Badge>) },
        ]} />
      </section>

      <Card>
        <SectionTitle icon="file-check" aside={<span className="text-[13px] tabular-nums text-slate-500">{DOCS.filter(x => d.docs?.[x.key]).length}/6</span>}>Documents</SectionTitle>
        <DocumentList defs={DOCS} docs={d.docs} />
      </Card>
      <Card>
        <SectionTitle icon="history">Historique</SectionTitle>
        <HistoryTimeline items={d.history || []} />
      </Card>
    </div>
  );
}
