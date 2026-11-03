// Sélecteurs purs de la guérite.
import { dayStr, statusOf } from '../../lib/domain.js';

/** Camions du jour : créneau d'aujourd'hui, ou encore à la guérite / dans le port. */
export function gateArrivals(rdvs, now) {
  const today = dayStr(now);
  return rdvs.filter(r => !r.cancelled && (r.slot.date === today || ['controle', 'bloque', 'au_port'].includes(statusOf(r, now))));
}

/** Nombre de camions en cours de contrôle (contrôle commencé ou bloqué par un rejet). */
export const countAtGate = (rdvs, now) => gateArrivals(rdvs, now).filter(r => ['controle', 'bloque'].includes(statusOf(r, now))).length;
