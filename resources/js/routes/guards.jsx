// Gardes de routes : session, mot de passe provisoire, espace de travail.
import { useEffect } from 'react';
import { useNav } from '../lib/navigation.jsx';
import { usePortFlow, useCurrentUser } from '../providers/PortFlowProvider.jsx';
import { BootScreen } from '../Components/domain/BootScreen.jsx';
import { ForcePasswordChangePage } from '../features/auth/pages/PasswordPages.jsx';
import { HOME_OF_SPACE } from './routes.js';

/** Redirection déclarative (remplace l'entrée d'historique). */
export function Redirect({ to, params, query }) {
  const nav = useNav();
  useEffect(() => { nav.go(to, params, { replace: true, query }); }, [to]); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}

/** Attend le démarrage du fournisseur PortFlow (configuration, session, données). */
export function RequireReady({ children, dark = false }) {
  const { status, error } = usePortFlow();
  if (status === 'loading') return <BootScreen dark={dark} />;
  if (status === 'error') return <BootScreen error={error} dark={dark} />;
  return children;
}

/**
 * Réserve des pages à un espace : 'transporteur' | 'admin'.
 * Visiteur → connexion (?next=…) ; mot de passe provisoire → changement imposé ; autre espace → son accueil.
 */
export function RequireSpace({ space, children }) {
  const { status, error } = usePortFlow();
  const { user, space: mine } = useCurrentUser();
  const nav = useNav();
  if (status === 'loading') return <BootScreen />;
  if (status === 'error') return <BootScreen error={error} />;
  if (!user) return <Redirect to="login" query={{ next: nav.relativePath + (nav.search || '') }} />;
  if (user.mustChange) return <ForcePasswordChangePage />;
  if (mine !== space) return <Redirect to={HOME_OF_SPACE[mine] || 'login'} />;
  return children;
}

/** Pages publiques : un utilisateur connecté est renvoyé vers son espace. */
export function PublicOnly({ children }) {
  const { status, error } = usePortFlow();
  const { user, space } = useCurrentUser();
  if (status === 'loading') return <BootScreen />;
  if (status === 'error') return <BootScreen error={error} />;
  if (user && !user.mustChange && HOME_OF_SPACE[space] && space !== 'guerite') return <Redirect to={HOME_OF_SPACE[space]} />;
  return children;
}

/**
 * Racine de PortFlow (/) : liens envoyés par le serveur (?p=CODE pass chauffeur, ?reset=JETON mot de passe,
 * #jeton ancien pass), sinon espace de l'utilisateur ou connexion.
 */
export function PortFlowEntry() {
  const nav = useNav();
  const { status, error } = usePortFlow();
  const { user, space } = useCurrentUser();
  const p = nav.query.get('p');
  const reset = nav.query.get('reset');
  const hashToken = typeof window !== 'undefined' && /^#[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{20,}$/.test(window.location.hash);
  if (p && /^[0-9A-Za-z]{10}$/.test(p)) return <Redirect to="pass" params={{ code: p.toUpperCase() }} />;
  if (hashToken) return <Redirect to={`/pass${window.location.hash}`} />;
  if (reset && /^[a-f0-9]{48}$/.test(reset)) return <Redirect to="reset" query={{ token: reset }} />;
  if (status === 'loading') return <BootScreen />;
  if (status === 'error') return <BootScreen error={error} />;
  if (user && HOME_OF_SPACE[space] && space !== 'guerite') return <Redirect to={HOME_OF_SPACE[space]} />;
  return <Redirect to="login" />;
}
