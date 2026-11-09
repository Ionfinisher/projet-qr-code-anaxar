import { useEffect, useMemo, useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import { TransporteurLayout } from '@/Layouts/TransporteurLayout';
import {
    Badge,
    Button,
    Drawer,
    EmptyState,
    PageHeader,
    SearchInput,
    buttonClass,
} from '@/Components/ui';
import { cn } from '@/Lib/cn';
import { fmtAgo, fmtDateTime, fmtDayNum, fmtInt } from '@/Lib/domain';
import DemandeDetail from './DemandeDetail';
import CancelDialog from './CancelDialog';
import { opLabel, statusMeta, terminalLabel } from './status';

const TABS = [
    { key: 'all', label: 'Toutes' },
    { key: 'validee', label: 'Validées' },
    { key: 'rejetee', label: 'Rejetées' },
    { key: 'annulee', label: 'Annulées' },
];

const MONTH = new Intl.DateTimeFormat('fr-FR', { month: 'short', timeZone: 'UTC' });
const monthShort = (date) => {
    try {
        return MONTH.format(new Date(`${date}T12:00:00Z`)).replace('.', '');
    } catch (e) {
        return '';
    }
};

function DemandeRow({ d, now, current, onClick }) {
    const meta = statusMeta(d.status);

    return (
        <button
            type="button"
            onClick={onClick}
            aria-current={current ? 'true' : undefined}
            className={cn(
                'flex w-full cursor-pointer items-center gap-3 rounded-2xl border bg-white px-3.5 py-3 text-left shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 sm:gap-4 sm:px-4',
                current
                    ? 'border-brand-500 ring-2 ring-brand-500/20 bg-brand-50/20 shadow-sm'
                    : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
            )}
        >
            <span className="flex w-14 shrink-0 flex-col items-center rounded-xl bg-slate-100 py-1.5">
                <strong className="text-lg font-bold tabular-nums leading-tight text-slate-900">
                    {d.slot?.date ? fmtDayNum(`${d.slot.date}T12:00:00Z`) : '--'}
                </strong>
                <span className="text-xs text-slate-500 capitalize">
                    {d.slot?.date ? monthShort(d.slot.date) : ''}
                </span>
            </span>

            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                    <span className="font-mono text-sm font-semibold text-slate-900">{d.reference}</span>
                    <span className="text-sm font-semibold tabular-nums text-slate-700">
                        {d.slot?.start}–{d.slot?.end}
                    </span>
                </span>
                <span className="text-sm text-slate-600">
                    {opLabel(d.operation)} · {terminalLabel(d.terminal)} · {d.trucks_count} camion{d.trucks_count > 1 ? 's' : ''}
                </span>
                <span className="text-xs text-slate-500">
                    {d.updated_at ? `Mise à jour ${fmtAgo(d.updated_at, now)}` : `Envoyée le ${fmtDateTime(d.submitted_at)}`}
                </span>
            </span>

            <span className="shrink-0">
                <Badge tone={meta.tone} icon={meta.icon}>{meta.label}</Badge>
            </span>
        </button>
    );
}

export default function Index({ demandes, counts, filters, selected }) {
    const [query, setQuery] = useState(filters.q || '');
    const [cancelTarget, setCancelTarget] = useState(null);
    const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
    const now = Date.now();

    // Debounced search input
    useEffect(() => {
        if (query === (filters.q || '')) return undefined;

        const timer = setTimeout(() => {
            router.get(
                route('transporteur.demandes.index'),
                { status: filters.status, q: query || undefined },
                { preserveState: true, preserveScroll: true, replace: true },
            );
        }, 350);

        return () => clearTimeout(timer);
    }, [query, filters.q, filters.status]);

    // Active reference (first item in list selected by default if none specified)
    const activeRef = useMemo(() => {
        const target = filters.demande || selected?.reference;
        if (target && demandes.data.some((d) => d.reference === target)) {
            return target;
        }
        return demandes.data[0]?.reference || selected?.reference || null;
    }, [filters.demande, selected, demandes.data]);

    const handleSelectDemande = (reference, openMobile = true) => {
        if (openMobile) {
            setMobileDrawerOpen(true);
        }
        router.get(
            route('transporteur.demandes.index'),
            { status: filters.status, q: filters.q || undefined, demande: reference },
            { preserveState: true, preserveScroll: true, replace: true },
        );
    };

    const handleCloseDrawer = () => {
        setMobileDrawerOpen(false);
    };

    const activeDemande = useMemo(() => {
        if (selected && selected.reference === activeRef) {
            return selected;
        }
        return null;
    }, [selected, activeRef]);

    const detailActions = activeDemande ? (
        <div className="flex flex-wrap items-center gap-2">
            {activeDemande.can_modify ? (
                <Button
                    variant="secondary"
                    size="sm"
                    icon="pencil"
                    onClick={() => router.get(route('transporteur.demandes.edit', activeDemande.reference))}
                >
                    Modifier
                </Button>
            ) : null}
            {activeDemande.can_cancel ? (
                <Button
                    variant="danger-outline"
                    size="sm"
                    icon="calendar-x"
                    onClick={() => setCancelTarget(activeDemande.reference)}
                >
                    Annuler
                </Button>
            ) : null}
        </div>
    ) : null;

    return (
        <TransporteurLayout inertia>
            <Head title="Demandes de rendez-vous" />

            <PageHeader
                title="Demandes de rendez-vous"
                subtitle="Chaque demande est validée par l’administration du port avant l’émission des QR codes."
                actions={(
                    <>
                        <Link href={route('transporteur.creneaux.index')} className={buttonClass({ variant: 'secondary' })}>
                            Voir les créneaux
                        </Link>
                        <Link href={route('transporteur.demandes.create')} className={buttonClass({ variant: 'primary' })}>
                            Nouvelle demande
                        </Link>
                    </>
                )}
            />

            <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex flex-wrap items-center gap-1.5" role="tablist" aria-label="Filtrer par statut">
                    {TABS.map((tab) => {
                        const active = (filters.status || 'all') === tab.key;

                        return (
                            <Link
                                key={tab.key}
                                href={route('transporteur.demandes.index', { status: tab.key, q: filters.q || undefined })}
                                preserveScroll
                                className={buttonClass({ variant: active ? 'dark' : 'ghost', size: 'sm' })}
                                role="tab"
                                aria-selected={active}
                            >
                                {tab.label}
                                <span className={active ? 'ml-1.5 rounded-full bg-white/15 px-1.5 text-xs' : 'ml-1.5 rounded-full bg-slate-200 px-1.5 text-xs text-slate-600'}>
                                    {fmtInt(counts[tab.key] || 0)}
                                </span>
                            </Link>
                        );
                    })}
                </div>

                <SearchInput
                    value={query}
                    onChange={setQuery}
                    placeholder="Référence, conteneur, tracteur, chauffeur…"
                    className="w-full lg:w-80"
                />
            </div>

            {demandes.data.length === 0 ? (
                <EmptyState
                    icon="calendar-days"
                    title={filters.q ? 'Aucune demande ne correspond à votre recherche' : 'Aucune demande pour le moment'}
                    action={(
                        <Link href={route('transporteur.demandes.create')} className={buttonClass({ variant: 'primary' })}>
                            Créer une demande
                        </Link>
                    )}
                >
                    {filters.q
                        ? 'Essayez une autre référence, un numéro de conteneur ou un nom de chauffeur.'
                        : 'Réservez un créneau et déclarez vos camions en quelques minutes.'}
                </EmptyState>
            ) : (
                <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(340px,440px)_minmax(0,1fr)]">
                    {/* Colonne de gauche : liste des demandes + pagination */}
                    <div className="flex flex-col gap-2.5">
                        {demandes.data.map((d) => (
                            <DemandeRow
                                key={d.reference}
                                d={d}
                                now={now}
                                current={d.reference === activeRef}
                                onClick={() => handleSelectDemande(d.reference, true)}
                            />
                        ))}

                        {demandes.total > 0 ? (
                            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-slate-500">
                                <p>
                                    <strong className="font-medium text-slate-700">{fmtInt(demandes.from || 0)}</strong> à{' '}
                                    <strong className="font-medium text-slate-700">{fmtInt(demandes.to || 0)}</strong> sur{' '}
                                    <strong className="font-medium text-slate-700">{fmtInt(demandes.total)}</strong>.
                                </p>
                                <div className="flex items-center gap-2">
                                    <Button
                                        size="sm"
                                        variant="secondary"
                                        icon="chevron-left"
                                        disabled={!demandes.prev_page_url}
                                        onClick={() => router.visit(demandes.prev_page_url, { preserveState: true, preserveScroll: true })}
                                    >
                                        Précédent
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="secondary"
                                        iconRight="chevron-right"
                                        disabled={!demandes.next_page_url}
                                        onClick={() => router.visit(demandes.next_page_url, { preserveState: true, preserveScroll: true })}
                                    >
                                        Suivant
                                    </Button>
                                </div>
                            </div>
                        ) : null}
                    </div>

                    {/* Colonne de droite (Desktop) : Détail complet sticky */}
                    <div className="hidden lg:sticky lg:top-20 lg:block lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto">
                        {activeDemande ? (
                            <DemandeDetail demande={activeDemande} actions={detailActions} />
                        ) : (
                            <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
                                Sélectionnez une demande dans la liste pour afficher ses détails, ses camions et ses documents.
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Tiroir coulissant latéral pour affichage mobile (< lg) */}
            <Drawer
                open={mobileDrawerOpen && Boolean(activeDemande)}
                onClose={handleCloseDrawer}
                title={activeDemande ? `Demande ${activeDemande.reference}` : 'Détail de la demande'}
                description={activeDemande ? `${opLabel(activeDemande.operation)} · ${terminalLabel(activeDemande.terminal)}` : undefined}
                size="lg"
                footer={activeDemande ? (
                    <>
                        <Button variant="secondary" onClick={handleCloseDrawer}>Fermer</Button>
                        {activeDemande.can_modify ? (
                            <Button
                                variant="secondary"
                                icon="pencil"
                                onClick={() => router.get(route('transporteur.demandes.edit', activeDemande.reference))}
                            >
                                Modifier
                            </Button>
                        ) : null}
                        {activeDemande.can_cancel ? (
                            <Button variant="danger-outline" icon="calendar-x" onClick={() => setCancelTarget(activeDemande.reference)}>
                                Annuler
                            </Button>
                        ) : null}
                    </>
                ) : null}
            >
                {activeDemande ? <DemandeDetail demande={activeDemande} /> : null}
            </Drawer>

            {cancelTarget ? (
                <CancelDialog key={cancelTarget} reference={cancelTarget} onClose={() => setCancelTarget(null)} />
            ) : null}
        </TransporteurLayout>
    );
}