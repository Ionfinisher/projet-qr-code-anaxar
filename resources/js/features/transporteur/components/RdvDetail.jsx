// Détail d'un rendez-vous : pass, envoi au chauffeur, suivi du passage, contrôle documentaire, informations.
import { useRef, useState } from 'react';
import {
  DOCS, OPS, TERMINALS, ISO_TYPE, KID, checkCounts, statusOf, slotRange, fmtDayLong, fmtTime, fmtSize, fmtDuration,
  relDay, dayStr, driverName, transporterName, formatPhone,
} from '../../../lib/domain.js';
import { notify } from '../../../lib/alerts.js';
import { AppLink } from '../../../lib/navigation.jsx';
import { useApi } from '../../../providers/PortFlowProvider.jsx';
import { Alert, Badge, Button, Card, SectionTitle, KeyValue, Icon } from '../../../Components/ui/index.js';
import { GatePass, RdvStatusBadge, ContainerNumber, Plate, fileError, uploadFile } from '../../../Components/domain/index.js';
import { cn } from '../../../lib/cn.js';
import { useTransporteurApi } from '../api.js';
import { cap } from '../selectors.js';
import { PassActions } from './PassActions.jsx';
import { LotChip } from './RdvList.jsx';

const latestCheck = r => DOCS.map(d => r.checks?.[d.key]?.at).filter(Boolean).sort().pop() || null;

/** Étapes du passage : demande, QR émis, arrivée, contrôle des 6 documents, entrée, sortie. */
export function RdvTimeline({ rdv: r, now }) {
  const st = statusOf(r, now);
  const { ok, ko } = checkCounts(r);
  const steps = [
    { t: 'Demande soumise', d: `${OPS[r.op]?.label} · ${TERMINALS[r.terminal]?.short}`, at: r.createdAt, done: true },
    { t: 'Demande validée · QR signé émis', d: `JWS ES256 · clé ${KID}`, at: r.issuedAt, done: !!r.issuedAt },
    {
      t: 'Arrivée à la guérite',
      d: r.arrivedAt ? 'QR scanné, signature vérifiée' : st === 'manque' ? 'Créneau dépassé sans présentation' : `Attendu ${relDay(r.slot.date).toLowerCase()} entre ${r.slot.start} et ${r.slot.end}`,
      at: r.arrivedAt, done: !!r.arrivedAt, bad: st === 'manque',
    },
    {
      t: 'Contrôle des 6 documents', d: ko ? `${ok}/6 validés · ${ko} rejeté${ko > 1 ? 's' : ''}` : `${ok}/6 validés`,
      at: ok === 6 ? latestCheck(r) : null, done: ok === 6, bad: ko > 0, now: !!r.arrivedAt && ok < 6 && !ko,
    },
    { t: 'Entrée dans le port', d: r.entryAt ? 'Barrière ouverte' : 'Après validation des 6 documents', at: r.entryAt, done: !!r.entryAt, now: ok === 6 && !r.entryAt },
    {
      t: 'Sortie', d: r.exitAt ? `Durée dans le port : ${fmtDuration(Date.parse(r.exitAt) - Date.parse(r.entryAt))}` : r.entryAt ? `Dans le port depuis ${fmtDuration(now - Date.parse(r.entryAt))}` : '',
      at: r.exitAt, done: !!r.exitAt, now: !!r.entryAt && !r.exitAt,
    },
  ];
  return (
    <ol className="flex flex-col">
      {steps.map((x, i) => {
        const state = x.done ? 'done' : x.bad ? 'bad' : x.now ? 'now' : 'todo';
        return (
          <li key={i} className="relative flex gap-3 pb-4 last:pb-0">
            {i < steps.length - 1 && <span aria-hidden="true" className={cn('absolute left-[13px] top-7 h-[calc(100%-20px)] w-0.5', x.done ? 'bg-emerald-300' : 'bg-slate-200')} />}
            <span className={cn('relative flex h-7 w-7 shrink-0 items-center justify-center rounded-full',
              state === 'done' ? 'bg-emerald-600 text-white' : state === 'bad' ? 'bg-rose-600 text-white' : state === 'now' ? 'bg-brand-50 text-brand-700 ring-2 ring-brand-500' : 'bg-slate-100 text-slate-400 ring-1 ring-inset ring-slate-200')}>
              <Icon name={state === 'done' ? 'check' : state === 'bad' ? 'x' : state === 'now' ? 'circle-dot' : 'circle'} size={14} strokeWidth={2.6} />
            </span>
            <div className="flex min-w-0 flex-1 flex-wrap items-baseline justify-between gap-x-3 pt-0.5">
              <div className="min-w-0">
                <p className={cn('text-sm font-semibold', state === 'todo' ? 'text-slate-500' : 'text-slate-900')}>{x.t}</p>
                {x.d && <p className={cn('text-[13px]', state === 'bad' ? 'text-rose-700' : 'text-slate-500')}>{x.d}</p>}
              </div>
              <span className="text-xs tabular-nums text-slate-500">{x.at ? `${relDay(dayStr(x.at)) === 'Aujourd’hui' ? '' : relDay(dayStr(x.at)) + ' '}${fmtTime(x.at)}` : ''}</span>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

/** État d'un document au contrôle de la guérite. */
export function DocStatusRow({ doc: d, meta, check }) {
  const tone = check?.s === 'ok' ? 'ok' : check?.s === 'ko' ? 'bad' : 'neutral';
  return (
    <li className={cn('flex items-start gap-3 py-3 first:pt-0 last:pb-0', check?.s === 'ko' && 'rounded-xl bg-rose-50/60 px-2 first:pt-2 last:pb-2')}>
      <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600"><Icon name={d.icon} size={18} /></span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-slate-900">{d.label}</p>
        <p className="mt-0.5 flex flex-wrap gap-x-2 text-[13px] text-slate-500">
          {meta ? <><span className="max-w-[220px] truncate">{meta.name}</span>{meta.size > 0 && <span>{fmtSize(meta.size)}</span>}<span className="font-mono">SHA-256 {meta.sha256.slice(0, 12)}…</span></> : <span>Non déposé</span>}
        </p>
      </div>
      <Badge tone={tone} icon={check?.s === 'ok' ? 'check' : check?.s === 'ko' ? 'x' : 'clock'} className="max-w-[45%] shrink-0">
        {check?.s === 'ok' ? `Validé · ${fmtTime(check.at)}` : check?.s === 'ko' ? check.reason || 'Rejeté' : 'À contrôler'}
      </Badge>
    </li>
  );
}

/** Remplacement d'un document rejeté à la guérite (nouveau QR émis). */
export function ReplaceDoc({ rdv: r, doc: d }) {
  const api = useApi();
  const tapi = useTransporteurApi();
  const input = useRef(null);
  const [busy, setBusy] = useState(false);
  const onFile = async file => {
    if (!file) return;
    const err = fileError(file);
    if (err) { notify(err, 'bad'); return; }
    setBusy(true);
    try {
      const meta = await uploadFile(api, file);
      const res = await tapi.replaceDoc(r.id, d.key, meta);
      if (!res.ok) { notify(res.error, 'bad'); return; }
      notify(`${d.label} remplacé · nouveau QR code émis : renvoyez-le au chauffeur`, 'ok');
    } catch (e) {
      notify(e.message, 'bad');
    } finally { setBusy(false); }
  };
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-white px-3 py-2.5 ring-1 ring-inset ring-rose-200">
      <span className="text-sm text-slate-900"><span className="font-semibold">{d.label}</span> · {r.checks[d.key]?.reason}</span>
      <input ref={input} type="file" accept=".pdf,image/png,image/jpeg,image/webp" hidden onChange={e => { onFile(e.target.files?.[0]); e.target.value = ''; }} />
      <Button size="sm" variant="secondary" icon="file-up" loading={busy} onClick={() => input.current?.click()}>{busy ? 'Envoi…' : 'Remplacer le document'}</Button>
    </div>
  );
}

/** Contenu du panneau de détail d'un rendez-vous. */
export function RdvDetail({ rdv: r, rdvs, now }) {
  const st = statusOf(r, now);
  const siblings = r.lot ? rdvs.filter(x => x.lot === r.lot).sort((a, b) => a.lotIndex - b.lotIndex) : [];
  const rejected = DOCS.filter(d => r.checks?.[d.key]?.s === 'ko');
  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <RdvStatusBadge rdv={r} now={now} />
        {r.lot && <LotChip index={r.lotIndex} size={r.lotSize} prefix="Camion " />}
        <AppLink to="transporteur.demandes.detail" params={{ id: r.demandeId }}
          className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700 ring-1 ring-inset ring-slate-200 hover:bg-slate-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500">
          <Icon name="list-todo" size={14} /> Demande {r.demandeId}
        </AppLink>
      </div>

      {rejected.length > 0 && !r.entryAt && (
        <Alert tone="bad" icon="octagon-alert" role="alert" title="Document rejeté à la guérite">
          <p>Remplacez le document pour que le poste concerné puisse le revérifier. Un nouveau QR code est alors émis.</p>
          <div className="mt-3 flex flex-col gap-2">{rejected.map(d => <ReplaceDoc key={d.key} rdv={r} doc={d} />)}</div>
        </Alert>
      )}

      {st !== 'annule' ? (
        <div className="flex flex-col gap-4">
          <GatePass rdv={r} now={now} />
          <PassActions rdv={r} />
        </div>
      ) : (
        <Alert tone="info" title="Rendez-vous annulé">Le QR code n’est plus accepté à la guérite.</Alert>
      )}

      <Card>
        <SectionTitle icon="route">Suivi du passage</SectionTitle>
        <RdvTimeline rdv={r} now={now} />
      </Card>

      <Card>
        <SectionTitle icon="file-check" aside={<span className="text-[13px] tabular-nums text-slate-500">{checkCounts(r).ok}/6 validés à la guérite</span>}>Contrôle documentaire</SectionTitle>
        <ul className="flex flex-col divide-y divide-slate-100">
          {DOCS.map(d => <DocStatusRow key={d.key} doc={d} meta={r.docs?.[d.key]} check={r.checks?.[d.key]} />)}
        </ul>
      </Card>

      <Card>
        <SectionTitle icon="info">Informations</SectionTitle>
        <KeyValue items={[
          ['Transporteur', <>{transporterName(r.transporter)} <span className="text-slate-500">· {r.transporter.type === 'entreprise' ? 'Entreprise' : 'Particulier'}</span></>],
          r.transitaire && ['Transitaire', r.transitaire],
          ['Opération', `${OPS[r.op]?.label} · ${TERMINALS[r.terminal]?.label}`],
          ['Créneau', `${cap(fmtDayLong(slotRange(r.slot).start))} · ${r.slot.start}–${r.slot.end}`],
          ['Chauffeur', <>{driverName(r.driver)}{r.driver.phone && <span className="tabular-nums text-slate-500"> · {formatPhone(r.driver.phone)}</span>}</>],
          r.driver.license && ['Permis de conduire', <span className="font-mono">{r.driver.license}</span>],
          ['Tracteur', <Plate country={r.vehicle.country} value={r.vehicle.tractor} size="sm" />],
          r.vehicle.trailer && ['Remorque', <Plate country={r.vehicle.country} value={r.vehicle.trailer} size="sm" />],
          ['Conteneur', <span className="inline-flex flex-wrap items-center gap-2"><ContainerNumber value={r.container.number} /> <span className="rounded-[4px] bg-slate-100 px-1.5 py-0.5 font-mono text-xs text-slate-600">{r.container.iso}</span> <span className="text-slate-500">{ISO_TYPE[r.container.iso]?.label}</span></span>],
          r.container.bl && ['Connaissement', <span className="font-mono">{r.container.bl}</span>],
          r.container.goods && ['Marchandise', r.container.goods],
          r.container.vgm && ['VGM (SOLAS)', <span className="tabular-nums">{Number(r.container.vgm).toLocaleString('fr-FR')} kg</span>],
          r.notes && ['Instructions', r.notes],
        ]} />
      </Card>

      {siblings.length > 1 && (
        <Card>
          <SectionTitle icon="layers">Camions de la demande {r.demandeId}</SectionTitle>
          <ul className="flex flex-col gap-2">
            {siblings.map(x => (
              <li key={x.id}>
                <AppLink to="transporteur.rdv.detail" params={{ id: x.id }} replace aria-current={x.id === r.id ? 'true' : undefined}
                  className={cn('flex items-center gap-3 rounded-xl border px-3 py-2.5 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500',
                    x.id === r.id ? 'border-brand-400 bg-brand-50/60' : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50')}>
                  <span className="flex h-8 min-w-[2.5rem] items-center justify-center rounded-lg bg-slate-900 px-1.5 text-xs font-bold tabular-nums text-white">{x.lotIndex}/{x.lotSize}</span>
                  <span className="min-w-0 flex-1">
                    <ContainerNumber value={x.container.number} size="sm" />
                    <span className="mt-0.5 flex flex-wrap gap-x-2 text-[13px] text-slate-500"><span>{x.vehicle.tractor}</span><span>{driverName(x.driver)}</span><span className="font-mono">{x.id}</span></span>
                  </span>
                  <RdvStatusBadge rdv={x} now={now} />
                </AppLink>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </>
  );
}
