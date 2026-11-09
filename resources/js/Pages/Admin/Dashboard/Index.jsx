import { Head, Link } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Card, EmptyState, Icon, Meter, PageHeader, SectionTitle, StatCard } from '@/Components/ui';
import { OPS } from '@/Lib/domain';
import { cn } from '@/Lib/cn';

const DATE_FORMAT = new Intl.DateTimeFormat('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'Africa/Lome',
});

function QueueRow({ href, children }) {
    return (
        <Link
            href={href}
            className="flex w-full items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-left transition-colors hover:border-slate-300 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
        >
            {children}
        </Link>
    );
}

function formatSlotDate(date) {
    return new Intl.DateTimeFormat('fr-FR', {
        day: 'numeric',
        month: 'short',
        timeZone: 'Africa/Lome',
    }).format(new Date(`${date}T12:00:00Z`));
}

export default function Index({
    auth,
    stats = {},
    pendingRegistrations = [],
    pendingDemandes = [],
    slots = [],
    today,
}) {
    const userName = auth?.user?.name || 'administrateur';
    const todayLabel = DATE_FORMAT.format(new Date(`${today}T12:00:00Z`));
    const trucksPending = pendingDemandes.reduce(
        (total, demande) => total + (demande.trucks_count || 0),
        0
    );

    return (
        <AuthenticatedLayout user={auth?.user}>
            <Head title="Tableau de bord administrateur" />

            <div className="flex flex-col gap-6">
                <PageHeader
                    eyebrow="Administration du port"
                    title={`Bonjour ${userName}`}
                    subtitle={`${todayLabel} · heure de Lomé (UTC)`}
                    className="mb-0"
                />

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    <Link href={route('admin.registrations.index')} className="block">
                        <StatCard
                            label="Inscriptions à traiter"
                            value={stats.pending_registrations || 0}
                            hint={stats.pending_registrations ? 'Dossiers en attente' : 'Aucune en attente'}
                            icon="user-check"
                            tone={stats.pending_registrations ? 'warn' : 'neutral'}
                            className={cn(
                                stats.pending_registrations && 'border-amber-200 bg-amber-50/40'
                            )}
                        />
                    </Link>
                    <Link href={route('admin.demandes.index')} className="block">
                        <StatCard
                            label="Demandes de RDV à traiter"
                            value={stats.pending_demandes || 0}
                            hint={`${trucksPending} camion${trucksPending === 1 ? '' : 's'} concerné${trucksPending === 1 ? '' : 's'}`}
                            icon="calendar-clock"
                            tone={stats.pending_demandes ? 'warn' : 'neutral'}
                            className={cn(
                                stats.pending_demandes && 'border-amber-200 bg-amber-50/40'
                            )}
                        />
                    </Link>
                    <Link href={route('admin.rdv.index')} className="block">
                        <StatCard
                            label="Camions attendus aujourd’hui"
                            value={stats.today_appointments || 0}
                            hint="Rendez-vous validés"
                            icon="truck"
                        />
                    </Link>
                    <Link href={route('admin.creneaux.index')} className="block">
                        <StatCard
                            label="Remplissage des créneaux"
                            value={stats.today_rate || 0}
                            unit="%"
                            hint={`${stats.today_used || 0} / ${stats.today_capacity || 0} places aujourd’hui`}
                            icon="calendar-days"
                        />
                    </Link>
                </div>

                <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
                    <Card>
                        <SectionTitle icon="list-todo">À traiter</SectionTitle>

                        <section aria-label="Demandes de rendez-vous en attente">
                            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                                Demandes de rendez-vous · par créneau
                            </p>
                            {pendingDemandes.length === 0 ? (
                                <p className="text-sm text-slate-500">Aucune demande en attente.</p>
                            ) : (
                                <div className="flex flex-col gap-2">
                                    {pendingDemandes.map((demande) => (
                                        <QueueRow
                                            key={demande.reference}
                                            href={route('admin.demandes.index', {
                                                id: demande.reference,
                                            })}
                                        >
                                            <span className="flex w-16 shrink-0 flex-col items-center rounded-lg bg-slate-100 py-1.5 leading-tight">
                                                <b className="text-sm tabular-nums text-slate-900">
                                                    {demande.slot?.start || '—'}
                                                </b>
                                                <small className="text-[11px] text-slate-500">
                                                    {demande.slot
                                                        ? formatSlotDate(demande.slot.date)
                                                        : 'Sans créneau'}
                                                </small>
                                            </span>
                                            <span className="min-w-0 flex-1">
                                                <b className="block truncate text-sm font-semibold text-slate-900">
                                                    {demande.owner}
                                                </b>
                                                <small className="block truncate text-[13px] text-slate-500">
                                                    <span className="font-mono">{demande.reference}</span>
                                                    {' · '}
                                                    {demande.trucks_count || 0} camion
                                                    {(demande.trucks_count || 0) === 1 ? '' : 's'}
                                                    {' · '}
                                                    {OPS[demande.operation]?.short || demande.operation}
                                                </small>
                                            </span>
                                            <Icon name="chevron-right" size={17} className="text-slate-400" />
                                        </QueueRow>
                                    ))}
                                </div>
                            )}
                        </section>

                        <section aria-label="Inscriptions en attente" className="mt-6">
                            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                                Inscriptions · les plus récentes
                            </p>
                            {pendingRegistrations.length === 0 ? (
                                <p className="text-sm text-slate-500">Aucune inscription en attente.</p>
                            ) : (
                                <div className="flex flex-col gap-2">
                                    {pendingRegistrations.map((registration) => (
                                        <QueueRow
                                            key={registration.id}
                                            href={route('admin.registrations.show', registration.id)}
                                        >
                                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                                                <Icon name="user-check" size={18} />
                                            </span>
                                            <span className="min-w-0 flex-1">
                                                <b className="block truncate text-sm font-semibold text-slate-900">
                                                    {registration.name || 'Demandeur sans nom'}
                                                </b>
                                                <small className="block truncate text-[13px] text-slate-500">
                                                    <span className="font-mono">
                                                        {registration.numero_dossier}
                                                    </span>
                                                </small>
                                            </span>
                                            <Icon name="chevron-right" size={17} className="text-slate-400" />
                                        </QueueRow>
                                    ))}
                                </div>
                            )}
                        </section>
                    </Card>

                    <Card>
                        <SectionTitle
                            icon="calendar-days"
                            aside={
                                <Link
                                    href={route('admin.creneaux.index')}
                                    className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-sm font-medium text-brand-700 hover:bg-brand-50"
                                >
                                    Tous les créneaux <Icon name="arrow-right" size={16} />
                                </Link>
                            }
                        >
                            Créneaux d’aujourd’hui
                        </SectionTitle>
                        {slots.length === 0 ? (
                            <EmptyState
                                icon="calendar-x"
                                title="Aucun créneau aujourd’hui"
                                className="py-8"
                            />
                        ) : (
                            <ul className="flex flex-col divide-y divide-slate-100">
                                {slots.map((slot) => (
                                    <li
                                        key={slot.id}
                                        className="grid grid-cols-[96px_1fr_auto] items-center gap-3 py-2.5"
                                    >
                                        <span className="text-sm font-semibold tabular-nums text-slate-900">
                                            {slot.start}–{slot.end}
                                        </span>
                                        <Meter
                                            rate={slot.rate}
                                            closed={!slot.open}
                                            label={`${slot.used} sur ${slot.capacity} places`}
                                        />
                                        <span className="text-right text-sm tabular-nums text-slate-600">
                                            {slot.open ? `${slot.used}/${slot.capacity}` : 'Fermé'}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </Card>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
