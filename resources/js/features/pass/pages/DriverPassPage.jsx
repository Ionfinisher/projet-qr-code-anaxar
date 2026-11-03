import { useEffect, useState } from 'react';
import { verifyJws, rdvFromClaims, slotRange, fmtDayLong, TERMINALS, OPS, transporterName } from '../../../lib/domain.js';
import { useNav } from '../../../lib/navigation.jsx';
import { usePortFlow } from '../../../providers/PortFlowProvider.jsx';
import { useNow } from '../../../hooks/useNow.js';
import { Alert, Card, KeyValue, EmptyState, Icon, Spinner } from '../../../components/ui/index.js';
import { GatePass } from '../../../components/domain/index.js';
import { cn } from '../../../lib/cn.js';
import { usePassApi } from '../api.js';

const cap = s => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

/** Jeton signé placé dans l'ancre de l'adresse (ancien format de lien). */
function tokenFromHash() {
  try {
    const h = decodeURIComponent((window.location.hash || '').slice(1));
    return /^[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{20,}$/.test(h) ? h : null;
  } catch { return null; }
}

/** Pass chauffeur : /pass/:code (lien court envoyé par WhatsApp ou SMS). Le QR est vérifié dans le navigateur. */
export function DriverPassPage() {
  const nav = useNav();
  const { status, error } = usePortFlow();
  const passApi = usePassApi();
  const code = String(nav.params.code || '').toUpperCase();
  const [token, setToken] = useState(null);
  const [v, setV] = useState(null);
  const [err, setErr] = useState('');
  const now = useNow(30000);

  useEffect(() => {
    if (status !== 'ready') return undefined;
    let on = true;
    (async () => {
      let t = code ? null : tokenFromHash();
      if (code) {
        if (!/^[0-9A-Z]{10}$/.test(code)) { setErr('Lien de pass invalide.'); return; }
        const r = await passApi.tokenFromCode(code);
        if (!on) return;
        if (!r.ok) { setErr(r.error || 'Pass introuvable.'); return; }
        t = r.token;
      }
      if (!t) { setErr('Lien de pass incomplet : ouvrez le lien reçu par WhatsApp ou SMS.'); return; }
      setToken(t);
      const res = await verifyJws(t);
      if (on) setV(res);
    })();
    return () => { on = false; };
  }, [status, code]); // eslint-disable-line react-hooks/exhaustive-deps

  // Écran allumé pendant la présentation du QR à la guérite
  useEffect(() => {
    let lock = null;
    const req = () => navigator.wakeLock?.request?.('screen').then(l => { lock = l; }).catch(() => {});
    req();
    const vis = () => { if (document.visibilityState === 'visible') req(); };
    document.addEventListener('visibilitychange', vis);
    return () => { document.removeEventListener('visibilitychange', vis); lock?.release?.().catch(() => {}); };
  }, []);

  const r = v?.claims ? rdvFromClaims(v.claims, token) : null;
  const failure = err || (status === 'error' ? error?.error || 'Serveur PortFlow injoignable : réessayez dans un instant.' : '');

  if (failure) return <Alert tone="bad" icon="shield-x" role="alert" title="Pass indisponible">{failure}</Alert>;
  if (!v) return <EmptyState icon="qr-code" title="Ouverture du pass…"><span className="inline-flex items-center gap-2"><Spinner size={16} /> Vérification de la signature</span></EmptyState>;
  if (!r) return <Alert tone="bad" icon="shield-x" role="alert" title="Lien de pass illisible">Demandez au transporteur de vous renvoyer le lien du QR code.</Alert>;
  return (
    <>
      <Alert tone={v.ok ? 'ok' : 'bad'} icon={v.ok ? 'shield-check' : 'shield-x'} role={v.ok ? undefined : 'alert'}
        title={v.ok ? 'Pass authentique · signature vérifiée' : 'Pass non valide : contenu modifié'}>
        {v.ok ? 'Présentez ce QR code à la guérite, écran bien lumineux.' : 'Ce QR sera refusé à la guérite. Demandez un nouveau lien au transporteur.'}
      </Alert>
      <GatePass rdv={r} now={now} className={cn(!v.ok && 'opacity-60 grayscale')} />
      <Card>
        <KeyValue items={[
          ['Créneau', `${cap(fmtDayLong(slotRange(r.slot).start))} · ${r.slot.start}–${r.slot.end}`],
          ['Terminal', TERMINALS[r.terminal]?.label],
          ['Opération', OPS[r.op]?.label],
          ['Transporteur', transporterName(r.transporter)],
          r.lot && ['Demande', `${r.lot} · camion ${r.lotIndex}/${r.lotSize}`],
        ]} />
      </Card>
      <p className="flex items-start gap-2 rounded-2xl bg-white p-4 text-sm text-slate-700 ring-1 ring-inset ring-slate-200">
        <Icon name="info" size={18} className="mt-0.5 text-sky-600" /> Arrivez dans votre créneau, avec une tolérance de 15 minutes. Gardez les originaux des 6 documents dans la cabine.
      </p>
    </>
  );
}
