// Appels d'API de l'administration du port : une fonction par action PHP (le serveur revérifie les habilitations).
import { useMemo } from 'react';
import { useApi } from '../../providers/PortFlowProvider.jsx';

export const adminApi = api => ({
  /** Inscriptions : decision = 'validee' | 'a_completer' | 'rejetee' → { ins, msgs } */
  processInscription: (id, decision, { motif = '', comment = '' } = {}) =>
    api.post('admin.inscription', { id, decision, motif, comment }),
  /** Demandes de RDV : decision = 'validee' | 'rejetee' ; updatedAt évite de traiter une demande modifiée entre-temps → { msgs } */
  processDemande: (id, decision, { motif = '', comment = '', updatedAt = '' } = {}) =>
    api.post('admin.demande', { id, decision, motif, comment, updatedAt }),
  /** Créneaux : params = { from, to, days[], startH, endH, duration, capacity } → { created, skipped } */
  addSlots: params => api.post('admin.slots.add', { params }),
  /** patch = { capacity, open, closeReason, start, end } */
  updateSlot: (id, patch) => api.post('admin.slot.update', { id, patch }),
  /** Utilisateurs : form = { first, last, email, phone (E.164), title, profileId, active, tempPassword } → { user, temp } */
  addUser: form => api.post('admin.user.add', { form }),
  updateUser: (id, form) => api.post('admin.user.update', { id, form }),
  setUserActive: (id, active) => api.post('admin.user.active', { id, active }),
  deleteUser: id => api.post('admin.user.delete', { id }),
  /** → { temp } : mot de passe provisoire, affiché une seule fois */
  resetUserPassword: id => api.post('admin.user.resetPassword', { id }),
  /** Profils : form = { name, description, kind: 'interne' | 'externe', perms[] } */
  createProfile: form => api.post('admin.profile.create', { form }),
  updateProfile: (id, form) => api.post('admin.profile.update', { id, form }),
  deleteProfile: id => api.post('admin.profile.delete', { id }),
  /** Tests du service de messagerie → { driver } */
  testMail: to => api.post('admin.mail.test', { to }),
  testSms: to => api.post('admin.sms.test', { to }),
});

export function useAdminApi() {
  const api = useApi();
  return useMemo(() => adminApi(api), [api]);
}
