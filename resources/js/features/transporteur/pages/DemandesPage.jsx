import { useMemo, useState } from 'react';
import { driverName } from '../../../lib/domain.js';
import { useNav } from '../../../lib/navigation.jsx';
import { usePortFlow, useCurrentUser } from '../../../providers/PortFlowProvider.jsx';
import { useNow } from '../../../hooks/useNow.js';
import { PageHeader, Segmented, SearchInput, EmptyState, Button, Drawer } from '../../../Components/ui/index.js';
import { myDemandes, demandeRdvs } from '../selectors.js';
import { DemandeRow, DemandeDetail } from '../components/DemandeDetail.jsx';

const DEM_FILTERS = [
  { value: 'all', label: 'Toutes', test: () => true },
  { value: 'en_attente', label: 'En attente', test: d => d.status === 'en_attente' },
  { value: 'validee', label: 'Validées', test: d => d.status === 'validee' },
  { value: 'rejetee', label: 'Rejetées', test: d => d.status === 'rejetee' },
  { value: 'annulee', label: 'Annulées', test: d => d.status === 'annulee' },
];

/** Demandes de rendez-vous du transporteur (/transporteur/demandes[/:id]). */
export function DemandesPage() {
  const { data } = usePortFlow();
  const { user } = useCurrentUser();
  const nav = useNav();
  const now = useNow(30000);
  const [filter, setFilter] = useState('all');
  const [q, setQ] = useState('');
  const demandes = useMemo(() => myDemandes(data, user), [data.demandes, user.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const counts = Object.fromEntries(DEM_FILTERS.map(f => [f.value, demandes.filter(f.test).length]));
  const list = useMemo(() => {
    const f = DEM_FILTERS.find(x => x.value === filter);
    const needle = q.trim().toUpperCase().replace(/\s+/g, '');
    return demandes.filter(d => {
      if (!f.test(d)) return false;
      if (!needle) return true;
      const rs = demandeRdvs(data, d);
      const hay = [d.id, ...rs.flatMap(r => [r.id, r.container.number, r.container.bl, r.vehicle.tractor, driverName(r.driver)])].join(' ').toUpperCase().replace(/\s+/g, '');
      return hay.includes(needle);
    }).sort((a, b) => ((b.status === 'en_attente') - (a.status === 'en_attente')) || b.updatedAt.localeCompare(a.updatedAt));
  }, [demandes, filter, q, data]);

  const selId = nav.params.id || null;
  const sel = selId ? demandes.find(d => d.id === selId) : null;
  const close = () => nav.go('transporteur.demandes');

  return (
    <>
      <PageHeader title="Demandes de rendez-vous" subtitle="Chaque demande est validée par l’administration du port avant l’émission des QR codes." />
      <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <Segmented label="Filtrer par statut" value={filter} onChange={setFilter} options={DEM_FILTERS.map(f => ({ value: f.value, label: f.label, count: counts[f.value] }))} />
        <SearchInput value={q} onChange={setQ} placeholder="Référence, conteneur, plaque, chauffeur…" className="w-full lg:w-80" />
      </div>
      {list.length === 0 ? (
        <EmptyState icon="list-todo" title="Aucune demande" action={<Button icon="plus" onClick={() => nav.go('transporteur.demandes.new')}>Nouvelle demande</Button>}>
          {q ? 'Aucun résultat pour cette recherche.' : 'Choisissez un créneau disponible pour faire votre première demande.'}
        </EmptyState>
      ) : (
        <div className="flex flex-col gap-2.5">
          {list.map(d => <DemandeRow key={d.id} d={d} now={now} current={d.id === selId} onClick={() => nav.go('transporteur.demandes.detail', { id: d.id })} />)}
        </div>
      )}
      <Drawer open={!!selId} onClose={close} size="lg" title={sel ? `Demande ${sel.id}` : 'Demande de rendez-vous'} description={sel ? 'Demande de rendez-vous' : undefined}>
        {sel ? <DemandeDetail d={sel} now={now} /> : (
          <EmptyState icon="search" title="Demande introuvable" action={<Button variant="secondary" onClick={close}>Toutes les demandes</Button>}>
            Cette demande n’existe pas ou ne vous appartient pas.
          </EmptyState>
        )}
      </Drawer>
    </>
  );
}
