// Canaux du service de messagerie (les messages sont rédigés et envoyés par le serveur)
export const CHANNELS = {
  email: { label: 'E-mail', icon: 'mail' },
  sms: { label: 'SMS', icon: 'message-square' },
  whatsapp: { label: 'WhatsApp', icon: 'message-circle' },
};

/** Statut d'envoi d'un message, tel que renseigné par le serveur. */
export const MSG_STATUS = {
  envoye: { label: 'Envoyé', tone: 'ok', icon: 'check' },
  simule: { label: 'Simulation · non envoyé', tone: 'neutral', icon: 'sparkles' },
  desactive: { label: 'Non envoyé · canal non configuré', tone: 'warn', icon: 'mail-warning' },
  en_file: { label: 'En file d’envoi', tone: 'info', icon: 'clock' },
  echec: { label: 'Échec de l’envoi', tone: 'bad', icon: 'triangle-alert' },
  manuel: { label: 'Envoyé depuis le WhatsApp du transporteur', tone: 'ok', icon: 'message-circle' },
};
