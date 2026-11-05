// Formulaire de demande de rendez-vous : valeurs initiales, contrôles par étape, données envoyées à l'API.
import {
  DOCS, COUNTRY, parseContainer, parseBL, normalizePlate, plateValid, phoneValid, toE164, phoneCountry,
  dayStr, slotRange, licenseValid, uid,
} from '@/Lib/domain';
import { demandeRdvs, slotUsageFor } from './selectors.js';

export const STEP_DEFS = mode => [
  { key: 'slot', label: 'Opération et créneau', sub: 'Terminal, date, heure' },
  { key: 'truck', label: mode === 'lot' ? 'Camions' : 'Camion et conteneur', sub: 'Chauffeur, plaques, ISO 6346' },
  { key: 'docs', label: 'Documents', sub: '6 pièces obligatoires' },
  { key: 'review', label: 'Vérification', sub: 'Récapitulatif et envoi' },
];

/** Camion vide ; un transporteur particulier est son propre chauffeur par défaut. */
export const newTruck = self => ({
  k: uid(), rdvId: null, first: self?.first || '', last: self?.last || '',
  phoneCc: self ? phoneCountry(self.phone).cc : 'TG', phone: self ? phoneCountry(self.phone).digits : '',
  license: '', country: self?.country || 'TG', tractor: '', trailer: '', container: '', iso: '45G1', bl: '', goods: '', vgm: '',
});

export const truckFromRdv = r => ({
  k: uid(), rdvId: r.id, first: r.driver.first, last: r.driver.last, phoneCc: phoneCountry(r.driver.phone).cc, phone: phoneCountry(r.driver.phone).digits,
  license: r.driver.license || '', country: r.vehicle.country, tractor: r.vehicle.tractor, trailer: r.vehicle.trailer || '',
  container: r.container.number || '', iso: r.container.iso, bl: r.container.bl || '', goods: r.container.goods || '', vgm: r.container.vgm || '',
});

export function initialForm(user, now, slot) {
  return {
    mode: null, op: 'IMP', terminal: 'LCT', date: slot?.date || dayStr(now), start: slot?.start || null, notes: '', transitaire: '',
    mandated: { type: 'entreprise', company: '', first: '', last: '', phoneCc: 'TG', phone: '' },
    trucks: [newTruck(user.acct === 'particulier' ? user : null)], docs: {}, certify: false,
  };
}

export function formFromDemande(data, d) {
  const rs = demandeRdvs(data, d);
  const t = d.transporter;
  const p = phoneCountry(t.phone);
  return {
    mode: rs.length > 1 ? 'lot' : 'single', op: d.op, terminal: d.terminal, date: d.slot.date, start: d.slot.start, notes: d.notes || '', transitaire: d.transitaire || '',
    mandated: { type: t.type, company: t.company || '', first: t.first || '', last: t.last || '', phoneCc: p.cc, phone: p.digits },
    trucks: rs.map(truckFromRdv), docs: { ...d.docs }, certify: false,
  };
}

/** Étape 1 : créneau (existe, ouvert, pas passé, places suffisantes) et transporteur mandaté (transitaire). */
export function errStep0(data, f, user, now, editId) {
  const e = {};
  if (!f.start) e.slot = 'Choisissez un créneau.';
  else {
    const slot = data.slots.find(x => x.date === f.date && x.start === f.start);
    if (!slot) e.slot = 'Ce créneau n’existe plus : choisissez-en un autre.';
    else if (!slot.open) e.slot = 'Ce créneau est fermé : choisissez-en un autre.';
    else if (slotRange(slot).end.getTime() - 30 * 60000 < now) e.slot = 'Ce créneau est passé : choisissez-en un autre.';
    else {
      const u = slotUsageFor(slot, data.rdvs, editId);
      if (u.remaining < f.trucks.length) e.slot = `Plus que ${u.remaining} place${u.remaining > 1 ? 's' : ''} sur ce créneau pour ${f.trucks.length} camions.`;
    }
  }
  if (user.acct === 'transit') {
    const m = f.mandated;
    if (m.type === 'entreprise' && !m.company.trim()) e.mCompany = 'Indiquez le transporteur mandaté.';
    if (m.type === 'particulier' && (!m.first.trim() || !m.last.trim())) e.mName = 'Indiquez le prénom et le nom du transporteur.';
    if (!phoneValid(m.phoneCc, m.phone)) e.mPhone = `Numéro à ${COUNTRY[m.phoneCc].digits} chiffres.`;
  }
  return e;
}

/** Étape 2 : un camion (chauffeur, permis, plaques, conteneur ISO 6346, BL, marchandise, VGM). */
export function errTruck(t, op) {
  const e = {};
  if (!t.first.trim()) e.first = 'Prénom du chauffeur requis.';
  if (!t.last.trim()) e.last = 'Nom du chauffeur requis.';
  if (!phoneValid(t.phoneCc, t.phone)) e.phone = `Numéro à ${COUNTRY[t.phoneCc].digits} chiffres (envoi du QR au chauffeur).`;
  if (!licenseValid(t.license)) e.license = t.license.trim() ? 'N° de permis invalide : 5 à 20 lettres ou chiffres, dont au moins un chiffre.' : 'N° de permis de conduire du chauffeur requis.';
  if (!plateValid(t.tractor)) e.tractor = t.tractor ? 'Immatriculation invalide (4 à 12 caractères, au moins un chiffre).' : 'Immatriculation du tracteur requise.';
  if (t.trailer && !plateValid(t.trailer)) e.trailer = 'Immatriculation de la remorque invalide.';
  const c = parseContainer(t.container);
  if ((op !== 'MTP' || t.container) && !c.valid) e.container = t.container ? c.message : 'Numéro de conteneur requis (ISO 6346).';
  if (op === 'IMP' || op === 'EXP') {
    const b = parseBL(t.bl);
    if (!b.valid) e.bl = t.bl ? b.message : 'Numéro de connaissement requis.';
    if (!t.goods.trim()) e.goods = 'Décrivez la marchandise.';
  }
  if (op === 'EXP' && t.vgm && !(+t.vgm >= 1000 && +t.vgm <= 45000)) e.vgm = 'VGM attendue entre 1 000 et 45 000 kg.';
  return e;
}

/** Étape 2 : tous les camions, avec contrôle des conteneurs en double. */
export function errTrucks(f) {
  const list = f.trucks.map(t => errTruck(t, f.op));
  const seen = new Map();
  f.trucks.forEach((t, i) => {
    const c = parseContainer(t.container);
    if (c.valid) {
      if (seen.has(c.raw)) list[i].container = `Conteneur déjà saisi pour le camion ${seen.get(c.raw) + 1}.`;
      else seen.set(c.raw, i);
    }
  });
  return list;
}

/** Erreurs des 4 étapes : [créneau, camions[], documents, vérification]. */
export function wizardErrors(data, f, user, now, editId) {
  return [
    errStep0(data, f, user, now, editId || null),
    errTrucks(f),
    DOCS.filter(d => !f.docs[d.key]).length ? { docs: 'missing' } : {},
    f.certify ? {} : { certify: 'Cochez la déclaration pour envoyer la demande.' },
  ];
}
export const stepValid = (errors, i) => (Array.isArray(errors[i]) ? errors[i].every(e => !Object.keys(e).length) : !Object.keys(errors[i]).length);

/** Données envoyées à l'API (demande.submit / demande.modify). */
export function demandePayload(f) {
  const m = f.mandated;
  return {
    op: f.op, terminal: f.terminal, date: f.date, start: f.start, notes: f.notes, transitaire: f.transitaire,
    mandated: { type: m.type, company: m.company, first: m.first, last: m.last, phone: toE164(m.phoneCc, m.phone) },
    trucks: f.trucks.map(k => ({
      rdvId: k.rdvId,
      driver: { first: k.first.trim(), last: k.last.trim().toUpperCase(), phone: toE164(k.phoneCc, k.phone), license: k.license.trim().toUpperCase() },
      vehicle: { country: k.country, tractor: normalizePlate(k.tractor).trim(), trailer: normalizePlate(k.trailer).trim() },
      container: { number: parseContainer(k.container).valid ? parseContainer(k.container).raw : '', iso: k.iso, bl: parseBL(k.bl).raw, goods: k.goods.trim(), vgm: f.op === 'EXP' ? k.vgm : '' },
    })),
    docs: Object.fromEntries(DOCS.map(d => [d.key, f.docs[d.key]])),
  };
}

/** Lignes collées depuis un tableur : conteneur ; BL ; tracteur ; prénom nom ; téléphone ; marchandise ; permis. */
export function parsePastedTrucks(text) {
  return text.split(/\r?\n/).map(l => l.trim()).filter(Boolean).map(line => {
    const c = line.split(/\t|;|,/).map(x => x.trim());
    const [first, ...rest] = (c[3] || '').split(/\s+/);
    return {
      ...newTruck(null), container: (c[0] || '').toUpperCase(), bl: (c[1] || '').toUpperCase(), tractor: normalizePlate(c[2] || ''),
      first: first || '', last: rest.join(' '), phone: (c[4] || '').replace(/[^\d]/g, ''), goods: c[5] || '',
      license: (c[6] || '').toUpperCase().replace(/[^A-Z0-9 /-]/g, ''),
    };
  });
}

export const CANCEL_MOTIFS = ['Conteneur non encore libéré', 'Camion ou chauffeur indisponible', 'Changement de programme', 'Autre motif'];
