// Pass chauffeur : jeton signé à partir du code court du lien (?p=CODE → action PHP « pass »).
import { useMemo } from 'react';
import { useApi } from '../../providers/PortFlowProvider.jsx';

export const passApi = api => ({
  /** { ok, token } ou { ok: false, error } (pass annulé, remplacé, inconnu). */
  tokenFromCode: code => api.get('pass', { c: code }),
});

export function usePassApi() {
  const api = useApi();
  return useMemo(() => passApi(api), [api]);
}
