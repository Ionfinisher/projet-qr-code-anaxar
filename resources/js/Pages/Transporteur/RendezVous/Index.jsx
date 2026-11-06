import { useMemo, useState } from 'react';
import { Head, router } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { PageHeader, SearchInput } from '@/Components/ui/Navigation';
import { Segmented } from '@/Components/ui/Choice';
import { EmptyState } from '@/Components/ui/Feedback';
import { Button } from '@/Components/ui/Button';
import { Drawer } from '@/Components/ui/Overlay';
import { RdvRow, DayLabel, RdvDetail } from '@/Components/domain';
import { dayStr, statusOf, driverName, transporterName, relDay } from '@/Lib/domain';

const FILTERS = [
    { value: 'all', label: 'Tous' },
    { value: 'up', label: 'À venir' },
    { value: 'gate', label: 'À la guérite' },
    { value: 'port', label: 'Dans le port' },
    { value: 'done', label: 'Terminés' },
];

export default function Index({ auth, rdvs = [], counts = {}, filters = {}, selected = null }) {
    const [filter, setFilter] = useState(filters.status || 'all');
    const [search, setSearch] = useState(filters.q || '');
    const [selectedId, setSelectedId] = useState(filters.id || selected?.id || null);

    const now = Date.now();
    const today = dayStr(now);

    const handleFilterChange = (newFilter) => {
        setFilter(newFilter);
        router.get(
            route('transporteur.rdv.index'),
            {
                status: newFilter,
                q: search || undefined,
            },
            {
                preserveState: true,
                preserveScroll: true,
                replace: true,
            }
        );
    };

    const handleSearchSubmit = () => {
        router.get(
            route('transporteur.rdv.index'),
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
        const needle = search.trim().toUpperCase().replace(/\s+/g, '');
        if (!needle) return rdvs;

        return rdvs.filter((r) => {
            const hay = [
                r.id,
                r.demandeId,
                r.container?.number,
                r.container?.bl,
                r.vehicle?.tractor,
                r.vehicle?.trailer,
                driverName(r.driver),
                transporterName(r.transporter),
            ]
                .join(' ')
                .toUpperCase()
                .replace(/\s+/g, '');
            return hay.includes(needle);
        });
    }, [rdvs, search]);

    // Grouping by date
    const groups = useMemo(() => {
        const map = new Map();
        for (const r of filteredList) {
            const date = r.slot?.date || today;
            if (!map.has(date)) map.set(date, []);
            map.get(date).push(r);
        }

        // Days ahead first (ascending), then past days (descending)
        const keys = [...map.keys()].sort((a, b) => {
            const fa = a >= today;
            const fb = b >= today;
            if (fa !== fb) return fa ? -1 : 1;
            return fa ? a.localeCompare(b) : b.localeCompare(a);
        });

        return keys.map((k) => ({
            date: k,
            items: map.get(k).sort((a, b) => {
                const s1 = a.slot?.start || '';
                const s2 = b.slot?.start || '';
                return s1.localeCompare(s2) || a.id.localeCompare(b.id);
            }),
        }));
    }, [filteredList, today]);

    const activeRdv = useMemo(() => {
        if (!selectedId) return null;
        if (selected && selected.id === selectedId) return selected;
        return rdvs.find((r) => r.id === selectedId) || selected || null;
    }, [rdvs, selectedId, selected]);

    const handleSelectRdv = (r) => {
        setSelectedId(r.id);
        router.get(
            route('transporteur.rdv.index'),
            {
                status: filter,
                q: search || undefined,
                id: r.id,
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
            route('transporteur.rdv.index'),
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

    const segmentedOptions = FILTERS.map((f) => ({
        value: f.value,
        label: f.label,
        count: counts[f.value] ?? undefined,
    }));

    return (
        <AuthenticatedLayout user={auth?.user}>
            <Head title="Rendez-vous" />

            <div className="flex flex-col gap-6">
                <PageHeader
                    title="Rendez-vous"
                    subtitle="Demandes validées · QR codes signés · suivi du passage à la guérite"
                />

                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
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
                            onChange={setSearch}
                            placeholder="Conteneur, BL, plaque, chauffeur, référence…"
                            className="w-full"
                        />
                    </form>
                </div>

                {groups.length === 0 ? (
                    <EmptyState
                        icon="calendar-clock"
                        title="Aucun rendez-vous"
                        action={
                            <Button
                                icon="plus"
                                onClick={() => router.get(route('transporteur.demandes.create'))}
                            >
                                Nouvelle demande
                            </Button>
                        }
                    >
                        {search
                            ? 'Aucun résultat pour cette recherche.'
                            : 'Les rendez-vous apparaissent ici dès que l’administration valide vos demandes.'}
                    </EmptyState>
                ) : (
                    <div className="flex flex-col gap-6">
                        {groups.map((g) => (
                            <section
                                key={g.date}
                                className="flex flex-col gap-2.5"
                                aria-label={relDay(g.date, today)}
                            >
                                <DayLabel date={g.date} today={today} count={g.items.length} />
                                {g.items.map((r) => {
                                    const st = statusOf(r, now);
                                    return (
                                        <RdvRow
                                            key={r.id}
                                            r={r}
                                            st={st}
                                            now={now}
                                            current={r.id === selectedId}
                                            onClick={() => handleSelectRdv(r)}
                                        />
                                    );
                                })}
                            </section>
                        ))}
                    </div>
                )}

                {/* Tiroir coulissant latéral */}
                <Drawer
                    open={!!selectedId}
                    onClose={handleCloseDrawer}
                    size="lg"
                    title={activeRdv ? `Rendez-vous ${activeRdv.id}` : 'Rendez-vous'}
                    description={
                        activeRdv?.slot
                            ? `${relDay(activeRdv.slot.date)} · ${activeRdv.slot.start}–${
                                  activeRdv.slot.end
                              }`
                            : undefined
                    }
                >
                    {activeRdv ? (
                        <RdvDetail
                            rdv={activeRdv}
                            rdvs={rdvs}
                            now={now}
                            onSelectRdv={handleSelectRdv}
                        />
                    ) : (
                        <EmptyState
                            icon="search"
                            title="Rendez-vous introuvable"
                            action={
                                <Button variant="secondary" onClick={handleCloseDrawer}>
                                    Tous les rendez-vous
                                </Button>
                            }
                        >
                            Ce rendez-vous n’existe pas ou n’est pas encore validé.
                        </EmptyState>
                    )}
                </Drawer>
            </div>
        </AuthenticatedLayout>
    );
}

