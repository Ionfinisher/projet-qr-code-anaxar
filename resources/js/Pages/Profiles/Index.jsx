import { Head, Link, router } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { PageHeader } from '@/Components/ui/Navigation';
import { Button, buttonClass } from '@/Components/ui/Button';
import { EmptyState } from '@/Components/ui/Feedback';
import { Icon } from '@/Components/ui/Icon';
import Swal from 'sweetalert2';

export default function Index({ auth, profiles = [] }) {
    const remove = async (id, name) => {
        const result = await Swal.fire({
            title: 'Supprimer ce profil ?',
            text: `Êtes-vous sûr de vouloir supprimer le profil « ${name} » ?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Supprimer',
            cancelButtonText: 'Annuler',
            confirmButtonColor: '#e11d48',
        });

        if (result.isConfirmed) {
            router.delete(route('profiles.destroy', id));
        }
    };

    return (
        <AuthenticatedLayout user={auth.user}>
            <Head title="Profils" />

            <div className="flex flex-col gap-6">
                <PageHeader
                    title="Profils d’habilitation"
                    subtitle="Définissez les rôles et les ensembles de permissions pour vos utilisateurs."
                    className="mb-0"
                    actions={
                        <Link
                            href={route('profiles.create')}
                            className={buttonClass({ variant: 'primary' })}
                        >
                            <Icon name="shield" size={18} /> Créer un profil
                        </Link>
                    }
                />

                {profiles.length === 0 ? (
                    <EmptyState
                        icon="shield"
                        title="Aucun profil défini"
                        action={
                            <Link
                                href={route('profiles.create')}
                                className={buttonClass({ variant: 'primary' })}
                            >
                                Créer un premier profil
                            </Link>
                        }
                    >
                        Créez un profil pour assigner des permissions spécifiques à vos collaborateurs.
                    </EmptyState>
                ) : (
                    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-slate-100 text-left text-sm">
                                <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500">
                                    <tr>
                                        <th className="px-5 py-3.5">Nom du profil</th>
                                        <th className="px-5 py-3.5">Permissions associées</th>
                                        <th className="px-5 py-3.5 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {profiles.map((profile) => {
                                        const perms = profile.permissions || [];

                                        return (
                                            <tr key={profile.id} className="transition-colors hover:bg-slate-50/70">
                                                <td className="px-5 py-3.5">
                                                    <div className="flex items-center gap-3">
                                                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                                                            <Icon name="shield" size={18} />
                                                        </div>
                                                        <span className="font-semibold text-slate-900">
                                                            {profile.name}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-5 py-3.5">
                                                    {perms.length === 0 ? (
                                                        <span className="text-xs text-slate-400 italic">Aucune permission</span>
                                                    ) : (
                                                        <div className="flex flex-wrap gap-1 max-w-xl">
                                                            {perms.map((p) => (
                                                                <span
                                                                    key={p.id}
                                                                    className="rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-mono text-slate-700"
                                                                >
                                                                    {p.name}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="px-5 py-3.5 text-right">
                                                    <div className="flex items-center justify-end gap-1.5">
                                                        <Link
                                                            href={route('profiles.edit', profile.id)}
                                                            className={buttonClass({ variant: 'secondary', size: 'sm' })}
                                                        >
                                                            <Icon name="pencil" size={14} /> Modifier
                                                        </Link>

                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            onClick={() => remove(profile.id, profile.name)}
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
