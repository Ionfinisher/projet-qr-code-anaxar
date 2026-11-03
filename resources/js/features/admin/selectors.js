// Règles d'affichage de l'administration (fonctions pures, sans appel réseau).
import {
  DOCS, slotRange, slotUsage, slotId, hhmm, addDays, parseContainer, parseBL, licenseValid, accountName, relDay,
} from '../../lib/domain.js';

export const cap = s => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
export const plural = (n, one, many = `${one}s`) => (n > 1 ? many : one);

export const ownerOf = (data, id) => data.users.find(u => u.id === id) || null;
export const profileOfUser = (data, u) => data.profiles.find(p => p.id === u?.profileId) || null;

/** Rendez-vous (camions) d'une demande. */
export const demandeRdvs = (data, d) => d.rdvIds.map(id => data.rdvs.find(r => r.id === id)).filter(Boolean);

export const pendingInscriptions = data => data.inscriptions.filter(i => i.status === 'en_attente')
  .sort((a, b) => a.submittedAt.localeCompare(b.submittedAt));
export const pendingDemandes = data => data.demandes.filter(d => d.status === 'en_attente')
  .sort((a, b) => slotRange(a.slot).start - slotRange(b.slot).start);

/** Urgence d'une demande en attente : délai avant le début du créneau. */
export function urgencyOf(d, now) {
  const ms = slotRange(d.slot).start.getTime() - now;
  const h = ms / 3600000;
  const tone = h < 3 ? 'bad' : h < 12 ? 'warn' : 'neutral';
  const label = ms <= 0 ? 'Créneau commencé' : h < 1 ? `Dans ${Math.max(1, Math.round(ms / 60000))} min` : h < 48 ? `Dans ${Math.round(h)} h` : `Dans ${Math.round(h / 24)} j`;
  return { tone, label };
}

/** Contrôles automatiques d'une demande de rendez-vous (aide à la décision ; le serveur revérifie). */
export function demandeChecks(data, d, now) {
  const owner = ownerOf(data, d.ownerId);
  const rs = demandeRdvs(data, d);
  const slot = data.slots.find(x => x.id === d.slotId) || null;
  const usage = slot ? slotUsage(slot, data.rdvs) : null;
  const needBL = d.op === 'IMP' || d.op === 'EXP';
  const withCtr = rs.filter(r => r.container.number);
  const checks = [
    { ok: !!owner?.active, t: 'Compte transporteur actif', d: owner ? accountName(owner) : 'Compte introuvable' },
    { ok: !!slot?.open, t: 'Créneau ouvert', d: slot ? `${slot.start}–${slot.end} · ${usage.used}/${slot.capacity} places réservées` : 'Créneau supprimé' },
    { ok: rs.every(r => (d.op === 'MTP' && !r.container.number) || parseContainer(r.container.number).valid), t: 'Conteneurs conformes ISO 6346',
      d: withCtr.length ? `${withCtr.filter(r => parseContainer(r.container.number).valid).length}/${withCtr.length} chiffres de contrôle valides` : 'Conteneurs vides attribués par le terminal' },
    needBL && { ok: rs.every(r => parseBL(r.container.bl).valid), t: 'Connaissements renseignés',
      d: [...new Set(rs.map(r => parseBL(r.container.bl).carrier).filter(Boolean))].join(', ') || 'Format vérifié' },
    { ok: rs.every(r => licenseValid(r.driver.license)), t: 'Permis de conduire renseignés',
      d: `${rs.filter(r => licenseValid(r.driver.license)).length}/${rs.length} n° de permis valide${rs.length > 1 ? 's' : ''}` },
    { ok: DOCS.every(x => d.docs?.[x.key]), t: 'Dossier documentaire complet', d: `${DOCS.filter(x => d.docs?.[x.key]).length}/6 documents déposés` },
    { ok: slotRange(d.slot).start.getTime() > now, t: 'Créneau à venir', d: `${relDay(d.slot.date)} · ${d.slot.start}` },
  ].filter(Boolean);
  return { owner, rs, slot, usage, checks, allOk: checks.every(c => c.ok) };
}

/* ───────────── Créneaux ───────────── */

/** Lundi de la semaine d'une date (AAAA-MM-JJ). */
export const mondayOf = d => addDays(d, -((new Date(d + 'T12:00:00Z').getUTCDay() + 6) % 7));
const overlaps = (a, b) => a.date === b.date && a.start < b.end && b.start < a.end;

/** Aperçu des créneaux qui seront créés (le serveur refait le calcul). */
export function planSlots(data, p) {
  const created = [];
  let skipped = 0;
  if (!p.from || !p.to || p.to < p.from) return { created, skipped };
  for (let d = p.from, guard = 0; d <= p.to && guard < 93; d = addDays(d, 1), guard++) {
    if (!p.days.includes(new Date(d + 'T12:00:00Z').getUTCDay())) continue;
    for (let h = p.startH; h + p.duration <= p.endH; h += p.duration) {
      const cand = { date: d, start: hhmm(h), end: hhmm(h + p.duration) };
      if (data.slots.some(x => overlaps(x, cand)) || created.some(x => overlaps(x, cand))) { skipped++; continue; }
      created.push({ id: slotId(d, cand.start), ...cand, capacity: p.capacity, open: true, closeReason: '', other: 0 });
    }
  }
  return { created, skipped };
}
