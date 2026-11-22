import { useMemo } from 'react';
import { Head, Link } from '@inertiajs/react';
import { TransporteurLayout } from '@/Layouts/TransporteurLayout';
import { Badge, Card, EmptyState, Meter, PageHeader, buttonClass } from '@/Components/ui';
import { fmtDayLong, fmtDayShort, fmtInt } from '@/Lib/domain';
import { cn } from '@/Lib/cn';

function slotBadge(slot) {
    if (!slot.open) return { tone: 'neutral', label: 'Fermé', icon: 'lock' };
    if (slot.past) return { tone: 'neutral', label: 'Passé', icon: 'clock' };
    if (slot.remaining <= 0) return { tone: 'bad', label: 'Complet', icon: 'circle-x' };
    if (slot.remaining <= 3) return { tone: 'warn', label: `${slot.remaining} place${slot.remaining > 1 ? 's' : ''}`, icon: 'triangle-alert' };
    return { tone: 'ok', label: `${slot.remaining} place${slot.remaining > 1 ? 's' : ''}`, icon: 'circle-check' };
}

export default function Index({ slots, terminals = [], selected_terminal_id }) {
    const days = useMemo(() => {
        const map = new Map();

        slots.forEach((slot) => {
            if (!map.has(slot.date)) map.set(slot.date, []);
            map.get(slot.date).push(slot);
        });

        return [...map.entries()];
    }, [slots]);

    const availableCount = slots.filter((slot) => slot.open && !slot.past && slot.remaining > 0).length;

    return (
        <TransporteurLayout inertia>
            <Head title="Créneaux disponibles" />

            <PageHeader
                eyebrow="Transporteur"
                title="Créneaux disponibles"
                subtitle={`${fmtInt(availableCount)} créneau${availableCount > 1 ? 'x' : ''} réservable${availableCount > 1 ? 's' : ''} sur les 14 prochains jours.`}
                actions={(
                    <>
                        <Link href={route('transporteur.demandes.index')} className={buttonClass({ variant: 'secondary' })}>
                            Mes demandes
                        </Link>
                        <Link href={route('transporteur.demandes.create')} className={buttonClass({ variant: 'primary' })}>
                            Nouvelle demande
                        </Link>
                    </>
                )}
            />

            {terminals.length > 0 && (
                <div className="mb-4 flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3">
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 mr-1">
                        Terminal :
                    </span>
                    {terminals.map((t) => {
                        const selected = t.id === selected_terminal_id;
                        return (
                            <Link
                                key={t.id}
                                href={route('transporteur.creneaux.index', { terminal_id: t.id })}
                                preserveState
                                preserveScroll
                                className={cn(
                                    'inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition-all',
                                    selected
                                        ? 'bg-brand-600 text-white shadow-sm ring-1 ring-brand-700'
                                        : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 hover:border-slate-300'
                                )}
                            >
                                <span>{t.code}</span>
                                <span className={cn('text-[11px] font-normal', selected ? 'text-brand-100' : 'text-slate-400')}>
                                    ({t.short})
                                </span>
                            </Link>
                        );
                    })}
                </div>
            )}

            {days.length === 0 ? (
                <EmptyState
                    icon="calendar-days"
                    title="Aucun créneau publié"
                    action={(
                        <Link href={route('transporteur.demandes.index')} className={buttonClass({ variant: 'secondary' })}>
                            Voir mes demandes
                        </Link>
                    )}
                >
                    Les créneaux sont publiés par l’administration. Revenez plus tard ou contactez la guérite.
                </EmptyState>
            ) : (
                <div className="flex flex-col gap-4">
                    {days.map(([date, daySlots]) => (
                        <Card key={date}>
                            <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
                                <h2 className="text-base font-semibold text-slate-900">{fmtDayLong(`${date}T12:00:00Z`)}</h2>
                                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{fmtDayShort(`${date}T12:00:00Z`)}</p>
                            </div>

                            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                                {daySlots.map((slot) => {
                                    const badge = slotBadge(slot);
                                    const available = slot.open && !slot.past && slot.remaining > 0;
                                    const reserveHref = route('transporteur.demandes.create', { date: slot.date, start: slot.start });

                                    return (
                                        <div
                                            key={slot.id}
                                            className={cn(
                                                'flex flex-col gap-3 rounded-xl border p-4',
                                                available ? 'border-slate-200 bg-white' : 'border-slate-200 bg-slate-50',
                                            )}
                                        >
                                            <div className="flex items-start justify-between gap-2">
                                                <div>
                                                    <p className="text-base font-semibold tabular-nums text-slate-900">{slot.start}–{slot.end}</p>
                                                    <p className="text-xs text-slate-500">
                                                        {fmtInt(slot.used)} / {fmtInt(slot.capacity)} camions
                                                    </p>
                                                </div>
                                                <Badge tone={badge.tone} icon={badge.icon} size="sm">{badge.label}</Badge>
                                            </div>

                                            <Meter
                                                rate={slot.rate}
                                                closed={!slot.open}
                                                label={`${slot.used} camions sur ${slot.capacity}`}
                                            />

                                            <div className="flex flex-wrap items-center gap-1.5">
                                                {slot.mine > 0 ? (
                                                    <Badge tone="brand" size="sm" icon="truck">
                                                        Déjà {fmtInt(slot.mine)} camion{slot.mine > 1 ? 's' : ''}
                                                    </Badge>
                                                ) : null}
                                                {!slot.open && slot.close_reason ? (
                                                    <span className="text-xs text-slate-500">{slot.close_reason}</span>
                                                ) : null}
                                                {slot.past && slot.open ? (
                                                    <span className="text-xs text-slate-500">Ce créneau est passé.</span>
                                                ) : null}
                                            </div>

                                            {available ? (
                                                <Link
                                                    href={reserveHref}
                                                    className={buttonClass({ variant: 'primary', size: 'sm', block: true })}
                                                >
                                                    Réserver ce créneau
                                                </Link>
                                            ) : (
                                                <span className={buttonClass({ variant: 'secondary', size: 'sm', block: true, className: 'pointer-events-none opacity-60' })}>
                                                    Indisponible
                                                </span>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </Card>
                    ))}
                </div>
            )}
        </TransporteurLayout>
    );
}
