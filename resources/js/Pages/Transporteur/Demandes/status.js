import { OPS, TERMINALS } from '@/Lib/domain';

export { OPS as OP_META, TERMINALS };

export const STATUS_META = {
  en_attente: { label: 'En attente', tone: 'warn', icon: 'hourglass' },
  validee: { label: 'Validée', tone: 'ok', icon: 'circle-check' },
  rejetee: { label: 'Rejetée', tone: 'bad', icon: 'circle-x' },
  annulee: { label: 'Annulée', tone: 'neutral', icon: 'calendar-x' },
};

export const EVENT_META = {
  soumise: { label: 'Demande envoyée', tone: 'info', icon: 'send' },
  modifiee: { label: 'Demande modifiée', tone: 'info', icon: 'pencil' },
  annulee: { label: 'Demande annulée', tone: 'neutral', icon: 'calendar-x' },
  validee: { label: 'Demande validée', tone: 'ok', icon: 'circle-check' },
  rejetee: { label: 'Demande rejetée', tone: 'bad', icon: 'circle-x' },
};

export const CANCEL_REASONS = [
  'Conteneur non encore libéré',
  'Camion ou chauffeur indisponible',
  'Changement de programme',
  'Autre motif',
];

export const statusMeta = (status) => STATUS_META[status] || { label: status, tone: 'neutral', icon: 'info' };

export const opLabel = (op) => OPS[op]?.label || op;

export const terminalLabel = (terminal) => TERMINALS[terminal]?.label || terminal;
