// Configuration du module PortFlow dans l'application hôte.
// À appeler une fois, avant le premier rendu (main.jsx / app.jsx) :
//
//   configurePortFlow({ apiBase: '/portflow/api/index.php', basePath: '/portflow' });

const defaults = {
  /** Point d'entrée de l'API PHP PortFlow (même origine que l'application : cookies de session + contrôle d'origine). */
  apiBase: '/api/index.php',
  /** Préfixe des routes PortFlow dans l'application hôte ('' si PortFlow est à la racine). */
  basePath: '',
  /** Préfixe des routes de l'application Guérite (relatif à basePath). */
  gatePath: '/guerite',
  /** Intervalle de synchronisation (ms) : un compteur de révision signale les changements faits ailleurs. */
  pollPlatformMs: 10000,
  pollGateMs: 5000,
  /** fetch utilisé pour les appels (remplaçable : instrumentation, tests). */
  fetch: (...args) => fetch(...args),
  /** En-têtes ajoutés à chaque appel (ex. en-tête exigé par une passerelle). */
  extraHeaders: () => ({}),
  /** 'same-origin' (recommandé). 'include' uniquement si l'API est sur un sous-domaine configuré pour. */
  credentials: 'same-origin',
};

let current = { ...defaults };

export function configurePortFlow(options = {}) {
  current = { ...current, ...options };
  current.basePath = String(current.basePath || '').replace(/\/+$/, '');
  return current;
}

export const getPortFlowConfig = () => current;
