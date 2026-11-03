import { useMemo, useState } from 'react';
import { dayStr, statusOf, punctuality, relDay, fmtTime, fmtTimeS, fmtDayLong, EVENT } from '../../../lib/domain.js';
import { notify } from '../../../lib/alerts.js';
import { usePortFlow, useCurrentUser } from '../../../providers/PortFlowProvider.jsx';
import { useNow } from '../../../hooks/useNow.js';
import { PageHeader, StatCard, Card, SectionTitle, Button, Icon, buttonClass } from '../../../components/ui/index.js';
import { DemoBanner } from '../../../components/domain/index.js';
import { cn } from '../../../lib/cn.js';
import { useGateApi } from '../api.js';
import { useGateSession } from '../GateSession.jsx';
import { cap } from '../constants.js';

const LOG_TONE = {
  ok: 'bg-emerald-50 text-emerald-700 ring-emerald-200', bad: 'bg-rose-50 text-rose-700 ring-rose-200', warn: 'bg-amber-50 text-amber-700 ring-amber-200',
  info: 'bg-sky-50 text-sky-700 ring-sky-200', neutral: 'bg-slate-100 text-slate-600 ring-slate-200',
};

/** Supervision de la porte : indicateurs du jour, journal chaîné et scellé, vérification d'intégrité, export. */
export function SupervisionPage() {
  const { data } = usePortFlow();
  const { can } = useCurrentUser();
  const { rdvs } = useGateSession();
  const gate = useGateApi();
  const now = useNow(15000);
  const supervisor = can('guerite.supervision');
  const [chain, setChain] = useState(null);
  const [checking, setChecking] = useState(false);
  const [limit, setLimit] = useState(30);
  const events = data.audit || [];
  const total = data.auditCount;
  const today = dayStr(now);
  const st = r => statusOf(r, now);
  const todays = rdvs.filter(r => !r.cancelled && r.slot.date === today);
  const entries = rdvs.filter(r => r.entryAt && dayStr(r.entryAt) === today);
  const ctlTimes = entries.filter(r => r.arrivedAt).map(r => Date.parse(r.entryAt) - Date.parse(r.arrivedAt));
  const avgCtl = ctlTimes.length ? ctlTimes.reduce((a, b) => a + b, 0) / ctlTimes.length : null;
  const arrivedToday = rdvs.filter(r => r.arrivedAt && dayStr(r.arrivedAt) === today);
  const onTime = arrivedToday.filter(r => punctuality(r, Date.parse(r.arrivedAt)).tone === 'ok').length;
  const frauds = events.filter(e => e.type === 'scan_ko' && dayStr(e.ts) === today).length;
  const rejects = events.filter(e => e.type === 'rejete' && dayStr(e.ts) === today).length;

  const kpis = [
    { label: 'Camions attendus aujourd’hui', value: todays.length, hint: `${todays.filter(r => st(r) === 'confirme').length} encore à venir`, icon: 'truck' },
    { label: 'À la guérite', value: rdvs.filter(r => ['controle', 'bloque'].includes(st(r))).length, hint: `${rdvs.filter(r => st(r) === 'bloque').length} bloqué(s) par un rejet`, icon: 'list-checks', tone: 'warn' },
    { label: 'Dans le port', value: rdvs.filter(r => st(r) === 'au_port').length, hint: 'entrées validées non sorties', icon: 'log-in', tone: 'ok' },
    { label: 'Sortis aujourd’hui', value: rdvs.filter(r => r.exitAt && dayStr(r.exitAt) === today).length, hint: 'passages clôturés', icon: 'log-out' },
    { label: 'Temps moyen de contrôle', value: avgCtl != null ? Math.round(avgCtl / 60000) : '—', unit: avgCtl != null ? 'min' : null, hint: 'du scan à l’ouverture', icon: 'timer' },
    { label: 'Ponctualité', value: arrivedToday.length ? Math.round((onTime / arrivedToday.length) * 100) : '—', unit: arrivedToday.length ? '%' : null, hint: `${onTime}/${arrivedToday.length} dans le créneau (±15 min)`, icon: 'clock' },
    { label: 'Rejets de documents', value: rejects, hint: 'aujourd’hui', icon: 'file-x', tone: rejects ? 'bad' : 'neutral' },
    { label: 'QR refusés', value: frauds, hint: 'signature invalide ou QR périmé', icon: 'shield-x', tone: frauds ? 'bad' : 'neutral' },
  ];

  const sorted = useMemo(() => [...events].sort((a, b) => b.seq - a.seq), [events]);
  const check = async () => {
    setChecking(true);
    try {
      const res = await gate.chain();
      if (!res.ok) { notify(res.error, 'bad'); return; }
      setChain({ ...res.chain, checkedAt: Date.now() });
    } finally { setChecking(false); }
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Supervision" subtitle={`${cap(fmtDayLong(now))} · indicateurs de la porte principale`} className="mb-0" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {kpis.map(k => <StatCard key={k.label} {...k} />)}
      </div>

      <Card>
        <SectionTitle icon="history" aside={supervisor && (
          <a href={gate.csvUrl()} download className={buttonClass({ variant: 'secondary', size: 'sm' })}><Icon name="file-down" size={16} /> Exporter le journal (CSV)</a>
        )}>Journal des passages</SectionTitle>
        <div className={cn('mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border px-4 py-3',
          chain ? (chain.ok ? 'border-emerald-200 bg-emerald-50' : 'border-rose-300 bg-rose-50') : 'border-slate-200 bg-slate-50')}>
          <div className="min-w-0">
            <p className="flex items-center gap-2 text-sm font-semibold text-slate-900"><Icon name="link-2" size={18} /> Journal chaîné HMAC-SHA-256 · {total ?? events.length} événements</p>
            <p className="mt-0.5 text-[13px] text-slate-600" role="status">
              {chain
                ? chain.ok
                  ? `Intégrité vérifiée par le serveur à ${fmtTimeS(chain.checkedAt)} · ${chain.count} événements · dernier sceau ${(chain.last || '').slice(0, 16)}…`
                  : `Rupture de chaîne détectée à l’événement n° ${chain.at}`
                : 'Chaque événement contient le sceau du précédent : une modification a posteriori casse la chaîne.'}
            </p>
          </div>
          <Button size="sm" variant={chain?.ok ? 'ghost' : 'secondary'} icon={chain ? (chain.ok ? 'shield-check' : 'shield-x') : 'shield'} loading={checking} onClick={check}>
            {checking ? 'Vérification…' : chain?.ok ? 'Intègre · revérifier' : 'Vérifier l’intégrité'}
          </Button>
        </div>
        <ul className="flex flex-col divide-y divide-slate-100">
          {sorted.slice(0, limit).map(e => {
            const ev = EVENT[e.type] || { label: e.type, icon: 'circle', tone: 'neutral' };
            return (
              <li key={e.seq} className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-x-3 gap-y-1 py-3 sm:grid-cols-[64px_auto_minmax(0,1fr)_auto]">
                <span className="hidden pt-1.5 text-xs tabular-nums text-slate-500 sm:block">{dayStr(e.ts) === today ? fmtTime(e.ts) : `${relDay(dayStr(e.ts)).slice(0, 4)} ${fmtTime(e.ts)}`}</span>
                <span className={cn('flex h-8 w-8 items-center justify-center rounded-full ring-1 ring-inset', LOG_TONE[ev.tone] || LOG_TONE.neutral)}><Icon name={ev.icon} size={16} /></span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-slate-900">{ev.label}</span>
                  <span className="flex flex-wrap gap-x-2 text-[13px] text-slate-500">
                    <span className="sm:hidden">{fmtTime(e.ts)}</span>
                    {e.rdv && <span className="font-mono">{e.rdv}</span>}<span>{e.actor}</span>{e.detail && <span>{e.detail}</span>}
                  </span>
                </span>
                <span title={`Sceau ${e.hash}`} className="col-start-2 font-mono text-[11px] text-slate-400 sm:col-start-auto sm:pt-1.5">#{e.seq} · {String(e.hash).slice(0, 8)}</span>
              </li>
            );
          })}
        </ul>
        {sorted.length > limit && <div className="mt-3"><Button variant="ghost" size="sm" icon="chevron-down" onClick={() => setLimit(l => l + 40)}>Afficher plus</Button></div>}
      </Card>
      <DemoBanner />
    </div>
  );
}
