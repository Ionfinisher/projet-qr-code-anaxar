import { Head, Link, useForm } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { PageHeader } from '@/Components/ui/Navigation';
import { Card } from '@/Components/ui/Card';
import { Field, Input, Select } from '@/Components/ui/Field';
import { Button } from '@/Components/ui/Button';
import { Icon } from '@/Components/ui/Icon';

export default function Edit({ auth, user, profiles = [] }) {
    const { data, setData, put, processing, errors } = useForm({
        nom: user.nom || '',
        prenom: user.prenom || '',
        adresse: user.adresse || '',
        role_name: user.role_name || '',
    });

    const submit = (e) => {
        e.preventDefault();
        put(route('users.update', user.id));
    };

    return (
        <AuthenticatedLayout user={auth.user}>
            <Head title={`Modifier ${user.nom || 'l’utilisateur'}`} />

            <div className="mx-auto max-w-2xl flex flex-col gap-6">
                <PageHeader
                    title="Modifier l’utilisateur"
                    subtitle={`Compte : ${user.email}`}
                    className="mb-0"
                    actions={
                        <Link
                            href={route('users.index')}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
                        >
                            <Icon name="arrow-left" size={14} /> Annuler
                        </Link>
                    }
                />

                <Card as="form" onSubmit={submit} className="flex flex-col gap-5">
                    <Field id="edit-user-email" label="Adresse e-mail">
                        <Input
                            id="edit-user-email"
                            value={user.email}
                            disabled
                            readOnly
                            className="bg-slate-100 font-mono text-slate-600"
                        />
                    </Field>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <Field id="edit-user-nom" label="Nom" required error={errors.nom}>
                            <Input
                                id="edit-user-nom"
                                value={data.nom}
                                onChange={(e) => setData('nom', e.target.value)}
                                required
                            />
                        </Field>

                        <Field id="edit-user-prenom" label="Prénom" required error={errors.prenom}>
                            <Input
                                id="edit-user-prenom"
                                value={data.prenom}
                                onChange={(e) => setData('prenom', e.target.value)}
                                required
                            />
                        </Field>
                    </div>

                    <Field id="edit-user-adresse" label="Adresse (facultatif)" error={errors.adresse}>
                        <Input
                            id="edit-user-adresse"
                            value={data.adresse}
                            onChange={(e) => setData('adresse', e.target.value)}
                        />
                    </Field>

                    <Field
                        id="edit-user-role"
                        label="Profil d’habilitation"
                        required
                        error={errors.role_name}
                    >
                        <Select
                            id="edit-user-role"
                            value={data.role_name}
                            onChange={(e) => setData('role_name', e.target.value)}
                            required
                        >
                            <option value="">Sélectionnez un profil</option>
                            {profiles.map((profile) => (
                                <option key={profile.id} value={profile.name}>
                                    {profile.name}
                                </option>
                            ))}
                        </Select>
                    </Field>

                    <div className="flex items-center justify-between border-t border-slate-100 pt-5">
                        <Link
                            href={route('users.index')}
                            className="text-sm font-semibold text-slate-600 hover:text-slate-900"
                        >
                            Annuler
                        </Link>

                        <Button
                            type="submit"
                            icon="check"
                            loading={processing}
                            disabled={processing}
                        >
                            {processing ? 'Enregistrement…' : 'Enregistrer les modifications'}
                        </Button>
                    </div>
                </Card>
            </div>
        </AuthenticatedLayout>
    );
}
