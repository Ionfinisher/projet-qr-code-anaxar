// Client HTTP de l'API PortFlow : JSON, jeton anti-CSRF, application appelante (plateforme | guerite).
// Chaque réponse POST contient l'état à jour (`state`) : il est transmis au fournisseur PortFlow via onState.
import { getPortFlowConfig } from '../config.js';

/**
 * Résultat normalisé de toutes les fonctions d'API : { ok: true, ...données } ou { ok: false, error, reason, status }.
 * Aucune exception n'est levée : les pages affichent `error` (déjà rédigé en français par le serveur).
 */
export function createApiClient({ app = 'plateforme' } = {}) {
  let csrf = '';
  const stateListeners = new Set();
  // Ordre des réponses : l'état d'une requête plus ancienne n'écrase jamais celui d'une requête plus récente
  let sent = 0;
  let applied = 0;

  const url = (action, params = {}) => {
    const base = getPortFlowConfig().apiBase;
    const q = new URLSearchParams({ a: action, ...params });
    return `${base}${base.includes('?') ? '&' : '?'}${q}`;
  };

  async function parse(res) {
    let data = null;
    try { data = await res.json(); } catch { data = null; }
    if (!data || typeof data !== 'object') {
      return { ok: false, reason: 'server', status: res.status, error: `Réponse inattendue du serveur (HTTP ${res.status}). Réessayez dans un instant.` };
    }
    data.status = res.status;
    return data;
  }

  async function request(action, { method = 'GET', body, params, retry = true } = {}) {
    const cfg = getPortFlowConfig();
    const seq = ++sent;
    const isForm = typeof FormData !== 'undefined' && body instanceof FormData;
    const headers = { ...cfg.extraHeaders(), 'X-PF-App': app };
    if (method === 'POST') headers['X-CSRF-Token'] = csrf;
    if (body && !isForm) headers['Content-Type'] = 'application/json';
    let res;
    try {
      res = await cfg.fetch(url(action, params), {
        method, headers, credentials: cfg.credentials, cache: 'no-store',
        body: isForm ? body : body ? JSON.stringify(body) : undefined,
      });
    } catch {
      return { ok: false, reason: 'network', error: 'Connexion au serveur impossible : vérifiez le réseau puis réessayez.' };
    }
    const data = await parse(res);
    // Jeton expiré (session renouvelée) : on le récupère puis on rejoue la requête une fois
    if (data.reason === 'csrf' && retry) {
      const s = await request('session', { retry: false });
      if (s.ok) {
        csrf = s.csrf || '';
        return request(action, { method, body, params, retry: false });
      }
    }
    if (data.state && seq > applied) {
      applied = seq;
      stateListeners.forEach(fn => fn(data.state));
    }
    return data;
  }

  /** Normalise une réponse d'action : { ok, error, reason } + données utiles. */
  const result = r => (r.ok ? r : { ...r, ok: false, error: r.error || 'Action impossible.', reason: r.reason });

  return {
    app,
    url,
    setCsrf: t => { csrf = t || ''; },
    onState(fn) { stateListeners.add(fn); return () => stateListeners.delete(fn); },
    get: async (action, params) => result(await request(action, { params })),
    post: async (action, body) => result(await request(action, { method: 'POST', body: body || {} })),
    upload(file) {
      const fd = new FormData();
      fd.append('file', file, file.name);
      return request('upload', { method: 'POST', body: fd }).then(result);
    },
    /** Adresse d'un document déposé (affichage, ou téléchargement si dl). */
    fileUrl: (sha, dl = false) => url('file', dl ? { sha, dl: '1' } : { sha }),
  };
}
