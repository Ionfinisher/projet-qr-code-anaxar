// PortFlow — règles métier sans interface (reprises à l’identique de la version précédente)
// Standards : ISO 6346 (conteneurs), ISO 3166-1 (pays), UIT-T E.164 (téléphones),
// ISO 8601 (horodatage), RFC 7515/7519 JWS ES256 (QR signé par le serveur, vérifié ici), SHA-256 (empreintes,
// journal chaîné), contrôle d'accès par profils (RBAC, appliqué par le serveur)

export const TZ = 'Africa/Lome'; // UTC+0 toute l'année
export const LOCODE = 'TGLFW';   // UN/LOCODE du port de Lomé
export let KID = '';
let PUB_JWK = null;

/** Clé publique de vérification des QR (JWK P-256), publiée par le serveur. */
export function setVerifyKey(jwk, kid) {
  PUB_JWK = jwk || null;
  KID = kid || '';
  keysPromise = null;
}

/* ───────────────────────── Référentiels ───────────────────────── */

export const DOCS = [
  { key: 'bc', post: 1, label: 'Bon de chargement', short: 'Chargement', icon: 'file-text', hint: "Ordre d'enlèvement ou de chargement du conteneur" },
  { key: 'bf', post: 2, label: 'Bon de fret', short: 'Fret', icon: 'package', hint: 'Document de fret de la marchandise' },
  { key: 'as', post: 3, label: 'Assurance', short: 'Assurance', icon: 'shield-check', hint: "Attestation d'assurance du camion en cours de validité" },
  { key: 'vt', post: 4, label: 'Visite technique', short: 'Visite tech.', icon: 'gauge', hint: 'Certificat de visite technique du camion' },
  { key: 'gp', post: 5, label: 'Gate pass', short: 'Gate pass', icon: 'stamp', hint: 'Laissez-passer délivré par le terminal' },
  { key: 'ta', post: 6, label: 'Terminal access', short: 'Accès terminal', icon: 'key-round', hint: "Autorisation d'accès au terminal" },
];
export const DOC = Object.fromEntries(DOCS.map(d => [d.key, d]));

export const OPS = {
  IMP: { label: 'Enlèvement import', short: 'Import', hint: 'Sortie d’un conteneur plein débarqué' },
  EXP: { label: 'Livraison export', short: 'Export', hint: 'Dépôt d’un conteneur plein à embarquer' },
  MTR: { label: 'Restitution de vide', short: 'Retour vide', hint: 'Retour d’un conteneur vide au parc' },
  MTP: { label: 'Retrait de vide', short: 'Retrait vide', hint: 'Prise d’un conteneur vide pour empotage' },
};

export const TERMINALS = {
  LCT: { label: 'Lomé Container Terminal', short: 'LCT' },
  TGT: { label: 'Togo Terminal', short: 'Togo Terminal' },
  QCV: { label: 'Quai conventionnel', short: 'Quai conv.' },
};

// Codes taille/type ISO 6346
export const ISO_TYPES = [
  { code: '22G1', label: "20' standard" },
  { code: '42G1', label: "40' standard" },
  { code: '45G1', label: "40' High Cube" },
  { code: 'L5G1', label: "45' High Cube" },
  { code: '22R1', label: "20' frigorifique" },
  { code: '45R1', label: "40' HC frigorifique" },
  { code: '22U1', label: "20' open top" },
  { code: '42U1', label: "40' open top" },
  { code: '22P1', label: "20' flat rack" },
  { code: '42P1', label: "40' flat rack" },
  { code: '22T1', label: "20' citerne" },
];
export const ISO_TYPE = Object.fromEntries(ISO_TYPES.map(t => [t.code, t]));

// ISO 3166-1 alpha-2 + indicatifs E.164 (corridor Lomé – Sahel)
export const COUNTRIES = [
  { code: 'TG', name: 'Togo', dial: '228', digits: 8 },
  { code: 'BJ', name: 'Bénin', dial: '229', digits: 10 },
  { code: 'BF', name: 'Burkina Faso', dial: '226', digits: 8 },
  { code: 'ML', name: 'Mali', dial: '223', digits: 8 },
  { code: 'NE', name: 'Niger', dial: '227', digits: 8 },
  { code: 'GH', name: 'Ghana', dial: '233', digits: 9 },
  { code: 'CI', name: "Côte d'Ivoire", dial: '225', digits: 10 },
];
export const COUNTRY = Object.fromEntries(COUNTRIES.map(c => [c.code, c]));

// Codes propriétaires BIC (préfixes conteneurs) et SCAC (préfixes de connaissement) les plus courants
const BIC_OWNERS = {
  MSCU: 'MSC', MEDU: 'MSC', MAEU: 'Maersk', MSKU: 'Maersk', MRKU: 'Maersk', CMAU: 'CMA CGM',
  HLXU: 'Hapag-Lloyd', ONEU: 'ONE', EGHU: 'Evergreen', CSNU: 'COSCO', OOLU: 'OOCL', TGHU: 'Textainer',
};
const SCAC = {
  MEDU: 'MSC', MAEU: 'Maersk', CMDU: 'CMA CGM', HLCU: 'Hapag-Lloyd', ONEY: 'ONE',
  EGLV: 'Evergreen', COSU: 'COSCO', OOLU: 'OOCL', ZIMU: 'ZIM',
};

/* ───────────────────────── ISO 6346 ───────────────────────── */

const LETTER_VALUE = (() => {
  const map = {};
  let v = 10;
  for (const ch of 'ABCDEFGHIJKLMNOPQRSTUVWXYZ') {
    if (v % 11 === 0) v++; // les multiples de 11 sont sautés
    map[ch] = v++;
  }
  return map;
})();

export function iso6346CheckDigit(code10) {
  let sum = 0;
  for (let i = 0; i < 10; i++) {
    const ch = code10[i];
    const val = ch >= '0' && ch <= '9' ? ch.charCodeAt(0) - 48 : LETTER_VALUE[ch];
    sum += val * 2 ** i;
  }
  return (sum % 11) % 10;
}

export function withCheckDigit(owner4, serial6) {
  const base = owner4 + serial6;
  return base + iso6346CheckDigit(base);
}

/** Analyse un numéro de conteneur et renvoie un diagnostic lisible. */
export function parseContainer(input) {
  const raw = String(input || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  const res = { raw, valid: false, complete: raw.length >= 11, message: '', owner: null, ownerName: null };
  if (!raw) { res.message = ''; return res; }
  if (/[0-9]/.test(raw.slice(0, 3))) {
    res.message = 'Les 3 premiers caractères sont des lettres (code propriétaire BIC).';
    return res;
  }
  if (raw.length >= 4 && !'UJZ'.includes(raw[3])) {
    res.message = '4e caractère : U, J ou Z (catégorie d’équipement).';
    return res;
  }
  if (raw.length > 4 && !/^[0-9]*$/.test(raw.slice(4))) {
    res.message = 'Après les 4 lettres : 6 chiffres de série et 1 chiffre de contrôle.';
    return res;
  }
  if (raw.length < 11) { res.message = `${raw.length}/11 caractères (4 lettres + 7 chiffres).`; return res; }
  if (raw.length > 11) { res.message = '11 caractères maximum.'; return res; }
  const expected = iso6346CheckDigit(raw.slice(0, 10));
  res.owner = raw.slice(0, 4);
  res.ownerName = BIC_OWNERS[res.owner] || null;
  if (+raw[10] !== expected) {
    res.message = `Chiffre de contrôle incorrect : ${expected} attendu, ${raw[10]} saisi.`;
    res.expected = expected;
    return res;
  }
  res.valid = true;
  res.message = res.ownerName ? `Chiffre de contrôle valide · ${res.ownerName}` : 'Chiffre de contrôle valide';
  return res;
}

export function splitContainer(n) {
  const raw = String(n || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (raw.length !== 11) return null;
  return { owner: raw.slice(0, 4), serial: raw.slice(4, 10), check: raw[10] };
}

/* ───────────────────────── Autres contrôles ───────────────────────── */

export function parseBL(input) {
  const raw = String(input || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  const carrier = SCAC[raw.slice(0, 4)] || null;
  const valid = /^[A-Z0-9]{6,20}$/.test(raw);
  let message = '';
  if (raw && !valid) message = raw.length < 6 ? 'Au moins 6 caractères.' : '20 caractères maximum.';
  else if (valid && carrier) message = `Armateur ${carrier} (SCAC ${raw.slice(0, 4)})`;
  return { raw, valid, carrier, message };
}

/** N° de permis de conduire : 5 à 20 lettres ou chiffres, au moins un chiffre. */
export function licenseValid(input) {
  const core = String(input || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  return core.length >= 5 && core.length <= 20 && /[0-9]/.test(core);
}

export function normalizePlate(input) {
  return String(input || '').toUpperCase().replace(/[^A-Z0-9 -]/g, '').replace(/\s+/g, ' ').trimStart().slice(0, 14);
}
export function plateValid(p) {
  const core = String(p || '').replace(/[^A-Z0-9]/g, '');
  return core.length >= 4 && core.length <= 12 && /[0-9]/.test(core);
}

export function phoneDigits(country, input) {
  let d = String(input || '').replace(/\D/g, '');
  const c = COUNTRY[country] || COUNTRY.TG;
  if (d.startsWith(c.dial) && d.length > c.digits) d = d.slice(c.dial.length);
  if (country === 'GH' && d.length === 10 && d.startsWith('0')) d = d.slice(1); // préfixe national 0
  return d.slice(0, c.digits);
}
export function phoneValid(country, input) {
  const c = COUNTRY[country] || COUNTRY.TG;
  return phoneDigits(country, input).length === c.digits;
}
export function toE164(country, input) {
  const c = COUNTRY[country] || COUNTRY.TG;
  return '+' + c.dial + phoneDigits(country, input);
}
export function formatPhone(e164) {
  const m = String(e164 || '').match(/^\+(\d{3})(\d+)$/);
  if (!m) return e164 || '';
  const [, dial, rest] = m;
  const groups = rest.length === 9 ? [rest.slice(0, 2), rest.slice(2, 5), rest.slice(5)] : rest.match(/.{1,2}/g);
  return `+${dial} ${groups.join(' ')}`;
}
export function emailValid(e) {
  return /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(String(e || '').trim());
}

/* ───────────────────────── Temps (Lomé = UTC) ───────────────────────── */

export const SLOT_STARTS = [0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22]; // guérite ouverte 24 h/24, créneaux de 2 h
export const SLOT_CAPACITY = 40;
const pad = n => String(n).padStart(2, '0');
export const hhmm = h => `${pad(h)}:00`;

export function dayStr(d = new Date()) { return new Date(d).toISOString().slice(0, 10); }
export function addDays(dateStr, n) { const d = new Date(dateStr + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return dayStr(d); }
const hmToMs = t => { const [h, m] = String(t || '00:00').split(':').map(Number); return ((h || 0) * 60 + (m || 0)) * 60000; };
export function slotRange(slot) {
  const day0 = Date.parse(`${slot.date}T00:00:00Z`);
  const start = new Date(day0 + hmToMs(slot.start));
  let end = slot.end ? day0 + hmToMs(slot.end) : start.getTime() + 2 * 3600000;
  if (end <= start.getTime()) end += 86400000;
  return { start, end: new Date(end) };
}
export const slotId = (date, start) => `S-${date.replace(/-/g, '')}-${start.replace(':', '')}`;
export const slotLabel = slot => `${slot.start}–${slot.end}`;
export function slotOf(date) {
  const d = new Date(date);
  const h = Math.floor(d.getUTCHours() / 2) * 2;
  return { date: dayStr(d), start: hhmm(h), end: hhmm(h + 2) };
}
export function isoNow() { return new Date().toISOString().replace(/\.\d{3}Z$/, 'Z'); }

const fmt = (opts) => new Intl.DateTimeFormat('fr-FR', { timeZone: TZ, ...opts });
const F = {
  time: fmt({ hour: '2-digit', minute: '2-digit' }),
  timeS: fmt({ hour: '2-digit', minute: '2-digit', second: '2-digit' }),
  dayLong: fmt({ weekday: 'long', day: 'numeric', month: 'long' }),
  dayShort: fmt({ weekday: 'short', day: 'numeric', month: 'short' }),
  dateTime: fmt({ day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
  dayNum: fmt({ day: 'numeric' }),
  wd: fmt({ weekday: 'short' }),
};
export const fmtTime = d => (d ? F.time.format(new Date(d)) : '');
export const fmtTimeS = d => (d ? F.timeS.format(new Date(d)) : '');
export const fmtDayLong = d => F.dayLong.format(new Date(d));
export const fmtDayShort = d => F.dayShort.format(new Date(d));
export const fmtDateTime = d => (d ? F.dateTime.format(new Date(d)).replace(' ', ' · ') : '');
export const fmtWeekday = d => F.wd.format(new Date(d)).replace('.', '');
export const fmtDayNum = d => F.dayNum.format(new Date(d));
export function relDay(dateStr, today = dayStr()) {
  const diff = Math.round((Date.parse(dateStr) - Date.parse(today)) / 86400000);
  if (diff === 0) return 'Aujourd’hui';
  if (diff === 1) return 'Demain';
  if (diff === -1) return 'Hier';
  const s = fmtDayShort(dateStr + 'T12:00:00Z');
  return s.charAt(0).toUpperCase() + s.slice(1);
}
export function fmtDuration(ms) {
  const m = Math.max(0, Math.round(ms / 60000));
  if (m < 60) return `${m} min`;
  return `${Math.floor(m / 60)} h ${pad(m % 60)}`;
}
export const fmtSize = b => (b >= 1048576 ? `${(b / 1048576).toFixed(1).replace('.', ',')} Mo` : `${Math.max(1, Math.round(b / 1024))} Ko`);
export const fmtInt = n => new Intl.NumberFormat('fr-FR').format(n);

/* ───────────────────────── Identifiants ───────────────────────── */

const B32 = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'; // Crockford (sans I, L, O, U)
export function randomCode(n = 6) {
  const a = new Uint8Array(n);
  crypto.getRandomValues(a);
  return Array.from(a, x => B32[x & 31]).join('');
}
export const newRef = () => 'PF-' + randomCode(6);
export const newLot = () => 'GRP-' + randomCode(6);
export const newDem = () => 'DR-' + randomCode(6);
export const newIns = () => 'INS-' + randomCode(6);
export const newUserId = () => 'U-' + randomCode(8);
export const newProfileId = () => 'P-' + randomCode(6);
export const newMsgId = () => 'M-' + randomCode(10);
export const uid = () => randomCode(10);

/* ───────────────────────── Cryptographie ───────────────────────── */

const enc = new TextEncoder();
const dec = new TextDecoder();

export function b64url(bytes) {
  let s = '';
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
export function unb64url(str) {
  let s = String(str).replace(/-/g, '+').replace(/_/g, '/');
  while (s.length % 4) s += '=';
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
const b64json = obj => b64url(enc.encode(JSON.stringify(obj)));

export async function sha256Hex(data) {
  const buf = typeof data === 'string' ? enc.encode(data) : data;
  const h = new Uint8Array(await crypto.subtle.digest('SHA-256', buf));
  return Array.from(h, b => b.toString(16).padStart(2, '0')).join('');
}

let keysPromise = null;
function keys() {
  if (!keysPromise) {
    if (!PUB_JWK || !crypto?.subtle) return Promise.resolve({ pub: null });
    keysPromise = crypto.subtle.importKey('jwk', { ...PUB_JWK, ext: true }, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['verify'])
      .then(pub => ({ pub }))
      .catch(() => ({ pub: null }));
  }
  return keysPromise;
}

/** Vérifie un JWS ES256. Renvoie { ok, reason, header, claims, timing }. */
export async function verifyJws(token) {
  const parts = String(token || '').trim().split('.');
  if (parts.length !== 3) return { ok: false, reason: 'format' };
  let header, claims;
  try {
    header = JSON.parse(dec.decode(unb64url(parts[0])));
    claims = JSON.parse(dec.decode(unb64url(parts[1])));
  } catch {
    return { ok: false, reason: 'format' };
  }
  if (header.alg !== 'ES256') return { ok: false, reason: 'alg', header, claims };
  if (header.kid !== KID) return { ok: false, reason: 'kid', header, claims };
  const { pub } = await keys();
  if (!pub) return { ok: false, reason: 'nokey', header, claims };
  let valid = false;
  try {
    valid = await crypto.subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, pub, unb64url(parts[2]), enc.encode(`${parts[0]}.${parts[1]}`));
  } catch { valid = false; }
  if (!valid) return { ok: false, reason: 'signature', header, claims };
  const now = Date.now() / 1000;
  const timing = claims.nbf && now < claims.nbf ? 'early' : claims.exp && now > claims.exp ? 'expired' : 'ok';
  return { ok: true, header, claims, timing };
}

/** Simule une falsification : modifie la plaque dans le QR sans re-signer. */
export function tamperToken(token) {
  const [h, b, s] = String(token).split('.');
  const claims = JSON.parse(dec.decode(unb64url(b)));
  const veh = String(claims.veh || 'TG||').split('|');
  veh[1] = '9999 ZZ';
  claims.veh = veh.join('|');
  return `${h}.${b64json(claims)}.${s}`;
}

/* ───────────────────────── Rendez-vous ───────────────────────── */

export function transporterName(t) {
  if (!t) return '';
  return t.type === 'entreprise' ? t.company : `${t.first} ${t.last}`.trim();
}
export function driverName(d) { return d ? `${d.first} ${d.last}`.trim() : ''; }

export function tokenClaims(r) {
  const { start, end } = slotRange(r.slot);
  const c = {
    sub: r.id,
    iat: Math.floor(Date.parse(r.issuedAt) / 1000),
    nbf: Math.floor(start / 1000) - 12 * 3600,
    exp: Math.floor(end / 1000) + 24 * 3600,
  };
  if (r.lot) c.lot = `${r.lot}/${r.lotIndex}-${r.lotSize}`;
  Object.assign(c, {
    op: r.op,
    trm: r.terminal,
    slt: `${r.slot.date.replace(/-/g, '')}${r.slot.start.replace(':', '')}-${r.slot.end.replace(':', '')}`,
    trn: transporterName(r.transporter).slice(0, 40),
    drv: driverName(r.driver).slice(0, 40),
    ...(r.driver.license ? { lic: r.driver.license.slice(0, 24) } : {}),
    veh: [r.vehicle.country, r.vehicle.tractor, r.vehicle.trailer || ''].join('|'),
    ctr: r.container.number || '',
    iso: r.container.iso,
    bl: r.container.bl || '',
    dh: DOCS.map(d => (r.docs?.[d.key]?.sha256 || '').slice(0, 8)),
  });
  return c;
}

/** Reconstitue un dossier minimal à partir d'un QR scanné sur un autre appareil. */
export function rdvFromClaims(c, token) {
  const m = String(c.slt || '').match(/^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})-(\d{2})(\d{2})$/);
  const date = m ? `${m[1]}-${m[2]}-${m[3]}` : dayStr();
  const lotM = String(c.lot || '').match(/^((?:GRP|DR)-[0-9A-Z]+)\/(\d+)-(\d+)$/);
  const [country, tractor, trailer] = String(c.veh || 'TG||').split('|');
  const [first, ...rest] = String(c.drv || '').split(' ');
  const docs = {};
  DOCS.forEach((d, i) => { if (c.dh?.[i]) docs[d.key] = { name: `${d.label}.pdf`, size: 0, sha256: c.dh[i], at: null, remote: true }; });
  return {
    id: c.sub, lot: lotM ? lotM[1] : null, lotIndex: lotM ? +lotM[2] : null, lotSize: lotM ? +lotM[3] : null,
    createdAt: new Date(c.iat * 1000).toISOString(), issuedAt: new Date(c.iat * 1000).toISOString(),
    op: c.op, terminal: c.trm,
    slot: { date, start: m ? `${m[4]}:${m[5]}` : '08:00', end: m ? `${m[6]}:${m[7]}` : '10:00' },
    transporter: { type: 'entreprise', company: c.trn || '', email: '', phone: '' },
    transitaire: '',
    driver: { first: first || '', last: rest.join(' '), phone: '', license: c.lic || '' },
    vehicle: { country: country || 'TG', tractor: tractor || '', trailer: trailer || '' },
    container: { number: c.ctr || '', iso: c.iso || '45G1', bl: c.bl || '', goods: '', vgm: '' },
    notes: '', docs, checks: {}, token,
    arrivedAt: null, entryAt: null, exitAt: null, cancelled: false, source: 'qr',
  };
}

export function docCount(r) { return DOCS.filter(d => r.docs?.[d.key]).length; }
export function checkCounts(r) {
  let ok = 0, ko = 0;
  for (const d of DOCS) { const c = r.checks?.[d.key]; if (c?.s === 'ok') ok++; else if (c?.s === 'ko') ko++; }
  return { ok, ko, pending: DOCS.length - ok - ko };
}

/** Statut dérivé (jamais stocké, donc toujours cohérent). */
export function statusOf(r, now = Date.now()) {
  if (r.cancelled) return 'annule';
  if (r.validation === 'pending') return 'en_attente';
  if (r.validation === 'rejected') return 'rejete';
  if (r.exitAt) return 'termine';
  if (r.entryAt) return 'au_port';
  const { ok, ko } = checkCounts(r);
  if (ko > 0) return 'bloque';
  if (r.arrivedAt || ok > 0) return 'controle';
  if (now > slotRange(r.slot).end.getTime() + 60 * 60000) return 'manque';
  return 'confirme';
}

export const STATUS = {
  en_attente: { label: 'En attente de validation', tone: 'neutral', icon: 'hourglass' },
  rejete: { label: 'Rejeté', tone: 'bad', icon: 'circle-x' },
  confirme: { label: 'Confirmé', tone: 'info', icon: 'circle-check' },
  controle: { label: 'Contrôle en cours', tone: 'warn', icon: 'list-checks' },
  bloque: { label: 'Document rejeté', tone: 'bad', icon: 'octagon-alert' },
  au_port: { label: 'Dans le port', tone: 'ok', icon: 'log-in' },
  termine: { label: 'Sorti', tone: 'neutral', icon: 'log-out' },
  manque: { label: 'Créneau dépassé', tone: 'warn', icon: 'timer' },
  annule: { label: 'Annulé', tone: 'neutral', icon: 'circle-x' },
};

/** Ponctualité par rapport au créneau : à l'heure, en avance ou en retard. */
export function punctuality(r, at = Date.now()) {
  const { start, end } = slotRange(r.slot);
  const t = new Date(at).getTime();
  const tol = 15 * 60000;
  if (t < start.getTime() - tol) return { tone: 'warn', label: `En avance de ${fmtDuration(start - t)}` };
  if (t > end.getTime() + tol) return { tone: 'warn', label: `En retard de ${fmtDuration(t - end)}` };
  return { tone: 'ok', label: 'Dans le créneau' };
}

/** Occupation d'un créneau : réservations en attente, validées et autres transporteurs (démo). */
export function slotUsage(slot, rdvs, excludeDemandeId = null) {
  let pending = 0, approved = 0;
  for (const r of rdvs) {
    if (r.cancelled || r.validation === 'rejected') continue;
    if (r.slot.date !== slot.date || r.slot.start !== slot.start) continue;
    if (excludeDemandeId && r.demandeId === excludeDemandeId) continue;
    if (r.validation === 'pending') pending++; else approved++;
  }
  const other = slot.other || 0;
  const used = other + pending + approved;
  return { pending, approved, other, used, remaining: Math.max(0, slot.capacity - used), rate: slot.capacity ? used / slot.capacity : 1 };
}

/* ───────────────────────── Journal chaîné ───────────────────────── */

export function auditPayload(e) {
  return [e.seq, e.ts, e.type, e.actor, e.rdv || '', e.detail || '', e.prev].join('|');
}
export async function sealEvent(prevHash, seq, evt) {
  const e = { seq, ts: evt.ts || isoNow(), type: evt.type, actor: evt.actor, rdv: evt.rdv || '', detail: evt.detail || '', prev: prevHash };
  e.hash = await sha256Hex(auditPayload(e));
  return e;
}
/** Recalcule toute la chaîne ; renvoie la première rupture éventuelle. */
export async function verifyChain(events) {
  const asc = [...events].sort((a, b) => a.seq - b.seq);
  let prev = 'GENESIS';
  for (const e of asc) {
    if (e.prev !== prev) return { ok: false, at: e.seq, count: asc.length };
    const h = await sha256Hex(auditPayload(e));
    if (h !== e.hash) return { ok: false, at: e.seq, count: asc.length };
    prev = e.hash;
  }
  return { ok: true, count: asc.length, last: prev };
}

export const EVENT = {
  demande: { label: 'Demande de rendez-vous créée', icon: 'calendar-clock', tone: 'neutral' },
  qr: { label: 'QR code signé émis', icon: 'qr-code', tone: 'info' },
  remplace: { label: 'Document remplacé', icon: 'file-up', tone: 'info' },
  scan: { label: 'QR scanné · signature valide', icon: 'shield-check', tone: 'ok' },
  scan_ko: { label: 'QR refusé · signature invalide', icon: 'shield-x', tone: 'bad' },
  manuel: { label: 'Dossier ouvert sans scan', icon: 'keyboard', tone: 'warn' },
  valide: { label: 'Document validé', icon: 'circle-check', tone: 'ok' },
  rejete: { label: 'Document rejeté', icon: 'circle-x', tone: 'bad' },
  entree: { label: 'Entrée validée · barrière ouverte', icon: 'log-in', tone: 'ok' },
  sortie: { label: 'Sortie validée', icon: 'log-out', tone: 'neutral' },
  annule: { label: 'Rendez-vous annulé', icon: 'circle-x', tone: 'neutral' },
};

export const REJECT_REASONS = [
  'Document illisible',
  'Document expiré',
  'Ne correspond pas au camion ou au conteneur',
  'Original non présenté',
  'Cachet ou signature manquant',
];

export function postLabel(post) {
  if (post === 'sup') return 'Superviseur';
  const d = DOCS.find(x => x.post === post);
  return d ? `Poste ${post} · ${d.short}` : 'Guérite';
}

/* ───────────────────────── Plateforme : comptes, inscriptions, demandes ───────────────────────── */

export const ACCOUNT_KINDS = {
  transport: { label: 'Entreprise de transport', short: 'Entreprise de transport', icon: 'building-2', hint: 'Société disposant d’une flotte de camions' },
  transit: { label: 'Transitaire · commissionnaire en douane', short: 'Transitaire', icon: 'stamp', hint: 'Réserve pour le compte de transporteurs mandatés' },
  particulier: { label: 'Transporteur particulier', short: 'Particulier', icon: 'user', hint: 'Propriétaire-exploitant d’un ou plusieurs camions' },
};

export const INS_DOCS = {
  transport: [
    { key: 'rccm', label: 'Extrait RCCM', hint: 'Registre du commerce et du crédit mobilier, de moins de 3 mois', icon: 'building' },
    { key: 'nif', label: 'Attestation NIF', hint: 'Numéro d’identification fiscale', icon: 'hash' },
    { key: 'agr', label: 'Autorisation de transport', hint: 'Autorisation d’exercer le transport routier de marchandises, en cours de validité', icon: 'truck' },
    { key: 'cni', label: 'Pièce d’identité du représentant légal', hint: 'CNI ou passeport en cours de validité', icon: 'id-card' },
  ],
  transit: [
    { key: 'rccm', label: 'Extrait RCCM', hint: 'Registre du commerce et du crédit mobilier, de moins de 3 mois', icon: 'building' },
    { key: 'nif', label: 'Attestation NIF', hint: 'Numéro d’identification fiscale', icon: 'hash' },
    { key: 'agr', label: 'Agrément de commissionnaire en douane', hint: 'Agrément en cours de validité', icon: 'stamp' },
    { key: 'cni', label: 'Pièce d’identité du représentant légal', hint: 'CNI ou passeport en cours de validité', icon: 'id-card' },
  ],
  particulier: [
    { key: 'cni', label: 'Pièce d’identité', hint: 'CNI ou passeport en cours de validité', icon: 'id-card' },
    { key: 'cg', label: 'Carte grise du tracteur', hint: 'Certificat d’immatriculation au nom du demandeur', icon: 'truck' },
    { key: 'perm', label: 'Permis de conduire', hint: 'Catégorie C ou CE (poids lourds)', icon: 'badge-check' },
  ],
};

export const INS_STATUS = {
  en_attente: { label: 'En attente de traitement', short: 'En attente', tone: 'info', icon: 'hourglass' },
  a_completer: { label: 'Compléments demandés', short: 'À compléter', tone: 'warn', icon: 'file-up' },
  validee: { label: 'Validée · compte activé', short: 'Validée', tone: 'ok', icon: 'circle-check' },
  rejetee: { label: 'Rejetée', short: 'Rejetée', tone: 'bad', icon: 'circle-x' },
};
export const DEM_STATUS = {
  en_attente: { label: 'En attente de validation', short: 'En attente', tone: 'info', icon: 'hourglass' },
  validee: { label: 'Validée · QR émis', short: 'Validée', tone: 'ok', icon: 'circle-check' },
  rejetee: { label: 'Rejetée', short: 'Rejetée', tone: 'bad', icon: 'circle-x' },
  annulee: { label: 'Annulée', short: 'Annulée', tone: 'neutral', icon: 'circle-x' },
};

export const INS_REJECT = ['Pièces justificatives non conformes', 'Informations non concordantes (NIF, RCCM)', 'Autorisation ou agrément absent ou expiré', 'Doublon : un compte existe déjà', 'Autre motif'];
export const INS_COMPLEMENTS = ['Pièce illisible : merci de la déposer à nouveau', 'Extrait RCCM de moins de 3 mois', 'Agrément ou autorisation en cours de validité', 'Pièce d’identité du représentant légal'];
export const DEM_REJECT = ['Créneau saturé', 'Documents non conformes', 'Conteneur non disponible au terminal', 'Connaissement non concordant', 'Véhicule non autorisé', 'Autre motif'];

export function accountName(u) {
  if (!u) return '';
  if (u.org?.company) return u.org.company;
  return `${u.first || ''} ${u.last || ''}`.trim();
}
export function personName(u) { return u ? `${u.first || ''} ${u.last || ''}`.trim() : ''; }
export function initials(name) {
  const w = String(name || '').replace(/[^A-Za-zÀ-ÿ ]/g, ' ').split(/\s+/).filter(Boolean);
  return ((w[0]?.[0] || '') + (w[1]?.[0] || w[0]?.[1] || '')).toUpperCase();
}
export function insName(i) { return i.kind === 'particulier' ? `${i.first} ${i.last}`.trim() : i.company; }

/* ───────────────────────── Habilitations (profils) ───────────────────────── */

export const PERM_GROUPS = [
  { key: 'transporteur', label: 'Espace transporteur', kind: 'externe', perms: [
    ['transporteur.espace', 'Réserver des créneaux, gérer ses demandes et ses rendez-vous'],
  ] },
  { key: 'inscriptions', label: 'Inscriptions', kind: 'interne', perms: [
    ['inscriptions.consulter', 'Consulter les demandes d’inscription'],
    ['inscriptions.traiter', 'Traiter les demandes d’inscription'],
  ] },
  { key: 'demandes', label: 'Demandes de rendez-vous', kind: 'interne', perms: [
    ['demandes.consulter', 'Consulter les demandes de rendez-vous'],
    ['demandes.traiter', 'Traiter les demandes de rendez-vous'],
  ] },
  { key: 'creneaux', label: 'Créneaux', kind: 'interne', perms: [
    ['creneaux.consulter', 'Consulter les créneaux'],
    ['creneaux.gerer', 'Ajouter et modifier des créneaux'],
  ] },
  { key: 'utilisateurs', label: 'Utilisateurs', kind: 'interne', perms: [
    ['utilisateurs.consulter', 'Consulter les utilisateurs'],
    ['utilisateurs.gerer', 'Ajouter, modifier, activer, désactiver et supprimer'],
  ] },
  { key: 'profils', label: 'Profils', kind: 'interne', perms: [
    ['profils.consulter', 'Consulter les profils'],
    ['profils.gerer', 'Créer, modifier et supprimer des profils'],
  ] },
  { key: 'messagerie', label: 'Messagerie', kind: 'interne', perms: [
    ['messagerie.consulter', 'Consulter le journal des e-mails, SMS et WhatsApp'],
  ] },
  { key: 'guerite', label: 'Application Guérite', kind: 'interne', perms: [
    ['guerite.controle', 'Scanner les QR codes et contrôler un document'],
    ['guerite.supervision', 'Superviser la guérite et commander la barrière'],
  ] },
];
export const PERM_LABEL = Object.fromEntries(PERM_GROUPS.flatMap(g => g.perms));
export const BACKOFFICE_PERMS = PERM_GROUPS.filter(g => g.kind === 'interne' && g.key !== 'guerite').flatMap(g => g.perms.map(p => p[0]));
export function hasPerm(profile, perm) {
  return !!profile && (profile.perms.includes('*') || profile.perms.includes(perm));
}
export function profileSpace(profile) {
  if (!profile) return null;
  if (hasPerm(profile, 'transporteur.espace') && !profile.perms.includes('*')) return 'transporteur';
  if (profile.perms.includes('*') || BACKOFFICE_PERMS.some(p => profile.perms.includes(p))) return 'admin';
  return 'guerite';
}

/* ───────────────────────── Mots de passe (règles affichées ; hachage sur le serveur) ───────────────────────── */

export function passwordChecks(p) {
  const s = String(p || '');
  return [
    { ok: s.length >= 12, label: '12 caractères minimum' },
    { ok: /[a-zà-ÿ]/.test(s), label: 'Une minuscule' },
    { ok: /[A-ZÀ-Ý]/.test(s), label: 'Une majuscule' },
    { ok: /\d/.test(s), label: 'Un chiffre' },
    { ok: /[^A-Za-zÀ-ÿ0-9]/.test(s), label: 'Un caractère spécial' },
  ];
}
export const passwordOk = p => passwordChecks(p).every(c => c.ok);
export function genPassword(n = 14) {
  const sets = ['ABCDEFGHJKLMNPQRSTUVWXYZ', 'abcdefghijkmnopqrstuvwxyz', '23456789', '!#$%&*+-?@'];
  const all = sets.join('');
  const a = new Uint32Array(n);
  crypto.getRandomValues(a);
  const out = Array.from(a, (x, i) => (i < sets.length ? sets[i][x % sets[i].length] : all[x % all.length]));
  for (let i = out.length - 1; i > 0; i--) { const j = a[i] % (i + 1); [out[i], out[j]] = [out[j], out[i]]; }
  return out.join('');
}

/** Identifiant de connexion : adresse e-mail ou numéro de téléphone (E.164, +228 par défaut). */
export function loginKey(input) {
  const s = String(input || '').trim();
  if (s.includes('@')) return { type: 'email', value: s.toLowerCase() };
  let d = s.replace(/[^\d+]/g, '');
  if (d.startsWith('00')) d = '+' + d.slice(2);
  if (!d.startsWith('+')) d = d.length <= 8 ? '+228' + d : '+' + d;
  return { type: 'phone', value: d };
}
export function phoneCountry(e164) {
  const m = String(e164 || '').match(/^\+(\d{3})(\d+)$/);
  const c = m && COUNTRIES.find(x => x.dial === m[1]);
  return c ? { cc: c.code, digits: m[2] } : { cc: 'TG', digits: String(e164 || '').replace(/\D/g, '').slice(-8) };
}
export function fmtAgo(at, now = Date.now()) {
  const m = Math.round((now - Date.parse(at)) / 60000);
  if (m < 1) return 'à l’instant';
  if (m < 60) return `il y a ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `il y a ${h} h`;
  const d = Math.floor(h / 24);
  return d === 1 ? 'hier' : `il y a ${d} j`;
}

/* ───────────────────────── Cas d'utilisation (document d'identification par acteur) ───────────────────────── */

export const USE_CASES = [
  { pkg: 'Gestion des inscriptions', items: [
    ['Faire une demande d’inscription', 'Transporteur, Service de messagerie (e-mail et SMS)', 'Connexion › Créer un compte transporteur'],
    ['Consulter une demande d’inscription', 'Transporteur, Administrateur', 'Connexion › Suivre ma demande · Administration › Inscriptions'],
    ['Mettre à jour une demande d’inscription', 'Transporteur, Service de messagerie (e-mail et SMS)', 'Suivre ma demande › Mettre à jour'],
    ['Traiter une demande d’inscription', 'Administrateur, Service de messagerie (e-mail et SMS)', 'Administration › Inscriptions › Valider, demander des compléments ou rejeter'],
  ] },
  { pkg: 'Authentification', items: [
    ['Se connecter', 'SuperAdmin, Transporteur, Administrateur', 'Page de connexion'],
    ['Se déconnecter', 'Transporteur, Administrateur', 'Menu du compte › Se déconnecter'],
  ] },
  { pkg: 'Gestion des demandes de RDV', items: [
    ['Consulter les créneaux disponibles', 'Transporteur', 'Espace transporteur › Créneaux'],
    ['Faire une demande de RDV', 'Transporteur, Service de messagerie (e-mail et SMS)', 'Espace transporteur › Nouvelle demande'],
    ['Consulter une demande de RDV', 'Transporteur, Administrateur', 'Espace transporteur › Demandes · Administration › Demandes de RDV'],
    ['Modifier une demande de RDV', 'Transporteur, Service de messagerie (e-mail et SMS)', 'Demandes › détail › Modifier'],
    ['Annuler une demande de RDV', 'Transporteur', 'Demandes › détail › Annuler'],
    ['Traiter une demande de RDV', 'Administrateur, Service de messagerie (e-mail et SMS)', 'Administration › Demandes de RDV › Valider ou rejeter'],
  ] },
  { pkg: 'Gestion des RDV', items: [
    ['Télécharger les QR code de RDV', 'Transporteur', 'Rendez-vous › Télécharger · Demandes › planche des QR'],
    ['Envoyer les QR code de RDV', 'Transporteur, Service de messagerie (WhatsApp)', 'Rendez-vous › Envoyer au chauffeur'],
    ['Faire le suivi des RDV', 'Transporteur', 'Rendez-vous › Suivi du passage'],
  ] },
  { pkg: 'Gestion des profils', items: [
    ['Créer un profil', 'Administrateur', 'Administration › Profils › Nouveau profil'],
    ['Consulter un profil', 'Administrateur', 'Administration › Profils'],
    ['Modifier un profil', 'Administrateur', 'Administration › Profils › Modifier'],
    ['Supprimer un profil', 'Administrateur', 'Administration › Profils › Supprimer'],
  ] },
  { pkg: 'Gestion des utilisateurs', items: [
    ['Ajouter un utilisateur', 'Administrateur', 'Administration › Utilisateurs › Ajouter'],
    ['Consulter un utilisateur', 'Administrateur', 'Administration › Utilisateurs'],
    ['Modifier un utilisateur', 'Administrateur', 'Administration › Utilisateurs › Modifier'],
    ['Désactiver / activer un utilisateur', 'Administrateur', 'Administration › Utilisateurs › Désactiver ou Activer'],
    ['Supprimer un utilisateur', 'Administrateur', 'Administration › Utilisateurs › Supprimer'],
  ] },
  { pkg: 'Gestion des créneaux', items: [
    ['Ajouter des créneaux', 'SuperAdmin, Administrateur (PAL)', 'Administration › Créneaux › Ajouter des créneaux'],
    ['Consulter des créneaux', 'SuperAdmin, Administrateur (PAL)', 'Administration › Créneaux'],
    ['Modifier des créneaux', 'SuperAdmin, Administrateur (PAL)', 'Administration › Créneaux › clic sur un créneau'],
  ] },
];
