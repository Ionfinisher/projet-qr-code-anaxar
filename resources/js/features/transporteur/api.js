// Appels d'API de l'espace transporteur (actions PHP : demande.*, rdv.*, notif.read).
// Chaque fonction renvoie { ok, … } ; la réponse contient l'état à jour, appliqué par le fournisseur PortFlow.
import { useMemo } from 'react';
import { useApi } from '../../providers/PortFlowProvider.jsx';

export const transporteurApi = api => ({
  /** Nouvelle demande de rendez-vous → { demande, msgs } */
  submitDemande: form => api.post('demande.submit', { form }),
  /** Modification (la demande repasse en validation) → { demande, msgs } */
  modifyDemande: (id, form) => api.post('demande.modify', { id, form }),
  /** Annulation par le transporteur (créneau libéré, QR refusés à la guérite). */
  cancelDemande: (id, motif) => api.post('demande.cancel', { id, motif }),
  /** Remplace un document rejeté à la guérite : un nouveau QR signé est émis. */
  replaceDoc: (rdvId, key, meta) => api.post('rdv.replaceDoc', { rdvId, key, meta }),
  /** Trace l'envoi du QR par le WhatsApp du transporteur (journal de messagerie). */
  logWhatsApp: (rdvId, text) => api.post('rdv.waLog', { rdvId, text }),
  /** SMS du lien du pass envoyé par PortFlow au chauffeur. */
  sendPassSms: rdvId => api.post('rdv.sms', { rdvId }),
  /** Notifications lues (horodatage notifSeenAt de l'utilisateur). */
  markNotificationsRead: () => api.post('notif.read'),
});

export function useTransporteurApi() {
  const api = useApi();
  return useMemo(() => transporteurApi(api), [api]);
}
