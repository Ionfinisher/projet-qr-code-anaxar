// Navigation indépendante du routeur : les pages PortFlow utilisent useNav() et <AppLink>,
// l'application hôte fournit un adaptateur (React Router, Inertia.js… ou le navigateur par défaut).
import { createContext, forwardRef, useContext, useMemo } from 'react';
import { getPortFlowConfig } from '../config.js';
import { ROUTES, routePath, matchRoute } from '../routes/routes.js';

/**
 * Contrat d'un adaptateur :
 *   useNavigate(): (href, { replace }) => void
 *   useLocation(): { pathname, search }      (chemin tel que le routeur le voit)
 *   useParams():   { [param]: string }       (paramètres de la route courante)
 *   Link:          composant ({ href, replace, ...props })
 */

/** Adaptateur par défaut : liens et rechargements de page classiques (aucun routeur requis). */
export const browserAdapter = {
  useNavigate: () => (href, { replace } = {}) => (replace ? window.location.replace(href) : window.location.assign(href)),
  useLocation: () => ({ pathname: window.location.pathname, search: window.location.search }),
  useParams: () => {
    const base = getPortFlowConfig().basePath;
    const p = window.location.pathname;
    return matchRoute(base && p.startsWith(base) ? p.slice(base.length) || '/' : p)?.params || {};
  },
  Link: forwardRef(function BrowserLink({ href, replace, ...rest }, ref) { return <a ref={ref} href={href} {...rest} />; }),
};

/** React Router v6 / v7 : createReactRouterAdapter({ useNavigate, useLocation, useParams, Link }) */
export function createReactRouterAdapter({ useNavigate, useLocation, useParams, Link }) {
  const RRLink = forwardRef(function RRLink({ href, replace, ...rest }, ref) { return <Link ref={ref} to={href} replace={replace} {...rest} />; });
  return {
    useNavigate: () => { const n = useNavigate(); return (href, { replace } = {}) => n(href, { replace: !!replace }); },
    useLocation: () => useLocation(),
    useParams: () => useParams(),
    Link: RRLink,
  };
}

/**
 * Inertia.js : createInertiaAdapter({ router, Link, usePage })
 * Les paramètres de route sont lus dans la prop `params` de la page (Inertia::render(..., ['params' => [...]])),
 * à défaut ils sont déduits de l'adresse grâce à la table des routes.
 */
export function createInertiaAdapter({ router, Link, usePage }) {
  const InertiaLink = forwardRef(function InertiaLink({ href, replace, ...rest }, ref) { return <Link ref={ref} href={href} replace={replace} {...rest} />; });
  const location = () => {
    const page = usePage();
    const u = new URL(page.url, window.location.origin);
    return { pathname: u.pathname, search: u.search };
  };
  return {
    useNavigate: () => (href, { replace } = {}) => router.visit(href, { replace: !!replace }),
    useLocation: location,
    useParams: () => {
      const page = usePage();
      if (page.props?.params) return page.props.params;
      const base = getPortFlowConfig().basePath;
      const p = new URL(page.url, window.location.origin).pathname;
      return matchRoute(base && p.startsWith(base) ? p.slice(base.length) || '/' : p)?.params || {};
    },
    Link: InertiaLink,
  };
}

const NavContext = createContext(browserAdapter);

export function NavigationProvider({ adapter, children }) {
  return <NavContext.Provider value={adapter || browserAdapter}>{children}</NavContext.Provider>;
}

const toQuery = q => {
  if (!q) return '';
  const s = new URLSearchParams(Object.entries(q).filter(([, v]) => v !== undefined && v !== null && v !== '')).toString();
  return s ? `?${s}` : '';
};

/** Adresse complète d'une route : href('transporteur.rdv.detail', { id }, { tab: 'docs' }). */
export function hrefOf(nameOrPath, params, query) {
  const path = nameOrPath.startsWith('/') ? nameOrPath : routePath(nameOrPath, params);
  return `${getPortFlowConfig().basePath}${path === '/' && getPortFlowConfig().basePath ? '' : path}${toQuery(query)}`;
}

/** Navigation PortFlow : { go, href, back, isActive, pathname, query, params }. */
export function useNav() {
  const adapter = useContext(NavContext);
  const navigate = adapter.useNavigate();
  const location = adapter.useLocation();
  const params = adapter.useParams() || {};
  return useMemo(() => {
    const query = new URLSearchParams(location.search || '');
    const href = hrefOf;
    const go = (nameOrPath, p, { replace = false, query: q } = {}) => navigate(href(nameOrPath, p, q), { replace });
    const isActive = (name, p, { exact = false } = {}) => {
      const target = href(name, p);
      const cur = location.pathname.replace(/\/+$/, '') || '/';
      const t = target.replace(/\/+$/, '') || '/';
      return exact ? cur === t : cur === t || cur.startsWith(t + '/');
    };
    /** Retour déterministe (fermeture d'un détail) : route parente, sans dépendre de l'historique. */
    const back = (fallback, p, opts) => go(fallback, p, opts);
    const base = getPortFlowConfig().basePath;
    /** Chemin courant sans basePath (pour ?next=… : nav.go(next) le préfixe à nouveau). */
    const relativePath = base && location.pathname.startsWith(base) ? location.pathname.slice(base.length) || '/' : location.pathname;
    return { go, href, back, isActive, pathname: location.pathname, relativePath, search: location.search, query, params, routes: ROUTES };
  }, [navigate, location.pathname, location.search, params]);
}

/**
 * Lien vers une route nommée : <AppLink to="admin.demandes.detail" params={{ id }}>…</AppLink>
 * className peut être une fonction ({ active }) => classes, pour styler le lien de la page courante.
 */
export const AppLink = forwardRef(function AppLink({ to, params, query, replace, className, exact, children, ...rest }, ref) {
  const { Link } = useContext(NavContext);
  const nav = useNav();
  const active = nav.isActive(to, params, { exact });
  return (
    <Link ref={ref} href={hrefOf(to, params, query)} replace={replace}
      className={typeof className === 'function' ? className({ active }) : className}
      aria-current={active && typeof className === 'function' ? 'page' : undefined} {...rest}>
      {children}
    </Link>
  );
});
