// Résultat du contrôle : authenticité, créneau, identité du camion, documents, barrière.
import { useState } from 'react';
import { DOC, DOCS, REJECT_REASONS, statusOf, checkCounts, fmtTime, fmtTimeS, fmtDuration } from '../../../lib/domain.js';
import { notify, chooseReason } from '../../../lib/alerts.js';
import { Alert, Button, Card, SectionTitle, EmptyState } from '../../../Components/ui/index.js';
import { useGateApi } from '../api.js';
import { OVERRIDE_REASONS, SOURCE } from '../constants.js';
import { AuthBanner } from './result/AuthBanner.jsx';
import { SlotCheck } from './result/SlotCheck.jsx';
import { TruckIdentity } from './result/TruckIdentity.jsx';
import { MyDoc, SupDocs, ChecksGrid } from './result/Documents.jsx';
import { ErrorResult } from './result/ErrorResult.jsx';
import { showGateOverlay } from './gateOverlay.js';

export function ScanResult({ cur, rdvs, post, now, onClear }) {
  const gate = useGateApi();
  const [gateBusy, setGateBusy] = useState(false);

  if (!cur) {
    return (
      <section aria-live="polite" className="flex min-h-[320px] items-center justify-center rounded-3xl border-2 border-dashed border-slate-300 bg-white/60">
        <EmptyState icon="scan-line" title="En attente d’un camion">
          Scannez le QR code du chauffeur : identité, créneau, document de votre poste et décision s’affichent ici.
        </EmptyState>
      </section>
    );
  }
  if (cur.error) return <ErrorResult cur={cur} rdvs={rdvs} onClear={onClear} />;
  const r = rdvs.find(x => x.id === cur.id);
  if (!r) return <ErrorResult cur={{ ...cur, error: 'notfound', input: cur.input || cur.id }} rdvs={rdvs} onClear={onClear} />;

  const st = statusOf(r, now);
  const { ok, ko } = checkCounts(r);
  const myDoc = post !== 'sup' ? DOCS.find(d => d.post === post) : null;
  const closed = st === 'termine' || st === 'au_port';

  const decide = async (key, s, reason = '') => {
    const res = await gate.check(r.id, key, s, reason);
    if (!res.ok) { notify(res.error, 'bad'); return; }
    notify(s === 'ok' ? `${DOC[key].label} validé` : `${DOC[key].label} rejeté · ${reason}`, s === 'ok' ? 'ok' : 'bad');
  };
  const reject = async key => {
    const pick = await chooseReason({
      title: `Rejeter : ${DOC[key].label}`,
      text: 'Le transporteur est informé du motif et peut remplacer le document. L’entrée reste bloquée.',
      reasons: REJECT_REASONS, confirmText: 'Confirmer le rejet', tone: 'danger',
    });
    if (pick) await decide(key, 'ko', pick.reason);
  };
  const enter = async (override = '') => {
    if (checkCounts(r).ok < 6 || gateBusy) return;
    setGateBusy(true);
    let res;
    try { res = await gate.entry(r.id, override); } finally { setGateBusy(false); }
    if (!res.ok) {
      // QR hors de sa période de validité : le serveur exige le motif de la dérogation (inscrit au journal)
      if (res.reason === 'timing') {
        const pick = await chooseReason({
          title: 'Entrée hors période de validité', notice: res.error,
          text: 'La dérogation, son motif et votre nom sont inscrits au journal de la guérite.',
          reasons: OVERRIDE_REASONS[res.timing] || [], confirmText: 'Autoriser l’entrée', tone: 'ok', maxLength: 150,
        });
        if (pick) await enter(pick.reason);
        return;
      }
      notify(res.error, 'bad');
      return;
    }
    await showGateOverlay({ kind: 'in', at: Date.now(), rdv: r });
    onClear();
  };
  const exit = async () => {
    if (gateBusy) return;
    setGateBusy(true);
    let res;
    try { res = await gate.exit(r.id); } finally { setGateBusy(false); }
    if (!res.ok) { notify(res.error, 'bad'); return; }
    await showGateOverlay({ kind: 'out', at: Date.now(), rdv: r });
    onClear();
  };

  return (
    <section aria-live="polite" aria-label={`Dossier ${r.id}`} className="flex flex-col gap-4">
      <AuthBanner cur={cur} />
      {st === 'termine' && (
        <Alert tone="info" icon="log-out" title="Passage clôturé">
          Entré à {fmtTime(r.entryAt)}, sorti à {fmtTime(r.exitAt)} · {fmtDuration(Date.parse(r.exitAt) - Date.parse(r.entryAt))} dans le port.
        </Alert>
      )}
      {st === 'au_port' && (
        <Alert tone="ok" icon="log-in" title="Camion dans le port">
          Entré à {fmtTime(r.entryAt)}, depuis {fmtDuration(now - Date.parse(r.entryAt))}. {post === 'sup' ? 'Validez la sortie au départ du camion.' : 'La sortie est validée par le superviseur.'}
        </Alert>
      )}
      {!r.entryAt && <SlotCheck rdv={r} now={now} />}
      <TruckIdentity rdv={r} now={now} />
      {myDoc && !closed && <MyDoc rdv={r} doc={myDoc} cur={cur} onOk={() => decide(myDoc.key, 'ok')} onKo={() => reject(myDoc.key)} />}

      <Card padded={false} className="p-4 sm:p-5">
        <SectionTitle icon="list-checks" aside={
          <span className="text-sm font-bold tabular-nums text-slate-900">{ok}/6{ko ? <span className="text-rose-700"> · {ko} rejet{ko > 1 ? 's' : ''}</span> : null}</span>
        }>{post === 'sup' ? 'Contrôle des 6 documents' : 'Avancement des autres postes'}</SectionTitle>
        {post === 'sup' && !closed
          ? <SupDocs rdv={r} cur={cur} onOk={k => decide(k, 'ok')} onKo={k => reject(k)} />
          : <ChecksGrid rdv={r} mine={myDoc?.key} />}
      </Card>

      {post === 'sup' && st !== 'termine' && (
        <div className="flex flex-col gap-2 rounded-3xl bg-slate-900 p-4 sm:p-5">
          {st === 'au_port' ? (
            <Button size="xl" variant="primary" icon="log-out" block loading={gateBusy} onClick={exit}>Valider la sortie</Button>
          ) : (
            <>
              <Button size="xl" variant="ok" icon="lock-open" block disabled={ok < 6} loading={gateBusy} onClick={() => enter()}>
                Ouvrir la barrière<span className="hidden sm:inline"> · valider l’entrée</span>
              </Button>
              <p className="text-center text-sm text-slate-300">
                {ok < 6 ? `Disponible quand les 6 documents sont validés (${ok}/6${ko ? `, ${ko} rejeté${ko > 1 ? 's' : ''}` : ''}).` : 'Les 6 contrôles sont validés : l’entrée est horodatée et inscrite au journal.'}
              </p>
            </>
          )}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="text-[13px] text-slate-500">Ouvert à {fmtTimeS(cur.at)} · {SOURCE[cur.source] || ''}</span>
        <Button variant="secondary" size="lg" icon="scan-line" onClick={onClear}>Camion suivant</Button>
      </div>
    </section>
  );
}
