// Demandes de rendez-vous : liste filtrée, détail en panneau latéral (/admin/demandes/:id), validation ou rejet.
import { useMemo, useState } from 'react';
import { OPS, TERMINALS, DEM_STATUS, slotRange, relDay, dayStr, fmtAgo, accountName } from '../../../lib/domain.js';
import { useNav } from '../../../lib/navigation.jsx';
import { usePortFlow } from '../../../providers/PortFlowProvider.jsx';
import { useNow } from '../../../hooks/useNow.js';
import { PageHeader, Segmented, SearchInput, EmptyState, Drawer } from '../../../components/ui/index.js';
import { StatusTag } from '../../../components/domain/index.js';
import { RecordRow, ListTools, RequirePerm, UrgencyBadge } from '../components/Parts.jsx';
import { ownerOf, demandeRdvs, plural } from '../selectors.js';
import { DemandeAdminDetail } from './DemandeAdminDetail.jsx';

const DEM_FILTERS = [
  { value: 'en_attente', label: 'À traiter', test: d => d.status === 'en_attente' },
  { value: 'validee', label: 'Validées', test: d => d.status === 'validee' },
  { value: 'rejetee', label: 'Rejetées', test: d => d.status === 'rejetee' },
  { value: 'annulee', label: 'Annulées', test: d => d.status === 'annulee' },
  { value: 'all', label: 'Toutes', test: () => true },
];

function DemandesList() {
  const { data } = usePortFlow();
  const nav = useNav();
  const now = useNow(30000);
  const [filter, setFilter] = useState('en_attente');
  const [q, setQ] = useState('');
  const selectedId = nav.params.id || null;
  const counts = Object.fromEntries(DEM_FILTERS.map(f => [f.value, data.demandes.filter(f.test).length]));
  const list = useMemo(() => {
    const f = DEM_FILTERS.find(x => x.value === filter);
    const needle = q.trim().toUpperCase().replace(/\s+/g, '');
    return data.demandes.filter(d => {
      if (!f.test(d)) return false;
      if (!needle) return true;
      const rs = demandeRdvs(data, d);
      return [d.id, accountName(ownerOf(data, d.ownerId)), ...rs.flatMap(r => [r.id, r.container.number, r.vehicle.tractor])]
        .join(' ').toUpperCase().replace(/\s+/g, '').includes(needle);
    }).sort((a, b) => (filter === 'en_attente' ? slotRange(a.slot).start - slotRange(b.slot).start : b.updatedAt.localeCompare(a.updatedAt)));
  }, [data, filter, q]);
  const sel = selectedId ? data.demandes.find(d => d.id === selectedId) : null;
  const today = dayStr(now);

  return (
    <>
      <PageHeader title="Demandes de rendez-vous" subtitle="Les QR codes ne sont émis qu’après votre validation." />
      <ListTools>
        <Segmented label="Filtrer par statut" value={filter} onChange={setFilter} options={DEM_FILTERS.map(f => ({ value: f.value, label: f.label, count: counts[f.value] }))} />
        <SearchInput value={q} onChange={setQ} placeholder="Référence, transporteur, conteneur, plaque…" className="w-full lg:w-80" />
      </ListTools>
      {list.length === 0 ? <EmptyState icon="calendar-check" title="Aucune demande dans cette vue" /> : (
        <div className="flex flex-col gap-2">
          {list.map(d => (
            <RecordRow key={d.id} active={d.id === selectedId} onClick={() => nav.go('admin.demandes.detail', { id: d.id })}
              leading={<><strong className="text-sm font-bold tabular-nums text-slate-900">{d.slot.start}</strong><span className="text-[11px] text-slate-500">{relDay(d.slot.date, today).replace('Aujourd’hui', 'Auj.')}</span></>}
              title={accountName(ownerOf(data, d.ownerId))}
              line2={<><span className="font-mono">{d.id}</span> · {d.rdvIds.length} {plural(d.rdvIds.length, 'camion')} · {OPS[d.op]?.short} · {TERMINALS[d.terminal]?.short}</>}
              line3={d.status === 'en_attente' ? `Soumise ${fmtAgo(d.submittedAt, now)}` : `Mise à jour ${fmtAgo(d.updatedAt, now)}`}
              side={d.status === 'en_attente' ? <UrgencyBadge demande={d} now={now} /> : <StatusTag map={DEM_STATUS} status={d.status} short />} />
          ))}
        </div>
      )}
      <Drawer open={!!selectedId} onClose={() => nav.go('admin.demandes')} title={sel ? `Demande ${sel.id}` : 'Demande de rendez-vous'}
        description={sel ? accountName(ownerOf(data, sel.ownerId)) : undefined} size="xl">
        {sel ? <DemandeAdminDetail key={sel.id} d={sel} now={now} /> : (
          <EmptyState icon="file-search" title="Demande introuvable">Elle n’existe pas ou n’est plus visible avec votre profil.</EmptyState>
        )}
      </Drawer>
    </>
  );
}

export function DemandesAdminPage() {
  return <RequirePerm perm="demandes.consulter"><DemandesList /></RequirePerm>;
}
