// Session de contrôle de la guérite : dossier courant (scan ou liste), partagé entre les pages
// Contrôle, Arrivées et Supervision. Monté par GateLayout autour des pages.
import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { verifyJws } from '../../lib/domain.js';
import { notify } from '../../lib/alerts.js';
import { useNav } from '../../lib/navigation.jsx';
import { usePortFlow } from '../../providers/PortFlowProvider.jsx';
import { useGateApi } from './api.js';

const GateSessionContext = createContext(null);

/**
 * cur : dossier affiché — { id, source, verif, at } ou { error, reason, claims, input, id, message, at } ou null.
 * rdvs : rendez-vous connus de la guérite (fenêtre chargée + dossiers scannés hors fenêtre).
 */
export function GateSessionProvider({ children }) {
  const { data, patch } = usePortFlow();
  const gate = useGateApi();
  const nav = useNav();
  const navRef = useRef(nav);
  navRef.current = nav; // fonctions stables : la navigation courante est lue au moment de l'appel
  const [cur, setCur] = useState(null);
  const [busy, setBusy] = useState(false);
  const [extra, setExtra] = useState({}); // dossiers renvoyés par un scan, absents de la fenêtre chargée

  const rdvs = useMemo(() => {
    const list = data.rdvs.filter(r => r.token);
    const known = new Set(list.map(r => r.id));
    return [...list, ...Object.values(extra).filter(r => !known.has(r.id))];
  }, [data.rdvs, extra]);

  const remember = useCallback(rdv => {
    if (!rdv) return;
    setExtra(x => ({ ...x, [rdv.id]: rdv }));
    patch(d => (d.rdvs.some(x => x.id === rdv.id) ? d : { ...d, rdvs: [...d.rdvs, rdv] }));
  }, [patch]);

  const showControl = useCallback(() => {
    const n = navRef.current;
    if (!n.isActive('gate.controle', undefined, { exact: true })) n.go('gate.controle');
  }, []);

  /** Contrôle d'un code lu (caméra, photo, douchette, saisie) : signature vérifiée ici puis par le serveur. */
  const process = useCallback(async (text, source) => {
    const input = String(text || '').trim();
    if (!input) return;
    setBusy(true);
    showControl();
    try {
      const local = input.split('.').length === 3 ? await verifyJws(input) : null;
      const r = await gate.scan(input, source);
      if (!r.ok) { setCur({ error: 'server', message: r.error, input, at: Date.now() }); return; }
      const sc = r.scan || {};
      remember(sc.rdv);
      if (sc.error) {
        setCur({ error: sc.error, reason: sc.reason, claims: sc.claims || local?.claims, input: sc.input || input, id: sc.id, at: Date.now() });
        return;
      }
      const verif = local?.ok ? local : sc.verif ? { ok: true, timing: sc.verif.timing, header: { kid: sc.verif.kid }, claims: sc.verif.claims } : null;
      setCur({ id: sc.id, source: sc.source || source, verif, at: Date.now() });
    } finally { setBusy(false); }
  }, [gate, remember, showControl]);

  /** Ouverture d'un dossier depuis la liste des arrivées. */
  const openFromList = useCallback(async rdv => {
    const res = await gate.open(rdv.id);
    if (!res.ok) { notify(res.error, 'bad'); return; }
    setCur({ id: rdv.id, source: 'liste', at: Date.now() });
    showControl();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [gate, showControl]);

  const clear = useCallback(() => setCur(null), []);

  const value = useMemo(() => ({ cur, busy, rdvs, process, openFromList, clear }), [cur, busy, rdvs, process, openFromList, clear]);
  return <GateSessionContext.Provider value={value}>{children}</GateSessionContext.Provider>;
}

export function useGateSession() {
  const ctx = useContext(GateSessionContext);
  if (!ctx) throw new Error('useGateSession() doit être utilisé sous <GateSessionProvider> (GateLayout).');
  return ctx;
}
