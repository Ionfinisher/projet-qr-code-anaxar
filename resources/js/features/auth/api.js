// Appels d'API de l'espace public et de l'authentification (actions PHP : login, logout, password.*, inscription.*).
import { useMemo } from 'react';
import { useApi } from '../../providers/PortFlowProvider.jsx';

export const authApi = api => ({
  /** Connexion : { ok, reason: invalid|locked|inactive|gate|pending|error, left, wait, ins } */
  async login(login, password) {
    const r = await api.post('login', { login, password });
    if (!r.ok) return { ok: false, reason: r.reason === 'throttle' ? 'locked' : 'error', error: r.error, wait: 60000 };
    return r.result || { ok: false, reason: 'error' };
  },
  logout: () => api.post('logout'),
  changePassword: (next, current = '') => api.post('password.change', { current, next }),
  forgotPassword: login => api.post('password.forgot', { login }),
  resetPassword: (token, next) => api.post('password.reset', { token, next }),
  /** Demande d'inscription (formulaire à plat, téléphone E.164, pièces { clé: meta }) → { ins, msgs } */
  submitInscription: form => api.post('inscription.submit', form),
  async findInscription(ref, contact) {
    const r = await api.post('inscription.find', { ref, contact });
    return r.ok ? r.ins || null : null;
  },
  updateInscription: (id, form) => api.post('inscription.update', { id, form }),
  /** Réinitialisation des données de démonstration (super administrateur). */
  async resetDemo() {
    const r = await api.post('admin.demo.reset');
    if (!r.ok) throw new Error(r.error || 'Réinitialisation impossible.');
    return r;
  },
});

export function useAuthApi() {
  const api = useApi();
  return useMemo(() => authApi(api), [api]);
}
