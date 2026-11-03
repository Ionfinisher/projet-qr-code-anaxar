// Application Guérite : session de l'agent, choix du poste, puis barre sombre (poste, horloge, compte) et onglets.
import { useState } from 'react';
import { DOCS, personName, postLabel } from '../Lib/domain.js';
import { notify } from '../Lib/alerts.js';
import { AppLink } from '../Lib/navigation.jsx';
import { usePortFlow, useCurrentUser } from '../providers/PortFlowProvider.jsx';
import { useNow } from '../Hooks/useNow.js';
import { RequireReady } from '../routes/guards.jsx';
import { AccountMenu, Drawer, Icon } from '../components/ui/index.js';
import { Logo, StandardsDrawer } from '../components/domain/index.js';
import { ForcePasswordChangePage, ChangePasswordDrawer, useAuthApi } from '../features/auth/index.js';
import {
  GateLoginPage, PostPickerPage, GateSessionProvider, useGateSession, useGateApi, countAtGate, PostGrid, PostBadge, Clock,
} from '../features/guerite/index.js';
import { gateStandards, STANDARDS_INTRO } from '../features/guerite/constants.js';
import { SkipLink, TopBar, Spacer, NavTabs, Main } from './parts.jsx';

function GateChrome({ children }) {
  const { config, data } = usePortFlow();
  const { user, profile, can } = useCurrentUser();
  const auth = useAuthApi();
  const gate = useGateApi();
  const { rdvs, clear } = useGateSession();
  const now = useNow(15000);
  const [picker, setPicker] = useState(false);
  const [std, setStd] = useState(false);
  const [pwd, setPwd] = useState(false);
  const post = data.post;
  const atGate = countAtGate(rdvs, now);

  const pick = async p => {
    const r = await gate.setPost(p);
    if (!r.ok) { notify(r.error, 'bad'); return; }
    setPicker(false);
    clear();
    notify(`Poste actif : ${postLabel(p)}`, 'neutral');
  };
  const bye = async () => { await auth.logout(); notify('Session de guérite fermée', 'neutral'); };
  const tabs = [
    { to: 'gate.controle', label: 'Contrôle', icon: 'scan-line', exact: true },
    { to: 'gate.arrivees', label: <span>Arrivées<span className="hidden sm:inline"> du jour</span></span>, icon: 'truck', count: atGate || null },
    { to: 'gate.supervision', label: 'Supervision', icon: 'activity' },
  ];

  return (
    <div lang="fr" className="flex min-h-screen flex-col bg-slate-100 text-slate-900">
      <SkipLink />
      <TopBar dark below={(
        <div className="border-t border-white/10">
          <div className="mx-auto w-full max-w-7xl overflow-x-auto px-2 py-2 sm:px-4">
            <NavTabs dark items={tabs} label="Sections de la guérite" className="w-max" />
          </div>
        </div>
      )}>
        <AppLink to="gate.controle" onClick={clear} aria-label="Guérite : contrôle" className="shrink-0 rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500">
          <Logo sub="Guérite · porte principale" dark />
        </AppLink>
        <Spacer />
        {config?.demo && (
          <span className="hidden items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-xs font-semibold text-brand-300 md:inline-flex">
            <Icon name="sparkles" size={14} /> Démo
          </span>
        )}
        <button type="button" onClick={() => setPicker(true)} aria-label={`Poste actuel : ${postLabel(post)}. Changer de poste`}
          className="inline-flex h-11 shrink-0 cursor-pointer items-center gap-2 rounded-xl bg-white/10 pl-1.5 pr-2.5 text-white transition-colors hover:bg-white/15 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500">
          <PostBadge post={post} size="sm" inverted />
          <span className="hidden max-w-[170px] truncate text-sm font-semibold sm:inline">{post === 'sup' ? 'Superviseur' : DOCS.find(d => d.post === post)?.label}</span>
          <Icon name="chevron-down" size={16} className="text-slate-300" />
        </button>
        <Clock className="hidden lg:inline" />
        <AccountMenu dark name={personName(user)} sub={profile?.name || 'Guérite'} items={[
          { icon: 'repeat', label: 'Changer de poste', onClick: () => setPicker(true) },
          { icon: 'badge-check', label: 'Standards appliqués', onClick: () => setStd(true) },
          { icon: 'lock-keyhole', label: 'Changer mon mot de passe', onClick: () => setPwd(true) },
          { icon: 'log-out', label: 'Se déconnecter', onClick: bye, tone: 'danger' },
        ]} />
      </TopBar>
      <Main wide className="flex-1">{children}</Main>
      <Drawer open={picker} onClose={() => setPicker(false)} title="Changer de poste" description={`Poste actuel : ${postLabel(post)}`} size="lg">
        <PostGrid current={post} supervisor={can('guerite.supervision')} onPick={pick} />
      </Drawer>
      <StandardsDrawer open={std} onClose={() => setStd(false)} items={gateStandards()} intro={STANDARDS_INTRO} />
      <ChangePasswordDrawer open={pwd} onClose={() => setPwd(false)} />
    </div>
  );
}

function GateGuard({ children }) {
  const { data } = usePortFlow();
  const { user } = useCurrentUser();
  if (!user) return <GateLoginPage />;
  if (user.mustChange) return <ForcePasswordChangePage dark />;
  if (data.post === null || data.post === undefined) return <PostPickerPage />;
  return <GateSessionProvider key={user.id}><GateChrome>{children}</GateChrome></GateSessionProvider>;
}

/**
 * Mise en page de l'application Guérite (sous <PortFlowProvider app="guerite">) :
 * démarrage → connexion de l'agent → mot de passe provisoire → choix du poste → pages.
 */
export function GateLayout({ children }) {
  return <RequireReady dark><GateGuard>{children}</GateGuard></RequireReady>;
}
