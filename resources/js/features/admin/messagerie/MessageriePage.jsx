// Messagerie : journal des e-mails, SMS et WhatsApp, état de la tâche planifiée, tests d'envoi.
import { useState } from 'react';
import { CHANNELS } from '../../../lib/messages.js';
import { usePortFlow } from '../../../providers/PortFlowProvider.jsx';
import { useNow } from '../../../hooks/useNow.js';
import { PageHeader, Segmented, SearchInput, EmptyState, Button } from '../../../Components/ui/index.js';
import { ChannelIcon, MessageRow, MessageDetail } from '../../../Components/domain/index.js';
import { RequirePerm, ListTools } from '../components/Parts.jsx';
import { CronStatus } from './CronStatus.jsx';
import { SendTests, DRIVER_LABEL } from './SendTests.jsx';

const MSG_FILTERS = [
  { value: 'all', label: 'Tous' },
  { value: 'email', label: 'E-mail' },
  { value: 'sms', label: 'SMS' },
  { value: 'whatsapp', label: 'WhatsApp' },
];

function Messagerie() {
  const { data, config } = usePortFlow();
  const now = useNow(60000);
  const [filter, setFilter] = useState('all');
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(null);
  const [limit, setLimit] = useState(40);
  const demo = !!config?.demo;
  const channels = config?.channels || data.channels || {};
  const counts = Object.fromEntries(MSG_FILTERS.map(f => [f.value, f.value === 'all' ? data.messages.length : data.messages.filter(m => m.channel === f.value).length]));
  const needle = q.trim().toLowerCase();
  const list = data.messages.filter(m => (filter === 'all' || m.channel === filter) && (!needle || [m.toName, m.to, m.subject, m.ref, m.body].join(' ').toLowerCase().includes(needle)));

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="Messagerie" className="mb-0" subtitle={demo
        ? 'Journal du service de messagerie · démonstration : les messages sont enregistrés, pas envoyés.'
        : 'Journal du service de messagerie : e-mails et SMS envoyés par la plateforme, QR codes envoyés par WhatsApp par les transporteurs.'} />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {Object.entries(CHANNELS).map(([k, c]) => {
          const n24 = data.messages.filter(m => m.channel === k && now - Date.parse(m.at) < 86400000).length;
          return (
            <div key={k} className="flex flex-col gap-1 rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.05)]">
              <span className="flex items-center gap-2 text-[13px] font-medium text-slate-600"><ChannelIcon channel={k} size={15} /> {c.label}</span>
              <span className="text-3xl font-bold tabular-nums tracking-tight text-slate-900">{n24}</span>
              <span className="text-[13px] text-slate-500">sur 24 h · {counts[k]} au total · {demo ? 'simulation' : DRIVER_LABEL[channels[k]] || channels[k] || '—'}</span>
            </div>
          );
        })}
      </div>
      <div>
        <ListTools>
          <Segmented label="Canal" value={filter} onChange={setFilter} options={MSG_FILTERS.map(f => ({ value: f.value, label: f.label, count: counts[f.value] }))} />
          <SearchInput value={q} onChange={setQ} placeholder="Destinataire, référence, contenu…" className="w-full lg:w-80" />
        </ListTools>
        {list.length === 0 ? <EmptyState icon="inbox" title="Aucun message" /> : (
          <div className="flex flex-col rounded-2xl border border-slate-200 bg-white p-1.5">
            {list.slice(0, limit).map(m => <MessageRow key={m.id} message={m} onClick={() => setOpen(m)} />)}
          </div>
        )}
        {list.length > limit && <div className="mt-3"><Button variant="ghost" size="sm" icon="chevron-down" onClick={() => setLimit(l => l + 40)}>Afficher plus ({list.length - limit})</Button></div>}
      </div>
      <CronStatus cron={data.cron} now={now} demo={demo} />
      {!demo && <SendTests />}
      <MessageDetail message={open} onClose={() => setOpen(null)} />
    </div>
  );
}

export function MessageriePage() {
  return <RequirePerm perm="messagerie.consulter"><Messagerie /></RequirePerm>;
}
