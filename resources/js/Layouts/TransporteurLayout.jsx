// Espace transporteur / transitaire : barre supérieure (onglets, nouvelle demande, notifications, compte),
// barre d'onglets en bas de l'écran sur mobile.
import { useState } from 'react';
import { Link, router, usePage } from '@inertiajs/react';
import { AccountMenu, IconButton, Icon, buttonClass } from '../Components/ui/index.js';
import { Logo } from '../Components/domain/Logo.jsx';
import FlashAlerts from '../Components/FlashAlerts.jsx';
import { cn } from '../Lib/cn.js';
import { SkipLink, TopBar, Spacer } from './parts.jsx';

function InertiaTransporteurLayout({ user: propUser, header, children }) {
  const { props } = usePage();
  const user = propUser || props.auth?.user;
  const [mobileOpen, setMobileOpen] = useState(false);
  const userName = user?.name || `${user?.prenom ?? ''} ${user?.nom ?? ''}`.trim() || 'Transporteur';

  const routeExists = (name) => typeof route === 'function' && typeof route().has === 'function' && route().has(name);
  const isCurrent = (pattern) => typeof route === 'function' && typeof route().current === 'function' && route().current(pattern);

  const tabs = [
    {
      href: routeExists('transporteur.rdv.index') ? route('transporteur.rdv.index') : '#',
      label: 'Rendez-vous',
      icon: 'calendar-check',
      active: isCurrent('transporteur.rdv.*'),
    },
    {
      href: routeExists('transporteur.demandes.index') ? route('transporteur.demandes.index') : '#',
      label: 'Demandes',
      icon: 'list-todo',
      active: isCurrent('transporteur.demandes.index') || isCurrent('transporteur.demandes.sent') || isCurrent('transporteur.demandes.edit'),
    },
    {
      href: routeExists('transporteur.creneaux.index') ? route('transporteur.creneaux.index') : '#',
      label: 'Créneaux',
      icon: 'calendar-days',
      active: isCurrent('transporteur.creneaux.*'),
    },
  ];

  return (
    <div lang="fr" className="flex min-h-screen flex-col bg-slate-50 text-slate-900">
      <SkipLink />
      <TopBar>
        <Link href={routeExists('transporteur.rdv.index') ? route('transporteur.rdv.index') : route('dashboard')} aria-label="Accueil de l’espace transporteur" className="shrink-0 rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500">
          <Logo sub="Espace transporteur" />
        </Link>
        <div className="ml-4 hidden md:block">
          <nav aria-label="Navigation principale" className="flex items-center gap-1">
            {tabs.map((tab) => (
              <Link
                key={tab.label}
                href={tab.href}
                className={cn(
                  'inline-flex h-10 items-center gap-2 rounded-xl px-3 text-sm font-medium transition-colors',
                  tab.active
                    ? 'bg-brand-50 font-semibold text-brand-800'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                )}
              >
                <Icon name={tab.icon} size={16} /> {tab.label}
              </Link>
            ))}
          </nav>
        </div>
        <Spacer />
        <span className="hidden md:block">
          {routeExists('transporteur.demandes.create') ? (
            <Link href={route('transporteur.demandes.create')} className={buttonClass({ size: 'sm' })}>
              <Icon name="plus" size={16} /> Nouvelle demande
            </Link>
          ) : null}
        </span>
        <AccountMenu name={userName} sub={user?.raisonsociale || (user?.user_type === 'transitaire' ? 'Transitaire' : 'Transporteur')} items={[
          { icon: 'circle-user', label: 'Mon compte', onClick: () => {} },
          { icon: 'log-out', label: 'Se déconnecter', onClick: () => router.post(route('logout')), tone: 'danger' },
        ]} />
        <IconButton icon="menu" label="Ouvrir le menu" onClick={() => setMobileOpen((open) => !open)} className="md:hidden" />
      </TopBar>
      {mobileOpen ? (
        <nav className="border-b border-slate-200 bg-white px-4 py-3 md:hidden">
          <div className="flex flex-col gap-1">
            {tabs.map((tab) => (
              <Link
                key={tab.label}
                href={tab.href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  'rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  tab.active
                    ? 'bg-brand-50 font-semibold text-brand-800'
                    : 'text-slate-700 hover:bg-slate-100'
                )}
              >
                {tab.label}
              </Link>
            ))}
            {routeExists('transporteur.demandes.create') ? (
              <Link
                href={route('transporteur.demandes.create')}
                onClick={() => setMobileOpen(false)}
                className="mt-2 inline-flex items-center justify-center gap-2 rounded-lg bg-brand-600 px-3 py-2 text-sm font-semibold text-white shadow-xs"
              >
                <Icon name="plus" size={16} /> Nouvelle demande
              </Link>
            ) : null}
          </div>
        </nav>
      ) : null}
      <main id="pf-main" tabIndex={-1} className="mx-auto w-full max-w-7xl flex-1 px-4 pb-32 pt-6 focus:outline-none sm:px-6 sm:pt-8 md:pb-10">
        <FlashAlerts />
        {header && <div className="mb-6">{header}</div>}
        {children}
      </main>
      <footer className="hidden border-t border-slate-200 bg-white md:block">
        <div className="mx-auto max-w-7xl px-6 py-4 text-xs text-slate-500">Espace transporteur & transitaire · PortFlow</div>
      </footer>
    </div>
  );
}

export function TransporteurLayout({ user, header, children }) {
  return <InertiaTransporteurLayout user={user} header={header}>{children}</InertiaTransporteurLayout>;
}

export default TransporteurLayout;
