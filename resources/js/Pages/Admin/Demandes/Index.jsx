import { useMemo, useState, useEffect } from 'react';
import { Head, router } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { PageHeader, SearchInput } from '@/Components/ui/Navigation';
import { Segmented } from '@/Components/ui/Choice';
import { EmptyState } from '@/Components/ui/Feedback';
import { Drawer } from '@/Components/ui/Overlay';
import { StatusTag } from '@/Components/domain';
import {
    OPS,
    TERMINALS,
    DEM_STATUS,
    relDay,
    dayStr,
    fmtAgo,
    accountName,
} from '@/Lib/domain';
import { RecordRow, ListTools, UrgencyBadge } from './DemandesParts';
import { DemandeAdminDetail } from './DemandeAdminDetail';

const DEM_FILTERS = [
    { value: 'en_attente', label: 'À traiter' },
    { value: 'validee', label: 'Validées' },
    { value: 'rejetee', label: 'Rejetées' },
    { value: 'annulee', label: 'Annulées' },
    { value: 'all', label: 'Toutes' },
];

export default function Index({ auth, demandes = [], counts = {}, filters = {}, selected = null }) {
    const [filter, setFilter] = useState(filters.status || 'en_attente');
    const [search, setSearch] = useState(filters.q || '');
    const [selectedId, setSelectedId] = useState(filters.id || selected?.reference || null);

    const now = Date.now();
    const today = dayStr();

    const handleFilterChange = (newStatus) => {
        setFilter(newStatus);
        router.get(
            route('admin.demandes.index'),
            {
                status: newStatus,
                q: search || undefined,
            },
            {
                preserveState: true,
                preserveScroll: true,
                replace: true,
            }
        );
    };

    const handleSearchChange = (query) => {
        setSearch(query);
    };

    const handleSearchSubmit = () => {
        router.get(
            route('admin.demandes.index'),
            {
                status: filter,
                q: search || undefined,
            },
            {
                preserveState: true,
                preserveScroll: true,
                replace: true,
            }
        );
    };

    // Client-side quick filter matching
    const filteredList = useMemo(() => {
        const needle = search.trim().toLowerCase().replace(/\s+/g, '');
        if (!needle) return demandes;

        return demandes.filter((d) => {
            const owner = d.owner ? `${d.owner.name} ${d.owner.company} ${d.owner.email}` : '';
            const trucks = (d.trucks || [])
                .map(
                    (t) =>
                        `${t.container?.number || ''} ${t.vehicle?.tractor || ''} ${t.container?.bl || ''} ${t.driver?.first || ''
                        } ${t.driver?.last || ''}`
                )
                .join(' ');
            const haystack = `${d.reference} ${owner} ${trucks}`.toLowerCase().replace(/\s+/g, '');
            return haystack.includes(needle);
        });
    }, [demandes, search]);

    const activeDemande = useMemo(() => {
        if (!selectedId) return null;
        if (selected && selected.reference === selectedId) return selected;
        return demandes.find((d) => d.reference === selectedId) || selected || null;
    }, [demandes, selectedId, selected]);

    useEffect(() => {
        if (!filteredList.some((item) => item.id === selectedId)) setSelectedId(filteredList[0]?.id || null);
    }, [filteredList, selectedId]);

    selected = filteredList.find((item) => item.id === selectedId) || null;

    const handleSelectDemande = (d) => {
        setSelectedId(d.reference);
        router.get(
            route('admin.demandes.index'),
            {
                status: filter,
                q: search || undefined,
                id: d.reference,
            },
            {
                preserveState: true,
                preserveScroll: true,
                replace: true,
            }
        );
    };

    const handleCloseDrawer = () => {
        setSelectedId(null);
        router.get(
            route('admin.demandes.index'),
            {
                status: filter,
                q: search || undefined,
            },
            {
                preserveState: true,
                preserveScroll: true,
                replace: true,
            }
        );
    };

    const segmentedOptions = DEM_FILTERS.map((f) => ({
        value: f.value,
        label: f.label,
        count: counts[f.value] ?? undefined,
    }));

    return (
        <AuthenticatedLayout user={auth.user}>
            <Head title="Demandes de rendez-vous" />

            <div className="flex flex-col gap-6">
                <PageHeader
                    title="Demandes de rendez-vous"
                    subtitle="Les QR codes ne sont émis qu’après votre validation."
                />

                <ListTools>
                    <Segmented
                        label="Filtrer par statut"
                        value={filter}
                        onChange={handleFilterChange}
                        options={segmentedOptions}
                    />
                    <form
                        onSubmit={(e) => {
                            e.preventDefault();
                            handleSearchSubmit();
                        }}
                        className="w-full lg:w-80"
                    >
                        <SearchInput
                            value={search}
                            onChange={handleSearchChange}
                            placeholder="Référence, transporteur, conteneur, plaque…"
                            className="w-full"
                        />
                    </form>
                </ListTools>

                {filteredList.length === 0 ? (
                    <EmptyState
                        icon="calendar-check"
                        title="Aucune demande dans cette vue"
                    >
                        {search
                            ? 'Aucun résultat ne correspond à votre recherche.'
                            : 'Il n’y a aucune demande correspondant à ce filtre.'}
                    </EmptyState>
                ) : (
                    <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(19rem,0.8fr)_minmax(0,1.5fr)]">
                        {/* Colonne de gauche : liste des demandes de rendez-vous */}
                        <div className="flex flex-col gap-2.5">
                            {filteredList.map((d) => {
                                const trucksCount = d.trucks_count || d.trucks?.length || 1;
                                const slotStart = d.slot?.start || '—';
                                const slotDate = d.slot?.date;
                                const relDate = slotDate
                                    ? relDay(slotDate, today).replace('Aujourd’hui', 'Auj.')
                                    : '—';
                                const title =
                                    d.owner?.company ||
                                    (d.owner ? accountName(d.owner) : null) ||
                                    'Transporteur';
                                const opShort = OPS[d.operation || d.op]?.short || d.operation || '';
                                const termShort = TERMINALS[d.terminal]?.short || d.terminal || '';

                                return (
                                    <RecordRow
                                        key={d.reference}
                                        active={d.reference === selectedId}
                                        onClick={() => handleSelectDemande(d)}
                                        leading={
                                            <>
                                                <strong className="text-sm font-bold tabular-nums text-slate-900">
                                                    {slotStart}
                                                </strong>
                                                <span className="text-[11px] text-slate-500">
                                                    {relDate}
                                                </span>
                                            </>
                                        }
                                        title={title}
                                        line2={
                                            <>
                                                <span className="font-mono font-medium text-slate-900">
                                                    {d.reference}
                                                </span>{' '}
                                                · {trucksCount} camion{trucksCount > 1 ? 's' : ''} ·{' '}
                                                {opShort} · {termShort}
                                            </>
                                        }
                                        line3={
                                            d.status === 'en_attente'
                                                ? `Soumise ${fmtAgo(d.submitted_at || d.submittedAt, now)}`
                                                : `Mise à jour ${fmtAgo(d.updated_at || d.updatedAt, now)}`
                                        }
                                        side={
                                            d.status === 'en_attente' ? (
                                                <UrgencyBadge demande={d} now={now} />
                                            ) : (
                                                <StatusTag map={DEM_STATUS} status={d.status} short />
                                            )
                                        }
                                    />
                                );
                            })}
                        </div>
                        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm lg:sticky lg:top-6">
                            {activeDemande ? (
                                <DemandeAdminDetail
                                    key={activeDemande.reference}
                                    demande={activeDemande}
                                    now={now}
                                    onClose={handleCloseDrawer}
                                />
                            ) : (
                                <EmptyState icon="file-search" title="Demande introuvable">
                                    Cette demande n’existe pas ou n’est plus accessible.
                                </EmptyState>
                            )}
                        </div>
                    </div>
                )}

                {/* Slide-over Drawer pour le détail de la demande */}
                {/* <Drawer
                    open={!!selectedId}
                    onClose={handleCloseDrawer}
                    title={activeDemande ? `Demande ${activeDemande.reference}` : 'Demande de rendez-vous'}
                    description={
                        activeDemande
                            ? activeDemande.owner?.company || activeDemande.owner?.name
                            : undefined
                    }
                    size="xl"
                >
                    {activeDemande ? (
                        <DemandeAdminDetail
                            key={activeDemande.reference}
                            demande={activeDemande}
                            now={now}
                            onClose={handleCloseDrawer}
                        />
                    ) : (
                        <EmptyState icon="file-search" title="Demande introuvable">
                            Cette demande n’existe pas ou n’est plus accessible.
                        </EmptyState>
                    )}
                </Drawer> */}
            </div>
        </AuthenticatedLayout>
    );
}

