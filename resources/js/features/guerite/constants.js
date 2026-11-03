// Référentiels propres à la guérite.
import { KID } from '../../lib/domain.js';

/** Origine de l'ouverture d'un dossier. */
export const SOURCE = {
  camera: 'Caméra de la tablette', photo: 'Photo du QR code', image: 'Image importée', douchette: 'Douchette / saisie du code',
  demo: 'Scan simulé (démo)', ref: 'Saisie de la référence', liste: 'Ouvert depuis la liste',
};

/** Motifs proposés pour une entrée hors de la période de validité du QR (dérogation inscrite au journal). */
export const OVERRIDE_REASONS = {
  early: ['Arrivée anticipée autorisée par l’exploitation', 'Changement de créneau accordé par le bureau des rendez-vous'],
  expired: ['Retard justifié (panne, accident, embouteillage)', 'Retard dû aux formalités administratives', 'Report accordé par le bureau des rendez-vous'],
};

/** Filtres de la liste des arrivées (sur le statut dérivé). */
export const ARR_FILTERS = [
  { value: 'all', label: 'Tous', test: () => true },
  { value: 'wait', label: 'Attendus', test: st => st === 'confirme' || st === 'manque' },
  { value: 'gate', label: 'À la guérite', test: st => st === 'controle' || st === 'bloque' },
  { value: 'port', label: 'Dans le port', test: st => st === 'au_port' },
  { value: 'out', label: 'Sortis', test: st => st === 'termine' },
];

/** Standards appliqués à la guérite (la clé est lue au moment de l'affichage). */
export const gateStandards = () => [
  ['RFC 7515 · ES256', 'Vérification du QR', `La signature ECDSA P-256 (clé ${KID}) est contrôlée sur la tablette, puis confirmée par le serveur.`],
  ['HMAC-SHA-256', 'Journal chaîné et scellé', 'Chaque décision est scellée avec la clé secrète du serveur et le sceau de la précédente : toute retouche casse la chaîne.'],
  ['SHA-256', 'Empreinte des documents', 'Le fichier du dossier est comparé à l’empreinte scellée dans le QR.'],
  ['ISO 6346', 'Identification des conteneurs', 'Numéro et chiffre de contrôle affichés comme sur la porte du conteneur.'],
  ['ISO 3166-1', 'Pays d’immatriculation', 'Plaques du corridor identifiées par leur code pays.'],
  ['ISO 8601', 'Horodatage', 'Arrivée, contrôles, entrée et sortie datés en UTC, heure de Lomé.'],
  ['Code ISPS', 'Traçabilité des accès', 'Journal des passages et des refus conservé pour la sûreté portuaire, avec l’agent et le poste.'],
  ['USB / Bluetooth HID', 'Douchettes', 'Lecteurs de codes en mode clavier acceptés sans pilote.'],
  ['WCAG 2.2 AA', 'Accessibilité', 'Gros boutons tactiles, contrastes, navigation clavier.'],
];

export const STANDARDS_INTRO = 'Contrôles exécutés à la guérite : la signature du QR est vérifiée sur la tablette et par le serveur, chaque décision est inscrite au journal chaîné.';

export const cap = s => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
