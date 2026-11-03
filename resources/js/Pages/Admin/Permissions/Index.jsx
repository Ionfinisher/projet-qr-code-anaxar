import { Head, router, useForm } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { PageHeader } from '@/Components/ui/Navigation';
import { Card } from '@/Components/ui/Card';
import { Field, Input } from '@/Components/ui/Field';
import { Button } from '@/Components/ui/Button';
import { Icon } from '@/Components/ui/Icon';
import Swal from 'sweetalert2';

export default function Index({ auth, permissions }) {
    const createForm = useForm({ name: '' });

    const submit = (e) => {
        e.preventDefault();
        createForm.post(route('admin.permissions.store'), {
            onSuccess: () => createForm.reset(),
        });
    };

    const edit = async (permission) => {
        const result = await Swal.fire({
            title: 'Modifier la permission',
            input: 'text',
            inputValue: permission.name,
            inputLabel: 'Nom de la permission',
            inputPlaceholder: 'Ex. inscriptions.consulter',
            showCancelButton: true,
            confirmButtonText: 'Enregistrer',
            cancelButtonText: 'Annuler',
            confirmButtonColor: '#003780',
            inputValidator: (value) => (!value.trim() ? 'Le nom est obligatoire.' : undefined),
        });

        const name = result.isConfirmed ? result.value.trim() : null;
        if (name && name !== permission.name) {
            router.put(route('admin.permissions.update', permission.id), { name });
        }
    };

    const remove = async (id) => {
        const result = await Swal.fire({
            title: 'Supprimer cette permission ?',
            text: 'Cette action est irréversible et affectera les profils associés.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Supprimer',
            cancelButtonText: 'Annuler',
            confirmButtonColor: '#e11d48',
        });

        if (result.isConfirmed) {
            router.delete(route('admin.permissions.destroy', id));
        }
    };

    return (
        <AuthenticatedLayout user={auth.user}>
            <Head title="Permissions du système" />

            <div className="flex flex-col gap-6">
                <PageHeader
                    title="Permissions du système"
                    subtitle="Définissez les droits d’accès utilisables par les profils d’utilisateurs."
                    className="mb-0"
                />

                {/* Create Permission Card */}
                <Card as="form" onSubmit={submit} className="flex flex-col gap-4">
                    <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500">
                        Ajouter une permission
                    </h3>
                    <div className="flex flex-col sm:flex-row items-end gap-3">
                        <Field
                            id="perm-name"
                            label="Nom de la permission"
                            error={createForm.errors.name}
                            className="flex-1"
                        >
                            <Input
                                id="perm-name"
                                placeholder="Ex. inscriptions.valider ou rdv.gerer"
                                value={createForm.data.name}
                                onChange={(e) => createForm.setData('name', e.target.value)}
                                required
                            />
                        </Field>

                        <Button
                            type="submit"
                            icon="plus"
                            loading={createForm.processing}
                            disabled={createForm.processing || !createForm.data.name.trim()}
                            className="h-10 shrink-0"
                        >
                            Ajouter
                        </Button>
                    </div>
                </Card>

                {/* Permissions List */}
                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                    <div className="border-b border-slate-100 bg-slate-50 px-5 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
                        Liste des permissions ({permissions.length})
                    </div>

                    <div className="divide-y divide-slate-100">
                        {permissions.map((permission) => (
                            <div
                                key={permission.id}
                                className="flex items-center justify-between p-4 transition-colors hover:bg-slate-50"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                                        <Icon name="lock" size={16} />
                                    </div>
                                    <span className="font-mono text-sm font-medium text-slate-800">
                                        {permission.name}
                                    </span>
                                </div>

                                <div className="flex items-center gap-2">
                                    <Button
                                        size="sm"
                                        variant="secondary"
                                        icon="pencil"
                                        onClick={() => edit(permission)}
                                    >
                                        Modifier
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        icon="trash-2"
                                        className="text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                                        onClick={() => remove(permission.id)}
                                    >
                                        Supprimer
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
