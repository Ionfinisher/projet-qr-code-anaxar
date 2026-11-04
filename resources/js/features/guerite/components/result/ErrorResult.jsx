import { Alert, Button, Icon, KeyValue } from '../../../../Components/ui/index.js';
import { Plate, ContainerNumber } from '../../../../Components/domain/index.js';

const FRAUD = {
  signature: ['QR code non authentique', 'La signature ne correspond pas au contenu : le QR a été modifié ou fabriqué. Accès refusé. L’incident est inscrit au journal.'],
  superseded: ['QR code remplacé', 'Une version plus récente de ce QR a été émise (document remplacé). Demandez au chauffeur le dernier QR reçu.'],
  cancelled: ['Rendez-vous annulé', 'Ce rendez-vous a été annulé par le transporteur. Le QR n’est plus accepté.'],
};

/** Refus ou lecture impossible : QR falsifié, remplacé, annulé, introuvable, format inconnu, serveur. */
export function ErrorResult({ cur, rdvs, onClear }) {
  const fraud = FRAUD[cur.error];
  if (fraud) {
    const c = cur.claims || {};
    const r = cur.id ? rdvs.find(x => x.id === cur.id) : null;
    const [cc, plate] = String(c.veh || '').split('|');
    return (
      <section aria-live="assertive" className="flex flex-col gap-4">
        <div role="alert" className="flex flex-col gap-4 rounded-3xl border-2 border-rose-500 bg-rose-50 p-5 sm:p-6">
          <h2 className="flex items-center gap-3 text-2xl font-extrabold text-rose-800"><Icon name="shield-x" size={34} /> {fraud[0]}</h2>
          <p className="text-base text-rose-950">{fraud[1]}</p>
          {cur.error === 'signature' && (
            <div className="rounded-2xl bg-white p-4 ring-1 ring-inset ring-rose-200">
              <KeyValue dense items={[
                ['Référence lue', <span className="font-mono">{c.sub || '—'}</span>],
                ['Plaque lue', plate ? <Plate country={cc || 'TG'} value={plate} size="sm" /> : '—'],
                ['Conteneur lu', <ContainerNumber value={c.ctr} size="sm" />],
                ['Motif', cur.reason === 'signature' ? 'Contenu modifié après signature' : cur.reason === 'kid' ? 'Clé de signature inconnue (QR d’une autre installation)' : 'Algorithme non autorisé'],
              ]} />
            </div>
          )}
          {r && cur.error !== 'signature' && <p className="font-mono text-sm text-slate-900">{r.id} · {r.vehicle.country} {r.vehicle.tractor}</p>}
        </div>
        <div className="flex justify-end"><Button variant="secondary" size="lg" icon="scan-line" onClick={onClear}>Camion suivant</Button></div>
      </section>
    );
  }
  const msg = {
    notfound: ['Rendez-vous introuvable', `Aucun rendez-vous validé ne correspond à « ${cur.input} ». Vérifiez la saisie ou demandez au chauffeur son dernier QR.`],
    format: ['Code non reconnu', 'Scannez un QR code PortFlow ou saisissez une référence au format PF-XXXXXX.'],
    server: ['Contrôle impossible', cur.message || 'Le serveur n’a pas répondu : réessayez.'],
  }[cur.error] || ['Lecture impossible', 'Réessayez.'];
  return (
    <section aria-live="polite" className="flex flex-col gap-4">
      <Alert tone="warn" role="alert" title={msg[0]}>{msg[1]}</Alert>
      <div className="flex justify-end"><Button variant="secondary" size="lg" icon="scan-line" onClick={onClear}>Recommencer</Button></div>
    </section>
  );
}
