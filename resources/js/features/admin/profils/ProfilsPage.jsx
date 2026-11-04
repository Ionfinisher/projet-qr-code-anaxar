// Profils : habilitations regroupées et attribuées aux utilisateurs.
import { useState } from 'react';
import { PERM_LABEL } from '../../../lib/domain.js';
import { usePortFlow, useCurrentUser } from '../../../providers/PortFlowProvider.jsx';
import { PageHeader, Button, Badge, Icon } from '../../../Components/ui/index.js';
import { RequirePerm } from '../components/Parts.jsx';
import { ProfileDrawer } from './ProfileDrawer.jsx';
import { cn } from '../../../lib/cn.js';

function Profils() {
  const { data } = usePortFlow();
  const { can } = useCurrentUser();
  const canManage = can('profils.gerer');
  const [openId, setOpenId] = useState(null);
  const [creating, setCreating] = useState(false);
  const count = id => data.users.filter(u => u.profileId === id).length;
  const sel = openId ? data.profiles.find(p => p.id === openId) : null;

  return (
    <>
      <PageHeader title="Profils" subtitle="Un profil regroupe les habilitations attribuées aux utilisateurs."
        actions={canManage && <Button icon="shield-plus" onClick={() => setCreating(true)}>Nouveau profil</Button>} />
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {data.profiles.map(p => {
          const perms = p.perms.includes('*') ? ['Toutes les habilitations'] : p.perms.map(x => PERM_LABEL[x] || x);
          const n = count(p.id);
          return (
            <button key={p.id} type="button" onClick={() => setOpenId(p.id)}
              className="flex cursor-pointer flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-[0_1px_2px_rgba(15,23,42,0.05)] transition-colors hover:border-brand-300 hover:bg-brand-50/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500">
              <span className="flex items-start justify-between gap-3">
                <span className={cn('flex h-10 w-10 items-center justify-center rounded-xl', p.kind === 'externe' ? 'bg-slate-100 text-slate-600' : 'bg-sky-50 text-sky-700')}>
                  <Icon name={p.perms.includes('*') ? 'key-round' : p.kind === 'externe' ? 'truck' : 'shield-user'} size={20} />
                </span>
                <span className="flex flex-wrap justify-end gap-1.5">
                  <Badge tone={p.kind === 'externe' ? 'neutral' : 'info'}>{p.kind === 'externe' ? 'Externe' : 'Interne'}</Badge>
                  {p.system && <Badge icon="lock">Système</Badge>}
                </span>
              </span>
              <span>
                <b className="block text-base font-semibold text-slate-900">{p.name}</b>
                {p.description && <span className="mt-0.5 block text-sm text-slate-500">{p.description}</span>}
              </span>
              <span className="flex flex-col gap-1 text-[13px] text-slate-700">
                {perms.slice(0, 3).map(x => <span key={x} className="flex items-start gap-1.5"><Icon name="check" size={14} className="mt-0.5 text-emerald-600" /> {x}</span>)}
                {perms.length > 3 && <span className="text-slate-500">+ {perms.length - 3} autre{perms.length - 3 > 1 ? 's' : ''}</span>}
              </span>
              <span className="mt-auto flex items-center gap-1.5 border-t border-slate-100 pt-3 text-[13px] text-slate-500">
                <Icon name="users" size={15} /> {n} utilisateur{n > 1 ? 's' : ''}
              </span>
            </button>
          );
        })}
      </div>
      {sel && <ProfileDrawer key={sel.id} p={sel} canManage={canManage} onClose={() => setOpenId(null)} />}
      {creating && <ProfileDrawer p={null} canManage={canManage} onClose={() => setCreating(false)} />}
    </>
  );
}

export function ProfilsPage() {
  return <RequirePerm perm="profils.consulter"><Profils /></RequirePerm>;
}
