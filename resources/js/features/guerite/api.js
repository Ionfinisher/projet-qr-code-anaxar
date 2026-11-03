// Appels d'API de l'application Guérite (actions PHP gate.*). Le client appartient au fournisseur
// <PortFlowProvider app="guerite"> : chaque appel porte l'en-tête X-PF-App: guerite.
import { useMemo } from 'react';
import { useApi } from '../../providers/PortFlowProvider.jsx';

export const gateApi = api => ({
  /** Poste de l'agent : 1 à 6 (un document chacun) ou 'sup' (superviseur). */
  setPost: post => api.post('gate.post', { post }),
  /** Contrôle d'un QR signé ou d'une référence PF-XXXXXX → { scan: { id, rdv, source, verif } | { error, reason, claims, input, id } } */
  scan: (input, source) => api.post('gate.scan', { input, source }),
  /** Ouverture d'un dossier depuis la liste des arrivées (sans scan). */
  open: id => api.post('gate.open', { id }),
  /** Décision sur un document : s = 'ok' | 'ko' (motif obligatoire). */
  check: (id, key, s, reason = '') => api.post('gate.check', { id, key, s, reason }),
  /** Entrée : 6 documents validés. Hors période du QR → { ok: false, reason: 'timing', timing: 'early' | 'expired' } (HTTP 409). */
  entry: (id, override = '') => api.post('gate.entry', { id, override }),
  exit: id => api.post('gate.exit', { id }),
  /** Vérification du journal chaîné par le serveur → { chain: { ok, count, last } | { ok: false, at, reason } } */
  chain: () => api.get('gate.chain'),
  /** Export CSV du journal (superviseur) : lien de téléchargement. */
  csvUrl: () => api.url('gate.csv', { app: 'guerite' }),
});

export function useGateApi() {
  const api = useApi();
  return useMemo(() => gateApi(api), [api]);
}
