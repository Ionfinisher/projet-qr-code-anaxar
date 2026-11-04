// Formulaire de demande d'inscription : valeurs initiales, contrôles par étape, exemple fictif (démo).
import { INS_DOCS, COUNTRY, emailValid, phoneValid, phoneCountry, passwordOk, toE164 } from '../../lib/domain.js';

export const REG_STEPS = [
  { label: 'Profil et identité', sub: 'Entreprise, transitaire ou particulier' },
  { label: 'Contact et accès', sub: 'E-mail, téléphone, mot de passe' },
  { label: 'Pièces justificatives', sub: 'RCCM, NIF, agrément…' },
  { label: 'Vérification', sub: 'Récapitulatif et envoi' },
];

export const emptyReg = () => ({
  kind: 'transport', company: '', nif: '', rccm: '', address: '', city: 'Lomé', country: 'TG',
  rep: { first: '', last: '', role: '' }, fleet: '', first: '', last: '', idNumber: '',
  email: '', phoneCc: 'TG', phone: '', password: '', password2: '', docs: {}, cgu: false, rgpd: false,
});

/** Formulaire prérempli à partir d'une demande existante (mise à jour). */
export function regFromIns(ins) {
  const p = phoneCountry(ins.phone);
  return {
    ...emptyReg(), kind: ins.kin   d, company: ins.company || '', nif: ins.nif || '', rccm: ins.rccm || '', address: ins.address || '',
    city: ins.city || '', country: ins.country || 'TG', rep: ins.rep ? { ...ins.rep } : { first: '', last: '', role: '' }, fleet: ins.fleet ? String(ins.fleet) : '',
    first: ins.first || '', last: ins.last || '', idNumber: ins.idNumber || '', email: ins.email || '', phoneCc: p.cc, phone: p.digits,
    docs: { ...ins.docs }, cgu: true, rgpd: true,
  };
}

/** Erreurs par étape : [identité, contact, pièces, vérification]. */
export function regErrors(f, edit) {
  const e0 = {}, e1 = {}, e2 = {}, e3 = {};
  if (f.kind === 'particulier') {
    if (!f.first.trim()) e0.first = 'Indiquez votre prénom.';
    if (!f.last.trim()) e0.last = 'Indiquez votre nom.';
    if (f.idNumber.trim().length < 5) e0.idNumber = 'Indiquez le numéro de votre pièce d’identité.';
  } else {
    if (f.company.trim().length < 2) e0.company = 'Indiquez la raison sociale.';
    if (!/^[A-Z0-9]{6,15}$/i.test(f.nif.replace(/\s/g, ''))) e0.nif = 'NIF : 6 à 15 chiffres ou lettres.';
    if (f.rccm.trim().length < 5) e0.rccm = 'Indiquez le numéro RCCM.';
    if (!f.address.trim()) e0.address = 'Indiquez l’adresse du siège.';
    if (!f.rep.first.trim()) e0.repFirst = 'Prénom du représentant requis.';
    if (!f.rep.last.trim()) e0.repLast = 'Nom du représentant requis.';
    if (!f.rep.role.trim()) e0.repRole = 'Fonction du représentant requise.';
  }
  if (!f.city.trim()) e0.city = 'Indiquez la ville.';
  if (f.fleet && !(+f.fleet >= 0 && +f.fleet <= 5000)) e0.fleet = 'Nombre de camions entre 0 et 5 000.';
  if (f.kind !== 'particulier' && !f.email.trim()) e1.email = 'L’e-mail de l’entreprise est requis : les notifications y sont envoyées.';
  else if (f.email.trim() && !emailValid(f.email)) e1.email = 'Adresse e-mail invalide (ex. contact@societe.tg).';
  if (!phoneValid(f.phoneCc, f.phone)) e1.phone = `Numéro à ${COUNTRY[f.phoneCc].digits} chiffres après l’indicatif +${COUNTRY[f.phoneCc].dial}.`;
  if (!edit || f.password) {
    if (!passwordOk(f.password)) e1.password = 'Le mot de passe ne respecte pas les règles ci-dessous.';
    if (f.password2 !== f.password) e1.password2 = 'Les deux mots de passe ne correspondent pas.';
  }
  const missing = INS_DOCS[f.kind].filter(d => !f.docs[d.key]);
  if (missing.length) e2.docs = `Manquant : ${missing.map(d => d.label).join(', ')}.`;
  if (!f.cgu) e3.cgu = 'Acceptez les conditions d’utilisation.';
  if (!f.rgpd) e3.rgpd = 'Le consentement est nécessaire pour examiner votre demande.';
  return [e0, e1, e2, e3];
}

/** Données envoyées à l'API (téléphone E.164, seules les pièces attendues). */
export const regPayload = f => ({
  ...f, phone: toE164(f.phoneCc, f.phone), docs: Object.fromEntries(INS_DOCS[f.kind].map(d => [d.key, f.docs[d.key]])),
});

/** Exemple fictif (mode démonstration). */
export function sampleReg(kind) {
  const r = n => Array.from({ length: n }, () => Math.floor(Math.random() * 10)).join('');
  if (kind === 'particulier') return { first: 'Komla', last: 'ATSU', idNumber: `CNI ${r(4)}-${r(4)}-${r(1)}`, city: 'Kpalimé', country: 'TG', fleet: '1', email: '', phoneCc: 'TG', phone: '9' + r(7), password: 'Komla#Atsu2026', password2: 'Komla#Atsu2026' };
  const transit = kind === 'transit';
  const name = transit ? 'Lagune Transit SARL' : 'Kara Logistique SARL';
  const dom = transit ? 'lagunetransit.tg' : 'karalogistique.tg';
  return {
    company: name, nif: '1000' + r(6), rccm: `TG-LOM 2024 B ${r(4)}`, address: transit ? 'Boulevard du 13 Janvier' : 'Quartier Agbalépédogan', city: 'Lomé', country: 'TG',
    rep: { first: 'Akossiwa', last: 'BOKO', role: transit ? 'Directrice' : 'Gérante' }, fleet: transit ? '' : '8',
    email: `exploitation.${r(3)}@${dom}`, phoneCc: 'TG', phone: '9' + r(7), password: 'Kara#Logistique26', password2: 'Kara#Logistique26',
  };
}
