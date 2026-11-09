import { useEffect, useState } from 'react';
import { Head, router } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import {
    PageHeader,
    Segmented,
    SearchInput,
    DataTable,
    Badge,
    Avatar,
    Button,
    EmptyState,
} from '@/Components/ui';
import { fmtAgo, fmtInt } from '@/Lib/domain';
import { UserDrawer } from './UserDrawer';
import { AddUserDrawer } from './AddUserDrawer';

const USER_FILTERS = [
    { value: 'all', label: 'Tous' },
    { value: 'interne', label: 'Administration' },
    { value: 'transporteur', label: 'Transporteurs' },
    { value: 'inactive', label: 'Désactivés' },
];

export default function Index({
    auth,
    users,
    counts = {},
    filters = {},
    profiles = [],
    tempPassword = null,
    tempUserId = null,
}) {
    const [filter, setFilter] = useState(filters.status || 'all');
    const [search, setSearch] = useState(filters.q || '');
    const [openId, setOpenId] = useState(tempUserId || null);
    const [adding, setAdding] = useState(false);

    const now = Date.now();

    // Debounced search
    useEffect(() => {
        if (search === (filters.q || '')) return undefined;

        const timer = setTimeout(() => {
            router.get(
                route('admin.utilisateurs.index'),
                { status: filter, q: search || undefined },
                { preserveState: true, preserveScroll: true, replace: true }
            );
        }, 350);

        return () => clearTimeout(timer);
    }, [search, filter, filters.q]);

    const handleFilterChange = (newFilter) => {
        setFilter(newFilter);
        router.get(
            route('admin.utilisateurs.index'),
            { status: newFilter, q: search || undefined },
            { preserveState: true, preserveScroll: true, replace: true }
        );
    };

    const selUser = openId ? users.data.find((u) => u.id === openId) : null;

    const segmentedOptions = USER_FILTERS.map((f) => ({
        value: f.value,
        label: f.label,
        count: counts[f.value] ?? undefined,
    }));

    const columns = [
        {
            key: 'user',
            header: 'Utilisateur',
            render: (u) => (
                <div className="flex items-center gap-3">
                    <Avatar name={u.name} size={36} />
                    <div className="min-w-0 max-w-[220px] 2xl:max-w-[300px]">
                        <p className="truncate font-semibold text-slate-900">{u.name}</p>
                        <p className="truncate text-xs text-slate-500">{u.email || u.phone}</p>
                    </div>
                </div>
            ),
        },
        {
            key: 'profile',
            header: 'Profil',
            render: (u) => (
                <span className="font-medium text-slate-800">{u.profile || '—'}</span>
            ),
        },
        {
            key: 'kind',
            header: 'Type',
            render: (u) =>
                u.kind === 'interne' ? (
                    <Badge tone="info" icon="shield-user">
                        Administration
                    </Badge>
                ) : (
                    <Badge tone="neutral" icon="truck">
                        {u.acct ? u.acct.toUpperCase() : 'Transporteur'}
                    </Badge>
                ),
        },
        {
            key: 'status',
            header: 'Statut',
            render: (u) =>
                u.active ? (
                    <Badge tone="ok" icon="check">
                        Actif
                    </Badge>
                ) : (
                    <Badge icon="power">Désactivé</Badge>
                ),
        },
        {
            key: 'login',
            header: 'Dernière connexion',
            className: 'whitespace-nowrap text-xs text-slate-500',
            render: (u) => (u.lastLoginAt ? fmtAgo(u.lastLoginAt, now) : 'Jamais'),
        },
        {
            key: 'action',
            header: 'Fiche',
            headerClassName: 'text-right',
            className: 'text-right',
            render: (u) => (
                <Button
                    size="sm"
                    variant="secondary"
                    onClick={(ev) => {
                        ev.stopPropagation();
                        setOpenId(u.id);
                    }}
                >
                    Consulter
                </Button>
            ),
        },
    ];

    return (
        <AuthenticatedLayout user={auth?.user}>
            <Head title="Utilisateurs & Accès" />

            <div className="flex flex-col gap-6">
                <PageHeader
                    title="Utilisateurs"
                    subtitle="Comptes de l’administration du port et comptes transporteurs/transitaires issus des inscriptions validées."
                    actions={(
                        <Button icon="user-plus" onClick={() => setAdding(true)}>
                            Ajouter un utilisateur
                        </Button>
                    )}
                />

                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <Segmented
                        label="Filtrer par type ou statut"
                        value={filter}
                        onChange={handleFilterChange}
                        options={segmentedOptions}
                    />

                    <SearchInput
                        value={search}
                        onChange={setSearch}
                        placeholder="Nom, e-mail, téléphone, fonction…"
                        className="w-full lg:w-80"
                    />
                </div>

                <DataTable
                    columns={columns}
                    rows={users.data}
                    rowKey={(row) => row.id}
                    onRowClick={(row) => setOpenId(row.id)}
                    rowClassName={(row) => (!row.active ? 'opacity-60 bg-slate-50/50' : '')}
                    caption="Liste des utilisateurs de la plateforme"
                    empty={(
                        <EmptyState
                            icon="users"
                            title={search ? 'Aucun utilisateur ne correspond à votre recherche' : 'Aucun utilisateur dans cette catégorie'}
                            action={(
                                <Button icon="user-plus" onClick={() => setAdding(true)}>
                                    Ajouter un utilisateur
                                </Button>
                            )}
                        >
                            {search
                                ? 'Essayez un autre terme de recherche.'
                                : 'Tous les comptes créés ou validés apparaîtront ici.'}
                        </EmptyState>
                    )}
                />

                {users.total > 0 ? (
                    <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-slate-500">
                        <p>
                            Affichage de <strong className="font-medium text-slate-700">{fmtInt(users.from || 0)}</strong> à{' '}
                            <strong className="font-medium text-slate-700">{fmtInt(users.to || 0)}</strong> sur{' '}
                            <strong className="font-medium text-slate-700">{fmtInt(users.total)}</strong> utilisateur{users.total > 1 ? 's' : ''}.
                        </p>
                        <div className="flex items-center gap-2">
                            <Button
                                size="sm"
                                variant="secondary"
                                icon="chevron-left"
                                disabled={!users.prev_page_url}
                                onClick={() => router.visit(users.prev_page_url, { preserveState: true, preserveScroll: true })}
                            >
                                Précédent
                            </Button>
                            <Button
                                size="sm"
                                variant="secondary"
                                iconRight="chevron-right"
                                disabled={!users.next_page_url}
                                onClick={() => router.visit(users.next_page_url, { preserveState: true, preserveScroll: true })}
                            >
                                Suivant
                            </Button>
                        </div>
                    </div>
                ) : null}

                {selUser ? (
                    <UserDrawer
                        key={selUser.id}
                        u={selUser}
                        onClose={() => setOpenId(null)}
                        profiles={profiles}
                        initialTempPassword={openId === tempUserId ? tempPassword : null}
                    />
                ) : null}

                <AddUserDrawer
                    open={adding}
                    onClose={() => setAdding(false)}
                    profiles={profiles}
                />
            </div>
        </AuthenticatedLayout>
    );
}

