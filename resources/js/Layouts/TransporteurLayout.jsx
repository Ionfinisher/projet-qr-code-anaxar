// Espace transporteur / transitaire : barre supérieure (onglets, nouvelle demande, notifications, compte),
// barre d'onglets en bas de l'écran sur mobile.
import { useMemo, useState } from 'react';
import { ACCOUNT_KINDS, accountName } from '../Lib/domain.js';
import { notify } from '../Lib/alerts.js';
import { AppLink, useNav } from '../Lib/navigation.jsx';
import { usePortFlow, useCurrentUser } from '../providers/PortFlowProvider.jsx';
import { useNow } from '../Hooks/useNow.js';
import { AccountMenu, IconButton, Icon, buttonClass } from '../components/ui/index.js';
import { Logo, DemoBanner, StandardsDrawer, UseCasesDrawer } from '../components/domain/index.js';
import { ChangePasswordDrawer, useAuthApi } from '../features/auth/index.js';
import { NotificationsDrawer } from '../features/transporteur/components/NotificationsDrawer.jsx';
import { myRdvs, myDemandes, userMessages, unreadCount, upcomingCount, pendingCount } from '../features/transporteur/selectors.js';
import { cn } from '../Lib/cn.js';
import { SkipLink, TopBar, Spacer, NavTabs, BottomTabBar } from './parts.jsx';

export function TransporteurLayout({ children }) {
  const { data } = usePortFlow();
  const { user } = useCurrentUser();
  const auth = useAuthApi();
  const nav = useNav();
  const now = useNow(30000);
  const [notif, setNotif] = useState(false);
  const [uc, setUc] = useState(false);
  const [std, setStd] = useState(false);
  const [pwd, setPwd] = useState(false);

  const rdvs = useMemo(() => myRdvs(data, user), [data.rdvs, user.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const demandes = useMemo(() => myDemandes(data, user), [data.demandes, user.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const msgs = useMemo(() => userMessages(data, user), [data.messages, user]); // eslint-disable-line react-hooks/exhaustive-deps
  const unread = unreadCount(msgs, user);
  const upcoming = upcomingCount(rdvs, now);
  const pending = pendingCount(demandes);

  const inWizard = nav.isActive('transporteur.demandes.new') || /\/modifier\/?$/.test(nav.pathname);
  const tabs = [
    { to: 'transporteur.rdv', label: 'Rendez-vous', icon: 'qr-code', count: upcoming },
    { to: 'transporteur.demandes', label: 'Demandes', icon: 'list-todo', count: pending },
    { to: 'transporteur.creneaux', label: 'Créneaux', icon: 'calendar-days' },
  ];
  const bye = async () => { await auth.logout(); notify('Vous êtes déconnecté', 'neutral'); };

  return (
    <div lang="fr" className="flex min-h-screen flex-col bg-slate-50 text-slate-900">
      <SkipLink />
      <TopBar>
        <AppLink to="transporteur.rdv" aria-label="Accueil de l’espace transporteur" className="shrink-0 rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500">
          <Logo sub="Espace transporteur" />
        </AppLink>
        <div className="ml-4 hidden md:block"><NavTabs items={tabs} /></div>
        <Spacer />
        <span className="hidden md:block">
          <AppLink to="transporteur.demandes.new" className={buttonClass({ size: 'sm' })}>
            <Icon name="plus" size={16} /> Nouvelle demande
          </AppLink>
        </span>
        <IconButton icon="bell" onClick={() => setNotif(true)} badge={unread ? (unread > 9 ? '9+' : unread) : null}
          label={unread ? `Notifications : ${unread} non lue${unread > 1 ? 's' : ''}` : 'Notifications'} />
        <AccountMenu name={accountName(user)} sub={ACCOUNT_KINDS[user.acct]?.short || 'Transporteur'} items={[
          { icon: 'circle-user', label: 'Mon compte', onClick: () => nav.go('transporteur.compte') },
          { icon: 'lock-keyhole', label: 'Changer mon mot de passe', onClick: () => setPwd(true) },
          { icon: 'clipboard-list', label: 'Cas d’utilisation', onClick: () => setUc(true) },
          { icon: 'badge-check', label: 'Standards appliqués', onClick: () => setStd(true) },
          { icon: 'log-out', label: 'Se déconnecter', onClick: bye, tone: 'danger' },
        ]} />
      </TopBar>

      <main id="pf-main" tabIndex={-1} className="mx-auto w-full max-w-6xl flex-1 px-4 pb-32 pt-6 focus:outline-none sm:px-6 sm:pt-8 md:pb-10">
        {children}
      </main>
      <footer className="hidden border-t border-slate-200 bg-white md:block"><DemoBanner /></footer>
      <div className="pb-20 md:hidden"><DemoBanner /></div>

      {!inWizard && (
        <AppLink to="transporteur.demandes.new" aria-label="Nouvelle demande"
          className={cn(buttonClass({ size: 'lg' }), 'fixed bottom-[calc(5rem+env(safe-area-inset-bottom))] right-4 z-40 rounded-full pl-4 pr-5 shadow-[0_12px_28px_rgba(207,67,16,0.35)] md:hidden')}>
          <Icon name="plus" size={20} /> Nouvelle demande
        </AppLink>
      )}
      <BottomTabBar items={[...tabs, { to: 'transporteur.compte', label: 'Compte', icon: 'circle-user' }]} />

      <NotificationsDrawer open={notif} onClose={() => setNotif(false)} messages={msgs} user={user} />
      <UseCasesDrawer open={uc} onClose={() => setUc(false)} />
      <StandardsDrawer open={std} onClose={() => setStd(false)} />
      <ChangePasswordDrawer open={pwd} onClose={() => setPwd(false)} />
    </div>
  );
}
