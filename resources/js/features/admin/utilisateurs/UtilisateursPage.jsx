// Utilisateurs : comptes de l'administration et comptes transporteurs.
import { useState } from 'react';
import { ACCOUNT_KINDS, accountName, personName, formatPhone, fmtAgo } from '../../../lib/domain.js';
import { usePortFlow, useCurrentUser } from '../../../providers/PortFlowProvider.jsx';
import { useNow } from '../../../hooks/useNow.js';
import { PageHeader, Segmented, SearchInput, DataTable, Badge, Avatar, Button, EmptyState } from '../../../Components/ui/index.js';
import { RequirePerm, ListTools } from '../components/Parts.jsx';
import { UserDrawer } from './UserDrawer.jsx';
import { AddUserDrawer } from './AddUserDrawer.jsx';

const USER_FILTERS = [
  { value: 'all', label: 'Tous', test: () => true },
  { value: 'interne', label: 'Administration', test: u => u.kind === 'interne' },
  { value: 'transporteur', label: 'Transporteurs', test: u => u.kind === 'transporteur' },
  { value: 'inactive', label: 'Désactivés', test: u => !u.active },
];

function Utilisateurs() {
  const { data } = usePortFlow();
  const { can } = useCurrentUser();
  const canManage = can('utilisateurs.gerer');
  const now = useNow(60000);
  const [filter, setFilter] = useState('all');
  const [q, setQ] = useState('');
  const [openId, setOpenId] = useState(null);
  const [adding, setAdding] = useState(false);
  const prof = id => data.profiles.find(p => p.id === id);
  const counts = Object.fromEntries(USER_FILTERS.map(f => [f.value, data.users.filter(f.test).length]));
  const needle = q.trim().toLowerCase();
  const list = data.users
    .filter(u => USER_FILTERS.find(f => f.value === filter).test(u)
      && (!needle || [accountName(u), personName(u), u.email, u.phone, prof(u.profileId)?.name].join(' ').toLowerCase().includes(needle)))
    .sort((a, b) => (a.kind === b.kind ? accountName(a).localeCompare(accountName(b)) : a.kind === 'interne' ? -1 : 1));
  const sel = openId ? data.users.find(u => u.id === openId) : null;

  return (
    <>
      <PageHeader title="Utilisateurs" subtitle="Comptes de l’administration et comptes transporteurs issus des inscriptions validées."
        actions={canManage && <Button icon="user-plus" onClick={() => setAdding(true)}>Ajouter un utilisateur</Button>} />
      <ListTools>
        <Segmented label="Filtrer" value={filter} onChange={setFilter} options={USER_FILTERS.map(f => ({ value: f.value, label: f.label, count: counts[f.value] }))} />
        <SearchInput value={q} onChange={setQ} placeholder="Nom, e-mail, profil…" className="w-full lg:w-80" />
      </ListTools>
      <DataTable rows={list} caption="Utilisateurs" onRowClick={u => setOpenId(u.id)} rowClassName={u => (!u.active ? 'opacity-60' : '')}
        empty={<EmptyState icon="users" title="Aucun utilisateur dans cette vue" />}
        columns={[
          { key: 'user', header: 'Utilisateur', render: u => (
            <span className="flex items-center gap-3">
              <Avatar name={accountName(u)} size={34} />
              <span className="min-w-0 max-w-[200px] 2xl:max-w-[280px]"><b className="block truncate font-semibold text-slate-900">{accountName(u)}</b><small className="block truncate text-[13px] text-slate-500">{u.email || formatPhone(u.phone)}</small></span>
            </span>
          ) },
          { key: 'profile', header: 'Profil', render: u => prof(u.profileId)?.name || '—' },
          { key: 'kind', header: 'Type', render: u => (u.kind === 'interne'
            ? <Badge tone="info" icon="shield-user">Administration</Badge>
            : <Badge icon={ACCOUNT_KINDS[u.acct]?.icon || 'truck'}>{ACCOUNT_KINDS[u.acct]?.short || 'Transporteur'}</Badge>) },
          { key: 'status', header: 'Statut', render: u => (u.active ? <Badge tone="ok" icon="check">Actif</Badge> : <Badge icon="power">Désactivé</Badge>) },
          { key: 'login', header: 'Dernière connexion', className: 'whitespace-nowrap text-[13px] text-slate-500', render: u => (u.lastLoginAt ? fmtAgo(u.lastLoginAt, now) : 'Jamais') },
          { key: 'action', header: 'Fiche', headerClassName: 'text-right', className: 'text-right', render: u => (
            <Button size="sm" variant="secondary" aria-label={`Consulter ${accountName(u)}`} onClick={ev => { ev.stopPropagation(); setOpenId(u.id); }}>Consulter</Button>
          ) },
        ]} />
      {sel && <UserDrawer key={sel.id} u={sel} canManage={canManage} onClose={() => setOpenId(null)} />}
      <AddUserDrawer open={adding} onClose={() => setAdding(false)} />
    </>
  );
}

export function UtilisateursPage() {
  return <RequirePerm perm="utilisateurs.consulter"><Utilisateurs /></RequirePerm>;
}
