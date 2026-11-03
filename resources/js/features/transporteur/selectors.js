// Sélecteurs purs de l'espace transporteur (données reçues du serveur → listes, droits, occupation).
import { slotRange, slotUsage, statusOf } from '../../lib/domain.js';

/** Rendez-vous validés (QR émis) de l'utilisateur. */
export const myRdvs = (data, user) => data.rdvs.filter(r => r.ownerId === user.id && r.validation === 'approved');
/** Demandes de rendez-vous de l'utilisateur. */
export const myDemandes = (data, user) => data.demandes.filter(d => d.ownerId === user.id);
/** Rendez-vous (camions) d'une demande, dans l'ordre de la demande. */
export const demandeRdvs = (data, d) => d.rdvIds.map(id => data.rdvs.find(r => r.id === id)).filter(Boolean);
const anyArrived = rs => rs.some(r => r.arrivedAt || r.entryAt);

/** Modifiable : en attente avant le créneau, ou validée jusqu'à 1 h avant si aucun camion n'est arrivé. */
export function canModifyDemande(data, d, now = Date.now()) {
  const start = slotRange(d.slot).start.getTime();
  if (d.status === 'en_attente') return start > now;
  if (d.status === 'validee') return start - 60 * 60000 > now && !anyArrived(demandeRdvs(data, d));
  return false;
}
/** Annulable : en attente ou validée, créneau non terminé, aucun camion arrivé. */
export function canCancelDemande(data, d, now = Date.now()) {
  if (!['en_attente', 'validee'].includes(d.status)) return false;
  return slotRange(d.slot).end.getTime() > now && !anyArrived(demandeRdvs(data, d));
}

/** Messages reçus par l'utilisateur (e-mails, SMS, WhatsApp), du plus récent au plus ancien. */
export const userMessages = (data, user) => data.messages
  .filter(m => m.userId === user.id || (user.inscriptionId && m.insId === user.inscriptionId))
  .sort((a, b) => b.at.localeCompare(a.at));
export const unreadCount = (msgs, user) => msgs.filter(m => !user.notifSeenAt || m.at > user.notifSeenAt).length;

/** Compteurs des onglets : rendez-vous à venir et demandes en attente. */
export const upcomingCount = (rdvs, now) => rdvs.filter(r => statusOf(r, now) === 'confirme').length;
export const pendingCount = demandes => demandes.filter(d => d.status === 'en_attente').length;

/**
 * Occupation d'un créneau telle que le serveur la calcule : capacité − autres − réservations en attente et validées
 * de tous les transporteurs (compteur `booked`), hors demande en cours de modification.
 */
export function slotUsageFor(slot, rdvs, exceptDemandeId = null) {
  if (!slot.booked) return slotUsage(slot, rdvs, exceptDemandeId);
  let pending = slot.booked.pending || 0;
  let approved = slot.booked.approved || 0;
  if (exceptDemandeId) {
    for (const r of rdvs) {
      if (r.demandeId !== exceptDemandeId || r.cancelled || r.validation === 'rejected') continue;
      if (r.slot.date !== slot.date || r.slot.start !== slot.start) continue;
      if (r.validation === 'pending') pending--; else approved--;
    }
  }
  pending = Math.max(0, pending);
  approved = Math.max(0, approved);
  const other = slot.other || 0;
  const used = other + pending + approved;
  return { pending, approved, other, used, remaining: Math.max(0, slot.capacity - used), rate: slot.capacity ? used / slot.capacity : 1 };
}

/** Camions de l'utilisateur déjà placés sur un créneau (hors demande modifiée). */
export const mineOnSlot = (rdvs, userId, slot, exceptDemandeId = null) => rdvs.filter(r => r.ownerId === userId && !r.cancelled
  && r.validation !== 'rejected' && r.demandeId !== exceptDemandeId && r.slot.date === slot.date && r.slot.start === slot.start).length;

export const cap = s => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
