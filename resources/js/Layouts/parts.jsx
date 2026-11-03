// Éléments communs des mises en page : lien d'évitement, barre supérieure, onglets, barre d'onglets mobile.
import { AppLink } from '../Lib/navigation.jsx';
import { Icon } from '../components/ui/Icon.jsx';
import { cn } from '../Lib/cn.js';

export function SkipLink({ target = 'pf-main' }) {
  return (
    <a href={`#${target}`} className="sr-only z-[70] rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white focus:not-sr-only focus:fixed focus:left-4 focus:top-4">
      Aller au contenu
    </a>
  );
}

/** Barre supérieure collante. `dark` : guérite. */
export function TopBar({ dark = false, children, below, className }) {
  return (
    <header className={cn('sticky top-0 z-40 border-b', dark ? 'border-white/10 bg-slate-950 text-white' : 'border-slate-200 bg-white/90 backdrop-blur-[6px]', className)}>
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center gap-3 px-4 sm:px-6">{children}</div>
      {below}
    </header>
  );
}

export const Spacer = () => <span className="flex-1" />;

/** Onglets de navigation principaux (liens nommés) : items [{ to, label, icon, count, exact }]. */
export function NavTabs({ items, label = 'Navigation principale', dark = false, className }) {
  return (
    <nav aria-label={label} className={cn('flex items-center gap-1', className)}>
      {items.map(t => (
        <AppLink key={t.to} to={t.to} exact={t.exact}
          className={({ active }) => cn('inline-flex h-10 items-center gap-2 rounded-xl px-3 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500',
            dark ? (active ? 'bg-white/10 text-white' : 'text-slate-300 hover:bg-white/10 hover:text-white')
              : (active ? 'bg-brand-50 text-brand-800' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'))}>
          <Icon name={t.icon} size={18} /> {t.label}
          {t.count ? <span className="rounded-full bg-brand-600 px-1.5 text-[11px] font-bold leading-5 text-white tabular-nums">{t.count}</span> : null}
        </AppLink>
      ))}
    </nav>
  );
}

/** Barre d'onglets fixée en bas de l'écran (mobile). */
export function BottomTabBar({ items, label = 'Navigation' }) {
  return (
    <nav aria-label={label} className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-[6px] md:hidden">
      <div className="grid" style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}>
        {items.map(t => (
          <AppLink key={t.to} to={t.to} exact={t.exact}
            className={({ active }) => cn('relative flex h-16 flex-col items-center justify-center gap-1 text-[11px] font-medium focus:outline-none focus-visible:bg-slate-100', active ? 'text-brand-700' : 'text-slate-500')}>
            <Icon name={t.icon} size={22} />
            <span className="max-w-full truncate px-1">{t.label}</span>
            {t.count ? <span className="absolute right-[calc(50%-22px)] top-2 rounded-full bg-brand-600 px-1.5 text-[10px] font-bold leading-4 text-white">{t.count}</span> : null}
          </AppLink>
        ))}
      </div>
    </nav>
  );
}

/** Zone de contenu principale. */
export function Main({ children, className, wide = false }) {
  return (
    <main id="pf-main" tabIndex={-1} className={cn('mx-auto w-full px-4 py-6 focus:outline-none sm:px-6 sm:py-8', wide ? 'max-w-7xl' : 'max-w-6xl', className)}>
      {children}
    </main>
  );
}
