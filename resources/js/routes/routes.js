// Table des routes PortFlow : nom → chemin (relatif à basePath, voir configurePortFlow).
// Les pages naviguent par nom (useNav().go('transporteur.rdv')) : aucun chemin n'est écrit en dur ailleurs.

export const ROUTES = {
  // ── Plateforme · espace public
  'login': '/connexion',
  'register': '/inscription',
  'register.update': '/inscription/:id/modifier',
  'track': '/inscription/suivi',
  'forgot': '/mot-de-passe/oublie',
  'reset': '/mot-de-passe/nouveau',
  'pass': '/pass/:code',
  'pass.token': '/pass',            // ancien format : jeton signé dans l'ancre (#…)

  // ── Plateforme · espace transporteur / transitaire
  'transporteur.rdv': '/transporteur/rendez-vous',
  'transporteur.rdv.detail': '/transporteur/rendez-vous/:id',
  'transporteur.demandes': '/transporteur/demandes',
  'transporteur.demandes.new': '/transporteur/demandes/nouvelle',
  'transporteur.demandes.detail': '/transporteur/demandes/:id',
  'transporteur.demandes.edit': '/transporteur/demandes/:id/modifier',
  'transporteur.creneaux': '/transporteur/creneaux',
  'transporteur.compte': '/transporteur/compte',

  // ── Plateforme · administration du port
  'admin.dashboard': '/admin',
  'admin.inscriptions': '/admin/inscriptions',
  'admin.inscriptions.detail': '/admin/inscriptions/:id',
  'admin.demandes': '/admin/demandes',
  'admin.demandes.detail': '/admin/demandes/:id',
  'admin.creneaux': '/admin/creneaux',
  'admin.utilisateurs': '/admin/utilisateurs',
  'admin.profils': '/admin/profils',
  'admin.messagerie': '/admin/messagerie',

  // ── Application Guérite (application distincte : session et en-tête X-PF-App propres)
  'gate.controle': '/guerite',
  'gate.arrivees': '/guerite/arrivees',
  'gate.supervision': '/guerite/supervision',
};

/** Espace de travail → page d'accueil. */
export const HOME_OF_SPACE = { transporteur: 'transporteur.rdv', admin: 'admin.dashboard', guerite: 'gate.controle' };

/** Construit le chemin d'une route (sans basePath). Lève une erreur si un paramètre manque. */
export function routePath(name, params = {}) {
  const pattern = ROUTES[name];
  if (pattern === undefined) throw new Error(`Route PortFlow inconnue : ${name}`);
  return pattern.replace(/:([A-Za-z_]+)/g, (_, k) => {
    if (params[k] === undefined || params[k] === null || params[k] === '') throw new Error(`Paramètre « ${k} » manquant pour la route ${name}`);
    return encodeURIComponent(params[k]);
  });
}

const compiled = Object.entries(ROUTES).map(([name, pattern]) => {
  const keys = [];
  const re = new RegExp('^' + pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/:([A-Za-z_]+)/g, (_, k) => { keys.push(k); return '([^/]+)'; }) + '/?$');
  return { name, re, keys, static: !keys.length };
}).sort((a, b) => Number(b.static) - Number(a.static));

/** Retrouve la route d'un chemin (sans basePath) : { name, params } ou null. */
export function matchRoute(pathname) {
  for (const r of compiled) {
    const m = r.re.exec(pathname);
    if (m) return { name: r.name, params: Object.fromEntries(r.keys.map((k, i) => [k, decodeURIComponent(m[i + 1])])) };
  }
  return null;
}
