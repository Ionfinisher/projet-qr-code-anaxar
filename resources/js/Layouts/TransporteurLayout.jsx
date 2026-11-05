// Espace transporteur / transitaire : barre supérieure (onglets, nouvelle demande, notifications, compte),
// barre d'onglets en bas de l'écran sur mobile.
import { useState } from 'react';
import { Link, router, usePage } from '@inertiajs/react';
import { AccountMenu, IconButton, Icon, buttonClass } from '../Components/ui/index.js';
import { Logo } from '../Components/domain/Logo.jsx';
import { SkipLink, TopBar, Spacer } from './parts.jsx';

function InertiaTransporteurLayout({ children }) {
  const { props } = usePage();
  const user = props.auth?.user;
  const [mobileOpen, setMobileOpen] = useState(false);
  const userName = user?.name || `${user?.prenom ?? ''} ${user?.nom ?? ''}`.trim() || 'Transporteur';
  const tabs = [
    { href: route('transporteur.demandes.index'), label: 'Demandes', icon: 'list-todo' },
    { href: route('transporteur.creneaux.index'), label: 'Créneaux', icon: 'calendar-days' },
  ];

  return (
    <div lang="fr" className="flex min-h-screen flex-col bg-slate-50 text-slate-900">
      <SkipLink />
      <TopBar>
        <Link href={route('transporteur.demandes.index')} aria-label="Accueil de l’espace transporteur" className="shrink-0 rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500">
          <Logo sub="Espace transporteur" />
        </Link>
        <div className="ml-4 hidden md:block">
          <nav aria-label="Navigation principale" className="flex items-center gap-1">
            {tabs.map((tab) => (
              <Link key={tab.href} href={tab.href}
                className="inline-flex h-10 items-center gap-2 rounded-xl px-3 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100">
                <Icon name={tab.icon} size={16} /> {tab.label}
              </Link>
            ))}
          </nav>
        </div>
        <Spacer />
        <span className="hidden md:block">
          <Link href={route('transporteur.demandes.create')} className={buttonClass({ size: 'sm' })}>
            <Icon name="plus" size={16} /> Nouvelle demande
          </Link>
        </span>
        <AccountMenu name={userName} sub="Transporteur" items={[
          { icon: 'circle-user', label: 'Mon compte', onClick: () => {} },
          { icon: 'log-out', label: 'Se déconnecter', onClick: () => router.post(route('logout')), tone: 'danger' },
        ]} />
        <IconButton icon="menu" label="Ouvrir le menu" onClick={() => setMobileOpen((open) => !open)} className="md:hidden" />
      </TopBar>
      {mobileOpen ? (
        <nav className="border-b border-slate-200 bg-white px-4 py-3 md:hidden">
          <div className="flex flex-col gap-1">
            {tabs.map((tab) => (
              <Link key={tab.href} href={tab.href} onClick={() => setMobileOpen(false)}
                className="rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100">
                {tab.label}
              </Link>
            ))}
          </div>
        </nav>
      ) : null}
      <main id="pf-main" tabIndex={-1} className="mx-auto w-full max-w-6xl flex-1 px-4 pb-32 pt-6 focus:outline-none sm:px-6 sm:pt-8 md:pb-10">
        {children}
      </main>
      <footer className="hidden border-t border-slate-200 bg-white md:block">
        <div className="mx-auto max-w-6xl px-6 py-4 text-xs text-slate-500">Espace transporteur</div>
      </footer>
    </div>
  );
}

export function TransporteurLayout({ children }) {
  return <InertiaTransporteurLayout>{children}</InertiaTransporteurLayout>;
}
