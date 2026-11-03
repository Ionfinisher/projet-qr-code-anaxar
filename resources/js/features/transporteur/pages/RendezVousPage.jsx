import { useMemo, useState } from 'react';
import { dayStr, statusOf, driverName, transporterName, relDay } from '../../../lib/domain.js';
import { useNav } from '../../../lib/navigation.jsx';
import { usePortFlow, useCurrentUser } from '../../../providers/PortFlowProvider.jsx';
import { useNow } from '../../../hooks/useNow.js';
import { PageHeader, Segmented, SearchInput, EmptyState, Button, Drawer } from '../../../components/ui/index.js';
import { myRdvs } from '../selectors.js';
import { RdvRow, DayLabel } from '../components/RdvList.jsx';
import { RdvDetail } from '../components/RdvDetail.jsx';

const FILTERS = [
  { value: 'all', label: 'Tous', test: () => true },
  { value: 'up', label: 'À venir', test: st => st === 'confirme' },
  { value: 'gate', label: 'À la guérite', test: st => st === 'controle' || st === 'bloque' },
  { value: 'port', label: 'Dans le port', test: st => st === 'au_port' },
  { value: 'done', label: 'Terminés', test: st => st === 'termine' || st === 'annule' || st === 'manque' },
];

/** Rendez-vous validés : QR codes signés et suivi du passage (/transporteur/rendez-vous[/:id]). */
export function RendezVousPage() {
  const { data } = usePortFlow();
  const { user } = useCurrentUser();
  const nav = useNav();
  const now = useNow(30000);
  const [filter, setFilter] = useState('all');
  const [q, setQ] = useState('');
  const today = dayStr(now);
  const rdvs = useMemo(() => myRdvs(data, user), [data.rdvs, user.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const withStatus = useMemo(() => rdvs.map(r => ({ r, st: statusOf(r, now) })), [rdvs, now]);
  const counts = useMemo(() => Object.fromEntries(FILTERS.map(f => [f.value, withStatus.filter(x => f.test(x.st)).length])), [withStatus]);
  const groups = useMemo(() => {
    const f = FILTERS.find(x => x.value === filter);
    const needle = q.trim().toUpperCase().replace(/\s+/g, '');
    const list = withStatus.filter(({ r, st }) => {
      if (!f.test(st)) return false;
      if (!needle) return true;
      const hay = [r.id, r.demandeId, r.container.number, r.container.bl, r.vehicle.tractor, r.vehicle.trailer, driverName(r.driver), transporterName(r.transporter)]
        .join(' ').toUpperCase().replace(/\s+/g, '');
      return hay.includes(needle);
    });
    const map = new Map();
    for (const x of list) {
      if (!map.has(x.r.slot.date)) map.set(x.r.slot.date, []);
      map.get(x.r.slot.date).push(x);
    }
    // Jours à venir d'abord (du plus proche au plus lointain), puis jours passés (du plus récent au plus ancien)
    const keys = [...map.keys()].sort((a, b) => {
      const fa = a >= today, fb = b >= today;
      if (fa !== fb) return fa ? -1 : 1;
      return fa ? a.localeCompare(b) : b.localeCompare(a);
    });
    return keys.map(k => ({ date: k, items: map.get(k).sort((a, b) => a.r.slot.start.localeCompare(b.r.slot.start) || a.r.id.localeCompare(b.r.id)) }));
  }, [withStatus, filter, q, today]);

  const selId = nav.params.id || null;
  const sel = selId ? rdvs.find(r => r.id === selId) : null;
  const close = () => nav.go('transporteur.rdv');

  return (
    <>
      <PageHeader title="Rendez-vous" subtitle="Demandes validées · QR codes signés · suivi du passage à la guérite" />
      <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <Segmented label="Filtrer par statut" value={filter} onChange={setFilter} options={FILTERS.map(f => ({ value: f.value, label: f.label, count: counts[f.value] }))} />
        <SearchInput value={q} onChange={setQ} placeholder="Conteneur, BL, plaque, chauffeur, référence…" className="w-full lg:w-80" />
      </div>
      {groups.length === 0 ? (
        <EmptyState icon="calendar-clock" title="Aucun rendez-vous"
          action={<Button icon="plus" onClick={() => nav.go('transporteur.demandes.new')}>Nouvelle demande</Button>}>
          {q ? 'Aucun résultat pour cette recherche.' : 'Les rendez-vous apparaissent ici dès que l’administration valide vos demandes.'}
        </EmptyState>
      ) : (
        <div className="flex flex-col gap-6">
          {groups.map(g => (
            <section key={g.date} className="flex flex-col gap-2.5" aria-label={relDay(g.date, today)}>
              <DayLabel date={g.date} today={today} count={g.items.length} />
              {g.items.map(({ r, st }) => (
                <RdvRow key={r.id} r={r} st={st} now={now} current={r.id === selId} onClick={() => nav.go('transporteur.rdv.detail', { id: r.id })} />
              ))}
            </section>
          ))}
        </div>
      )}
      <Drawer open={!!selId} onClose={close} size="lg" title={sel ? `Rendez-vous ${sel.id}` : 'Rendez-vous'}
        description={sel ? `${relDay(sel.slot.date)} · ${sel.slot.start}–${sel.slot.end}` : undefined}>
        {sel ? <RdvDetail rdv={sel} rdvs={rdvs} now={now} /> : (
          <EmptyState icon="search" title="Rendez-vous introuvable" action={<Button variant="secondary" onClick={close}>Tous les rendez-vous</Button>}>
            Ce rendez-vous n’existe pas, n’est pas encore validé ou ne vous appartient pas.
          </EmptyState>
        )}
      </Drawer>
    </>
  );
}
