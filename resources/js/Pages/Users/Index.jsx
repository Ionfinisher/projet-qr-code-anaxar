import { useMemo, useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { PageHeader, SearchInput } from '@/Components/ui/Navigation';
import { Segmented } from '@/Components/ui/Choice';
import { Badge } from '@/Components/ui/Badge';
import { Button, buttonClass } from '@/Components/ui/Button';
import { Avatar } from '@/Components/ui/Data';
import { EmptyState } from '@/Components/ui/Feedback';
import { Icon } from '@/Components/ui/Icon';
import Swal from 'sweetalert2';

const FILTERS = [
    { value: 'all', label: 'Tous', test: () => true },
    { value: 'active', label: 'Actifs', test: (u) => u.statut === 'active' },
    { value: 'inactive', label: 'Désactivés', test: (u) => u.statut !== 'active' },
];

export default function Index({ auth, users = [] }) {
    const [filter, setFilter] = useState('all');
    const [search, setSearch] = useState('');

    const counts = useMemo(() => {
        return Object.fromEntries(
            FILTERS.map((f) => [f.value, users.filter(f.test).length])
        );
    }, [users]);

    const filteredUsers = useMemo(() => {
        const activeFilter = FILTERS.find((f) => f.value === filter) || FILTERS[0];
        const q = search.trim().toLowerCase();

        return users.filter((u) => {
            if (!activeFilter.test(u)) return false;
            if (!q) return true;

            const name = `${u.prenom ?? ''} ${u.nom ?? ''}`.toLowerCase();
            const email = (u.email || '').toLowerCase();
            const role = (u.roles?.map((r) => r.name).join(' ') || '').toLowerCase();

            return name.includes(q) || email.includes(q) || role.includes(q);
        });
    }, [users, filter, search]);

    const remove = async (id, name) => {
        const result = await Swal.fire({
            title: `Supprimer l'utilisateur ?`,
            text: `Voulez-vous vraiment supprimer définitivement ${name || 'cet utilisateur'} ?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Supprimer',
            cancelButtonText: 'Annuler',
            confirmButtonColor: '#e11d48',
        });

        if (result.isConfirmed) {
            router.delete(route('users.destroy', id));
        }
    };

    const toggle = (id) => {
        router.patch(route('users.toggle', id));
    };

    return (
        <AuthenticatedLayout user={auth.user}>
            <Head title="Utilisateurs" />

            <div className="flex flex-col gap-6">
                <PageHeader
                    title="Utilisateurs"
                    subtitle="Comptes d’accès et collaborateurs associés à votre organisation."
                    className="mb-0"
                    actions={
                        <Link
                            href={route('users.create')}
                            className={buttonClass({ variant: 'primary' })}
                        >
                            <Icon name="user-plus" size={18} /> Ajouter un utilisateur
                        </Link>
                    }
                />

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <Segmented
                        label="Filtrer"
                        value={filter}
                        onChange={setFilter}
                        options={FILTERS.map((f) => ({
                            value: f.value,
                            label: f.label,
                            count: counts[f.value],
                        }))}
                    />

                    <SearchInput
                        value={search}
                        onChange={setSearch}
                        placeholder="Nom, e-mail, profil…"
                        className="w-full sm:w-72"
                    />
                </div>

                {filteredUsers.length === 0 ? (
                    <EmptyState
                        icon="users"
                        title="Aucun utilisateur trouvé"
                    >
                        {search ? 'Aucun utilisateur ne correspond à votre recherche.' : 'Aucun compte dans cette vue.'}
                    </EmptyState>
                ) : (
                    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-slate-100 text-left text-sm">
                                <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500">
                                    <tr>
                                        <th className="px-5 py-3.5">Utilisateur</th>
                                        <th className="px-5 py-3.5">Profil / Rôle</th>
                                        <th className="px-5 py-3.5">Statut</th>
                                        <th className="px-5 py-3.5 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {filteredUsers.map((item) => {
                                        const fullName = `${item.prenom ?? ''} ${item.nom ?? ''}`.trim() || item.name || 'Utilisateur';
                                        const roles = item.roles?.map((r) => r.name).join(', ') || 'Aucun';
                                        const isActive = item.statut === 'active';

                                        return (
                                            <tr key={item.id} className="transition-colors hover:bg-slate-50/70">
                                                <td className="px-5 py-3.5">
                                                    <div className="flex items-center gap-3">
                                                        <Avatar name={fullName} size={36} />
                                                        <div className="min-w-0">
                                                            <span className="block font-semibold text-slate-900 truncate">
                                                                {fullName}
                                                            </span>
                                                            <span className="block text-xs text-slate-500 font-mono truncate">
                                                                {item.email}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-5 py-3.5">
                                                    <span className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700">
                                                        <Icon name="shield" size={13} className="text-slate-500" />
                                                        {roles}
                                                    </span>
                                                </td>
                                                <td className="px-5 py-3.5">
                                                    <Badge
                                                        tone={isActive ? 'ok' : 'neutral'}
                                                        icon={isActive ? 'check' : 'power'}
                                                    >
                                                        {isActive ? 'Actif' : 'Désactivé'}
                                                    </Badge>
                                                </td>
                                                <td className="px-5 py-3.5 text-right">
                                                    <div className="flex items-center justify-end gap-1.5">
                                                        <Link
                                                            href={route('users.edit', item.id)}
                                                            className={buttonClass({ variant: 'secondary', size: 'sm' })}
                                                        >
                                                            <Icon name="pencil" size={14} /> Modifier
                                                        </Link>

                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            onClick={() => toggle(item.id)}
                                                            className={isActive ? 'text-amber-700 hover:bg-amber-50' : 'text-emerald-700 hover:bg-emerald-50'}
                                                        >
                                                            {isActive ? 'Désactiver' : 'Activer'}
                                                        </Button>

                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            onClick={() => remove(item.id, fullName)}
                                                            className="text-rose-600 hover:bg-rose-50"
                                                        >
                                                            <Icon name="trash-2" size={14} />
                                                        </Button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        </AuthenticatedLayout>
    );
}
