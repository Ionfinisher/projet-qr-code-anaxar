import { useEffect, useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import { TransporteurLayout } from '@/Layouts/TransporteurLayout';
import {
    Badge,
    Button,
    DataTable,
    Drawer,
    EmptyState,
    IconButton,
    PageHeader,
    SearchInput,
    buttonClass,
} from '@/Components/ui';
import { fmtDateTime, fmtDayLong, fmtInt } from '@/Lib/domain';
import DemandeDetail from './DemandeDetail';
import CancelDialog from './CancelDialog';
import { opLabel, statusMeta, terminalLabel } from './status';

const TABS = [
    { key: 'all', label: 'Toutes' },
    { key: 'en_attente', label: 'En attente' },
    { key: 'validee', label: 'Validées' },
    { key: 'rejetee', label: 'Rejetées' },
    { key: 'annulee', label: 'Annulées' },
];

export default function Index({ demandes, counts, filters, selected }) {
    const [query, setQuery] = useState(filters.q || '');
    const [cancelTarget, setCancelTarget] = useState(null);

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

    const openDetail = (reference) => {
        router.get(
            route('transporteur.demandes.index'),
            { status: filters.status, q: filters.q || undefined, demande: reference },
            { preserveState: true, preserveScroll: true, replace: true },
        );
    };

    const closeDetail = () => {
        router.get(
            route('transporteur.demandes.index'),
            { status: filters.status, q: filters.q || undefined },
            { preserveState: true, preserveScroll: true, replace: true },
        );
    };

    const columns = [
        {
            key: 'reference',
            header: 'Référence',
            render: (row) => (
                <div>
                    <p className="font-semibold text-slate-900">{row.reference}</p>
                    <p className="text-xs text-slate-500">Envoyée le {fmtDateTime(row.submitted_at)}</p>
                </div>
            ),
        },
        {
            key: 'operation',
            header: 'Opération',
            render: (row) => (
                <div>
                    <p className="font-medium text-slate-800">{opLabel(row.operation)}</p>
                    <p className="text-xs text-slate-500">{terminalLabel(row.terminal)}</p>
                </div>
            ),
        },
        {
            key: 'slot',
            header: 'Créneau',
            render: (row) => (
                <div>
                    <p className="font-medium text-slate-800">{fmtDayLong(`${row.slot.date}T12:00:00Z`)}</p>
                    <p className="text-xs text-slate-500">{row.slot.start}–{row.slot.end}</p>
                </div>
            ),
        },
        {
            key: 'trucks',
            header: 'Camions',
            render: (row) => (
                <Badge tone="neutral" icon="truck">
                    {fmtInt(row.trucks_count)} camion{row.trucks_count > 1 ? 's' : ''}
                </Badge>
            ),
        },
        {
            key: 'status',
            header: 'Statut',
            render: (row) => {
                const meta = statusMeta(row.status);

                return <Badge tone={meta.tone} icon={meta.icon}>{meta.label}</Badge>;
            },
        },
        {
            key: 'actions',
            header: 'Actions',
            headerClassName: 'text-right',
            className: 'text-right',
            render: (row) => (
                <div className="flex justify-end gap-1" onClick={(event) => event.stopPropagation()}>
                    <IconButton icon="eye" label={`Voir ${row.reference}`} onClick={() => openDetail(row.reference)} />
                    {row.can_modify ? (
                        <IconButton
                            icon="pencil"
                            label={`Modifier ${row.reference}`}
                            onClick={() => router.get(route('transporteur.demandes.edit', row.reference))}
                        />
                    ) : null}
                    {row.can_cancel ? (
                        <IconButton
                            icon="calendar-x"
                            label={`Annuler ${row.reference}`}
                            variant="danger"
                            onClick={() => setCancelTarget(row.reference)}
                        />
                    ) : null}
                </div>
            ),
        },
    ];

    return (
        <TransporteurLayout inertia>
            <Head title="Mes demandes de RDV" />

            <PageHeader
                eyebrow="Transporteur"
                title="Mes demandes de rendez-vous"
                subtitle="Suivez vos demandes, consultez leur statut et gérez vos camions."
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
                        const active = filters.status === tab.key;

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

            <DataTable
                columns={columns}
                rows={demandes.data}
                rowKey={(row) => row.reference}
                onRowClick={(row) => openDetail(row.reference)}
                caption="Liste de vos demandes de rendez-vous"
                empty={(
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
                )}
            />

            {demandes.total > 0 ? (
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-slate-500">
                    <p>
                        Affichage de <strong className="font-medium text-slate-700">{fmtInt(demandes.from || 0)}</strong> à{' '}
                        <strong className="font-medium text-slate-700">{fmtInt(demandes.to || 0)}</strong> sur{' '}
                        <strong className="font-medium text-slate-700">{fmtInt(demandes.total)}</strong> demande{demandes.total > 1 ? 's' : ''}.
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

            <Drawer
                open={Boolean(selected)}
                onClose={closeDetail}
                title={selected ? `Demande ${selected.reference}` : 'Détail de la demande'}
                description={selected ? `${opLabel(selected.operation)} · ${terminalLabel(selected.terminal)}` : undefined}
                size="lg"
                footer={selected ? (
                    <>
                        <Button variant="secondary" onClick={closeDetail}>Fermer</Button>
                        {selected.can_modify ? (
                            <Button
                                variant="secondary"
                                icon="pencil"
                                onClick={() => router.get(route('transporteur.demandes.edit', selected.reference))}
                            >
                                Modifier
                            </Button>
                        ) : null}
                        {selected.can_cancel ? (
                            <Button variant="danger-outline" icon="calendar-x" onClick={() => setCancelTarget(selected.reference)}>
                                Annuler
                            </Button>
                        ) : null}
                    </>
                ) : null}
            >
                {selected ? <DemandeDetail demande={selected} /> : null}
            </Drawer>

            {cancelTarget ? (
                <CancelDialog key={cancelTarget} reference={cancelTarget} onClose={() => setCancelTarget(null)} />
            ) : null}
        </TransporteurLayout>
    );
}
