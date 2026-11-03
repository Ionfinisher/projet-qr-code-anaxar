// Demandes d'inscription : liste filtrée, détail en panneau latéral (/admin/inscriptions/:id), décisions.
import { useMemo, useState } from 'react';
import { ACCOUNT_KINDS, INS_STATUS, insName, fmtAgo } from '../../../lib/domain.js';
import { useNav } from '../../../lib/navigation.jsx';
import { usePortFlow } from '../../../providers/PortFlowProvider.jsx';
import { useNow } from '../../../hooks/useNow.js';
import { PageHeader, Segmented, SearchInput, EmptyState, Drawer, Icon } from '../../../components/ui/index.js';
import { StatusTag, InscriptionDetail } from '../../../components/domain/index.js';
import { RecordRow, ListTools, RequirePerm } from '../components/Parts.jsx';
import { InscriptionDecision } from './InscriptionDecision.jsx';

const INS_FILTERS = [
  { value: 'en_attente', label: 'À traiter', test: i => i.status === 'en_attente' },
  { value: 'a_completer', label: 'À compléter', test: i => i.status === 'a_completer' },
  { value: 'validee', label: 'Validées', test: i => i.status === 'validee' },
  { value: 'rejetee', label: 'Rejetées', test: i => i.status === 'rejetee' },
  { value: 'all', label: 'Toutes', test: () => true },
];

function InscriptionsList() {
  const { data } = usePortFlow();
  const nav = useNav();
  const now = useNow(60000);
  const [filter, setFilter] = useState('en_attente');
  const [q, setQ] = useState('');
  const selectedId = nav.params.id || null;
  const counts = Object.fromEntries(INS_FILTERS.map(f => [f.value, data.inscriptions.filter(f.test).length]));
  const list = useMemo(() => {
    const f = INS_FILTERS.find(x => x.value === filter);
    const needle = q.trim().toLowerCase();
    return data.inscriptions
      .filter(i => f.test(i) && (!needle || [i.id, insName(i), i.email, i.phone, i.nif, i.rccm].join(' ').toLowerCase().includes(needle)))
      .sort((a, b) => (filter === 'en_attente' ? a.submittedAt.localeCompare(b.submittedAt) : b.updatedAt.localeCompare(a.updatedAt)));
  }, [data.inscriptions, filter, q]);
  const sel = selectedId ? data.inscriptions.find(i => i.id === selectedId) : null;
  const close = () => nav.go('admin.inscriptions');

  return (
    <>
      <PageHeader title="Demandes d’inscription" subtitle="Vérifiez les pièces avant d’ouvrir un compte transporteur." />
      <ListTools>
        <Segmented label="Filtrer par statut" value={filter} onChange={setFilter} options={INS_FILTERS.map(f => ({ value: f.value, label: f.label, count: counts[f.value] }))} />
        <SearchInput value={q} onChange={setQ} placeholder="Nom, référence, NIF, e-mail…" className="w-full lg:w-80" />
      </ListTools>
      {list.length === 0 ? <EmptyState icon="user-check" title="Aucune demande dans cette vue" /> : (
        <div className="flex flex-col gap-2">
          {list.map(i => (
            <RecordRow key={i.id} active={i.id === selectedId} onClick={() => nav.go('admin.inscriptions.detail', { id: i.id })}
              leading={<Icon name={ACCOUNT_KINDS[i.kind]?.icon} size={22} />}
              title={insName(i)}
              line2={<><span className="font-mono">{i.id}</span> · {ACCOUNT_KINDS[i.kind]?.short}</>}
              line3={`Déposée ${fmtAgo(i.submittedAt, now)}${i.status === 'a_completer' ? ` · compléments demandés ${fmtAgo(i.request?.at, now)}` : ''}`}
              side={<StatusTag map={INS_STATUS} status={i.status} short />} />
          ))}
        </div>
      )}
      <Drawer open={!!selectedId} onClose={close} title={sel ? insName(sel) : 'Demande d’inscription'} description={sel ? ACCOUNT_KINDS[sel.kind]?.label : undefined} size="lg">
        {sel ? (
          <InscriptionDetail key={sel.id} ins={sel} actions={<InscriptionDecision key={sel.id} ins={sel} />} />
        ) : (
          <EmptyState icon="file-search" title="Demande introuvable">Elle n’existe pas ou n’est plus visible avec votre profil.</EmptyState>
        )}
      </Drawer>
    </>
  );
}

export function InscriptionsPage() {
  return <RequirePerm perm="inscriptions.consulter"><InscriptionsList /></RequirePerm>;
}
