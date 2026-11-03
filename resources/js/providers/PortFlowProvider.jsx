// Fournisseur PortFlow : client d'API, configuration publique, session (jeton CSRF) et données de l'écran.
// Une instance par application : <PortFlowProvider app="plateforme"> ou <PortFlowProvider app="guerite">.
import { createContext, useContext, useEffect, useMemo, useState, useSyncExternalStore, useCallback } from 'react';
import { createApiClient } from '../lib/http.js';
import { setVerifyKey, hasPerm, profileSpace } from '../lib/domain.js';
import { getPortFlowConfig } from '../config.js';

export const EMPTY_STATE = {
  meId: null, rev: 0, serverTime: null,
  profiles: [], users: [], inscriptions: [], demandes: [], rdvs: [], slots: [], messages: [], audit: [], cron: null,
};

function createStore() {
  let snap = { status: 'loading', error: null, config: null, data: EMPTY_STATE };
  const listeners = new Set();
  return {
    get: () => snap,
    set(updater) { snap = typeof updater === 'function' ? updater(snap) : updater; listeners.forEach(l => l()); },
    subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
  };
}

const PortFlowContext = createContext(null);

/**
 * bootstrap : 'full' (configuration + session + données, synchronisation périodique)
 *           | 'config' (configuration publique seule : pass chauffeur)
 */
export function PortFlowProvider({ app = 'plateforme', bootstrap = 'full', children }) {
  const [core] = useState(() => {
    const api = createApiClient({ app });
    const store = createStore();
    api.onState(st => store.set(s => ({ ...s, status: 'ready', error: null, data: { ...s.data, ...st } })));
    return { app, api, store };
  });

  const refresh = useCallback(() => core.api.get('state'), [core]);
  /** Complète localement les données (ex. dossier scanné hors de la fenêtre chargée) : patch(data => ({ ...data, rdvs })). */
  const patch = useCallback(fn => core.store.set(s => ({ ...s, data: fn(s.data) })), [core]);

  useEffect(() => {
    const { api, store } = core;
    let alive = true;
    const cleanups = [];
    const fail = error => alive && store.set(s => ({ ...s, status: 'error', error }));

    (async () => {
      const cfg = await api.get('config');
      if (!alive) return;
      if (!cfg.ok) return fail(cfg);
      setVerifyKey(cfg.jwk, cfg.kid);
      store.set(s => ({ ...s, config: cfg }));
      if (bootstrap === 'config') { store.set(s => ({ ...s, status: 'ready' })); return; }

      const ses = await api.get('session');
      if (!alive) return;
      if (!ses.ok) return fail(ses);
      api.setCsrf(ses.csrf);
      const st = await api.get('state'); // appliqué par api.onState
      if (!alive) return;
      if (!st.ok) return fail(st);

      // Synchronisation : le compteur de révision signale une modification faite par un autre poste
      const ms = app === 'guerite' ? getPortFlowConfig().pollGateMs : getPortFlowConfig().pollPlatformMs;
      const tick = async () => {
        if (document.visibilityState !== 'visible') return;
        const r = await api.get('rev');
        if (alive && r.ok && r.rev !== store.get().data.rev) await api.get('state');
      };
      const id = setInterval(tick, ms);
      const onVis = () => { if (document.visibilityState === 'visible') tick(); };
      document.addEventListener('visibilitychange', onVis);
      window.addEventListener('focus', tick);
      window.addEventListener('online', tick);
      cleanups.push(() => {
        clearInterval(id);
        document.removeEventListener('visibilitychange', onVis);
        window.removeEventListener('focus', tick);
        window.removeEventListener('online', tick);
      });
    })();
    return () => { alive = false; cleanups.forEach(fn => fn()); };
  }, [core, app, bootstrap]);

  const value = useMemo(() => ({ ...core, refresh, patch }), [core, refresh, patch]);
  return <PortFlowContext.Provider value={value}>{children}</PortFlowContext.Provider>;
}

function useCore() {
  const ctx = useContext(PortFlowContext);
  if (!ctx) throw new Error('Composant PortFlow rendu hors de <PortFlowProvider>.');
  return ctx;
}

/** Client d'API de l'application courante (sans abonnement aux données). */
export const useApi = () => useCore().api;

/** Données PortFlow : { app, api, status, error, config, data, refresh, patch }. Le composant se met à jour à chaque synchronisation. */
export function usePortFlow() {
  const core = useCore();
  const snap = useSyncExternalStore(core.store.subscribe, core.store.get, core.store.get);
  return { app: core.app, api: core.api, refresh: core.refresh, patch: core.patch, ...snap };
}

/** Configuration publique du serveur (nom, mode démonstration, canaux de messagerie…). */
export const useServerConfig = () => usePortFlow().config || {};

/** Utilisateur connecté : { user, profile, space, can(perm), isSuper }. user = null si personne n'est connecté. */
export function useCurrentUser() {
  const { data } = usePortFlow();
  return useMemo(() => {
    const user = data.meId ? data.users.find(u => u.id === data.meId) || null : null;
    const profile = user ? data.profiles.find(p => p.id === user.profileId) || null : null;
    return {
      user,
      profile,
      space: profileSpace(profile),
      isSuper: !!profile?.perms?.includes('*'),
      can: perm => hasPerm(profile, perm),
    };
  }, [data.meId, data.users, data.profiles]);
}
