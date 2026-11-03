// Administration du port : barre latérale des modules (selon les habilitations), barre supérieure, contenu.
import { useEffect, useState } from 'react';
import { personName } from '../Lib/domain.js';
import { notify } from '../Lib/alerts.js';
import { AppLink, useNav } from '../Lib/navigation.jsx';
import { usePortFlow, useCurrentUser } from '../providers/PortFlowProvider.jsx';
import { Icon, IconButton, Badge, Avatar, AccountMenu, Drawer } from '../components/ui/index.js';
import { Logo, DemoBanner, UseCasesDrawer, StandardsDrawer } from '../components/domain/index.js';
import { ChangePasswordDrawer, useAuthApi } from '../features/auth/index.js';
import { useAdminModules, useCurrentModule } from '../features/admin/modules.js';
import { SkipLink, TopBar, Spacer, Main } from './parts.jsx';
import { cn } from '../Lib/cn.js';

/** Liens des modules. dark : barre latérale ; sinon menu mobile. */
function AdminNav({ modules, dark = false, onNavigate }) {
  const nav = useNav();
  return (
    <nav aria-label="Modules d’administration" className="flex flex-col gap-1">
      {modules.map(m => {
        const active = m.exact ? nav.isActive(m.route, undefined, { exact: true }) : nav.isActive(m.route);
        return (
          <AppLink key={m.key} to={m.route} onClick={onNavigate} aria-current={active ? 'page' : undefined}
            className={cn('relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500',
              dark
                ? (active ? 'bg-white/10 text-white' : 'text-slate-400 hover:bg-white/5 hover:text-white')
                : (active ? 'bg-brand-50 text-brand-800' : 'text-slate-700 hover:bg-slate-100'))}>
            {dark && <span aria-hidden="true" className={cn('absolute left-0 top-2 bottom-2 w-1 rounded-r-full', active ? 'bg-brand-500' : 'bg-transparent')} />}
            <Icon name={m.icon} size={19} />
            <span className="min-w-0 flex-1 truncate">{m.label}</span>
            {m.count ? <span className="rounded-full bg-brand-600 px-2 text-[11px] font-bold leading-5 tabular-nums text-white">{m.count}</span> : null}
          </AppLink>
        );
      })}
    </nav>
  );
}

const SIDE_BTN = 'flex w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-2 text-left text-sm text-slate-400 transition-colors hover:bg-white/5 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500';

export function AdminLayout({ children }) {
  const { config } = usePortFlow();
  const { user, profile, isSuper } = useCurrentUser();
  const auth = useAuthApi();
  const modules = useAdminModules();
  const current = useCurrentModule(modules);
  const nav = useNav();
  const [menu, setMenu] = useState(false);
  const [uc, setUc] = useState(false);
  const [std, setStd] = useState(false);
  const [pwd, setPwd] = useState(false);
  const name = personName(user);

  useEffect(() => { setMenu(false); }, [nav.pathname]);
  useEffect(() => { window.scrollTo(0, 0); }, [current?.key]);

  const bye = async () => { await auth.logout(); notify('Vous êtes déconnecté', 'neutral'); };

  return (
    <div lang="fr" className="min-h-screen bg-slate-50 text-slate-900 lg:grid lg:grid-cols-[272px_minmax(0,1fr)]">
      <SkipLink />
      <aside className="hidden bg-slate-950 lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col" aria-label="Administration">
        <div className="px-5 pb-6 pt-5"><Logo dark sub="Administration du port" /></div>
        <div className="min-h-0 flex-1 overflow-y-auto px-3"><AdminNav modules={modules} dark /></div>
        <div className="flex flex-col gap-1 border-t border-white/10 px-3 py-4">
          <div className="mb-2 flex items-center gap-3 px-3">
            <Avatar name={name} size={36} tone="dark" className="ring-1 ring-white/20" />
            <span className="min-w-0">
              <b className="block truncate text-sm font-semibold text-white">{name}</b>
              <small className="block truncate text-xs text-slate-400">{profile?.name}</small>
            </span>
          </div>
          <button type="button" className={SIDE_BTN} onClick={() => setUc(true)}><Icon name="clipboard-list" size={18} /> Cas d’utilisation</button>
          <button type="button" className={SIDE_BTN} onClick={() => setStd(true)}><Icon name="badge-check" size={18} /> Standards</button>
          <button type="button" className={cn(SIDE_BTN, 'hover:text-rose-300')} onClick={bye}><Icon name="log-out" size={18} /> Se déconnecter</button>
        </div>
      </aside>

      <div className="flex min-h-screen min-w-0 flex-col">
        <TopBar>
          <IconButton icon="menu" label="Ouvrir le menu" className="-ml-2 lg:hidden" onClick={() => setMenu(true)} />
          <span className="flex min-w-0 items-center gap-2 text-base font-semibold text-slate-900">
            {current && <Icon name={current.icon} size={20} className="text-brand-600" />}
            <span className="truncate">{current?.label}</span>
          </span>
          <Spacer />
          {config?.demo && <Badge tone="brand" icon="sparkles" className="hidden sm:inline-flex">Démo</Badge>}
          <AccountMenu name={name} sub={profile?.name || 'Administration'} items={[
            { icon: 'lock-keyhole', label: 'Changer mon mot de passe', onClick: () => setPwd(true) },
            { icon: 'clipboard-list', label: 'Cas d’utilisation', onClick: () => setUc(true) },
            { icon: 'badge-check', label: 'Standards appliqués', onClick: () => setStd(true) },
            { icon: 'log-out', label: 'Se déconnecter', onClick: bye, tone: 'danger' },
          ]} />
        </TopBar>
        <Main wide className="flex-1">{children}</Main>
        <DemoBanner onReset={isSuper ? auth.resetDemo : undefined} className="border-t border-slate-200 bg-white" />
      </div>

      <Drawer open={menu} onClose={() => setMenu(false)} title="Administration" description={profile?.name} size="sm">
        <AdminNav modules={modules} onNavigate={() => setMenu(false)} />
      </Drawer>
      <UseCasesDrawer open={uc} onClose={() => setUc(false)} />
      <StandardsDrawer open={std} onClose={() => setStd(false)} />
      <ChangePasswordDrawer open={pwd} onClose={() => setPwd(false)} />
    </div>
  );
}
