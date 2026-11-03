// Tableau de bord : indicateurs du jour, dossiers à traiter, remplissage des créneaux.
import { ACCOUNT_KINDS, OPS, slotRange, slotUsage, statusOf, dayStr, relDay, fmtDayLong, fmtAgo, fmtInt, accountName, insName } from '../../../lib/domain.js';
import { CHANNELS } from '../../../lib/messages.js';
import { useNav, AppLink } from '../../../lib/navigation.jsx';
import { usePortFlow, useCurrentUser } from '../../../providers/PortFlowProvider.jsx';
import { useNow } from '../../../hooks/useNow.js';
import { Card, SectionTitle, StatCard, Meter, EmptyState, Icon, PageHeader, buttonClass } from '../../../components/ui/index.js';
import { UrgencyBadge } from '../components/Parts.jsx';
import { cap, ownerOf, pendingDemandes, pendingInscriptions, plural } from '../selectors.js';
import { cn } from '../../../lib/cn.js';

function QueueRow({ onClick, children }) {
  return (
    <button type="button" onClick={onClick}
      className="flex w-full cursor-pointer items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-left transition-colors hover:border-slate-300 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500">
      {children}
    </button>
  );
}

export function DashboardPage() {
  const { data } = usePortFlow();
  const { user, can } = useCurrentUser();
  const nav = useNav();
  const now = useNow(30000);
  const today = dayStr(now);
  const pendIns = pendingInscriptions(data);
  const pendDem = pendingDemandes(data);
  const todays = data.rdvs.filter(r => r.validation === 'approved' && !r.cancelled && r.slot.date === today);
  const inPort = data.rdvs.filter(r => statusOf(r, now) === 'au_port').length;
  const slotsToday = data.slots.filter(x => x.date === today).sort((a, b) => a.start.localeCompare(b.start));
  const capToday = slotsToday.filter(x => x.open).reduce((a, x) => a + x.capacity, 0);
  const usedToday = slotsToday.filter(x => x.open).reduce((a, x) => a + slotUsage(x, data.rdvs).used, 0);
  const msgs24 = data.messages.filter(m => now - Date.parse(m.at) < 86400000);
  const trucksPending = pendDem.reduce((a, d) => a + d.rdvIds.length, 0);

  const kpis = [
    can('inscriptions.consulter') && { route: 'admin.inscriptions', label: 'Inscriptions à traiter', value: pendIns.length, icon: 'user-check',
      hint: pendIns[0] ? `la plus ancienne ${fmtAgo(pendIns[0].submittedAt, now)}` : 'aucune en attente', tone: pendIns.length ? 'warn' : 'neutral' },
    can('demandes.consulter') && { route: 'admin.demandes', label: 'Demandes de RDV à traiter', value: pendDem.length, icon: 'calendar-clock',
      hint: `${trucksPending} ${plural(trucksPending, 'camion')} ${plural(trucksPending, 'concerné')}`, tone: pendDem.length ? 'warn' : 'neutral' },
    { route: can('demandes.consulter') ? 'admin.demandes' : null, label: 'Camions attendus aujourd’hui', value: todays.length, icon: 'truck', hint: `${inPort} dans le port` },
    can('creneaux.consulter') && { route: 'admin.creneaux', label: 'Remplissage des créneaux', value: capToday ? Math.round((usedToday / capToday) * 100) : 0, unit: '%', icon: 'calendar-days',
      hint: `${fmtInt(usedToday)} / ${fmtInt(capToday)} places aujourd’hui` },
    can('messagerie.consulter') && { route: 'admin.messagerie', label: 'Messages envoyés (24 h)', value: msgs24.length, icon: 'mail',
      hint: Object.keys(CHANNELS).map(c => `${msgs24.filter(m => m.channel === c).length} ${CHANNELS[c].label.toLowerCase()}`).join(' · ') },
  ].filter(Boolean);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader eyebrow="Administration du port" title={`Bonjour ${user?.first || ''}`} subtitle={`${cap(fmtDayLong(now))} · heure de Lomé (UTC)`} className="mb-0" />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-[repeat(auto-fit,minmax(200px,1fr))]">
        {kpis.map(k => (
          <StatCard key={k.label} label={k.label} value={k.value} unit={k.unit} hint={k.hint} icon={k.icon} tone={k.tone}
            onClick={k.route ? () => nav.go(k.route) : undefined}
            className={cn(k.tone === 'warn' && 'border-amber-200 bg-amber-50/40')} />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
        <Card>
          <SectionTitle icon="list-todo">À traiter</SectionTitle>
          {can('demandes.consulter') && (
            <section aria-label="Demandes de rendez-vous en attente">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Demandes de rendez-vous · par créneau</p>
              {pendDem.length === 0 ? <p className="text-sm text-slate-500">Aucune demande en attente.</p> : (
                <div className="flex flex-col gap-2">
                  {pendDem.slice(0, 6).map(d => (
                    <QueueRow key={d.id} onClick={() => nav.go('admin.demandes.detail', { id: d.id })}>
                      <span className="flex w-16 shrink-0 flex-col items-center rounded-lg bg-slate-100 py-1.5 leading-tight">
                        <b className="text-sm tabular-nums text-slate-900">{d.slot.start}</b>
                        <small className="text-[11px] text-slate-500">{relDay(d.slot.date, today).replace('Aujourd’hui', 'Auj.')}</small>
                      </span>
                      <span className="min-w-0 flex-1">
                        <b className="block truncate text-sm font-semibold text-slate-900">{accountName(ownerOf(data, d.ownerId))}</b>
                        <small className="block truncate text-[13px] text-slate-500"><span className="font-mono">{d.id}</span> · {d.rdvIds.length} {plural(d.rdvIds.length, 'camion')} · {OPS[d.op]?.short}</small>
                        <span className="mt-1.5 flex sm:hidden"><UrgencyBadge demande={d} now={now} size="sm" /></span>
                      </span>
                      <span className="hidden shrink-0 sm:block"><UrgencyBadge demande={d} now={now} /></span>
                    </QueueRow>
                  ))}
                </div>
              )}
            </section>
          )}
          {can('inscriptions.consulter') && (
            <section aria-label="Inscriptions en attente" className={can('demandes.consulter') ? 'mt-6' : ''}>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Inscriptions · les plus anciennes d’abord</p>
              {pendIns.length === 0 ? <p className="text-sm text-slate-500">Aucune inscription en attente.</p> : (
                <div className="flex flex-col gap-2">
                  {pendIns.slice(0, 5).map(i => (
                    <QueueRow key={i.id} onClick={() => nav.go('admin.inscriptions.detail', { id: i.id })}>
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600"><Icon name={ACCOUNT_KINDS[i.kind]?.icon} size={18} /></span>
                      <span className="min-w-0 flex-1">
                        <b className="block truncate text-sm font-semibold text-slate-900">{insName(i)}</b>
                        <small className="block truncate text-[13px] text-slate-500"><span className="font-mono">{i.id}</span> · {ACCOUNT_KINDS[i.kind]?.short}</small>
                      </span>
                      <span className="shrink-0 text-xs text-slate-500">{fmtAgo(i.submittedAt, now)}</span>
                    </QueueRow>
                  ))}
                </div>
              )}
            </section>
          )}
          {!can('demandes.consulter') && !can('inscriptions.consulter') && <p className="text-sm text-slate-500">Aucun dossier à traiter pour votre profil.</p>}
        </Card>

        {can('creneaux.consulter') && (
          <Card>
            <SectionTitle icon="calendar-days" aside={
              <AppLink to="admin.creneaux" className={buttonClass({ variant: 'ghost', size: 'sm' })}>Tous les créneaux <Icon name="arrow-right" size={16} /></AppLink>
            }>Créneaux d’aujourd’hui</SectionTitle>
            {slotsToday.length === 0 ? <EmptyState icon="calendar-x" title="Aucun créneau aujourd’hui" className="py-8" /> : (
              <ul className="flex flex-col divide-y divide-slate-100">
                {slotsToday.map(x => {
                  const u = slotUsage(x, data.rdvs);
                  const past = slotRange(x).end.getTime() < now;
                  return (
                    <li key={x.id} className={cn('grid grid-cols-[96px_1fr_auto] items-center gap-3 py-2.5', past && 'opacity-50')}>
                      <span className="text-sm font-semibold tabular-nums text-slate-900">{x.start}–{x.end}</span>
                      <Meter rate={u.rate} closed={!x.open} label={`${u.used} sur ${x.capacity} places`} />
                      <span className="text-right text-sm tabular-nums text-slate-600">{x.open ? `${u.used}/${x.capacity}` : 'Fermé'}</span>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
        )}
      </div>
    </div>
  );
}
