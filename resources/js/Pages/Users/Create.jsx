import { Head, Link, useForm } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { PageHeader } from '@/Components/ui/Navigation';
import { Card } from '@/Components/ui/Card';
import { Field, Input, Select } from '@/Components/ui/Field';
import { Button } from '@/Components/ui/Button';
import { Icon } from '@/Components/ui/Icon';

export default function Create({ auth, profiles = [] }) {
    const { data, setData, post, processing, errors } = useForm({
        nom: '',
        prenom: '',
        email: '',
        adresse: '',
        role_name: '',
    });

    const submit = (e) => {
        e.preventDefault();
        post(route('users.store'));
    };

    return (
        <AuthenticatedLayout user={auth.user}>
            <Head title="Créer un utilisateur" />

            <div className="mx-auto max-w-2xl flex flex-col gap-6">
                <PageHeader
                    title="Ajouter un utilisateur"
                    subtitle="Créez un nouveau compte d’accès collaborateur."
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
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <Field id="user-nom" label="Nom" required error={errors.nom}>
                            <Input
                                id="user-nom"
                                placeholder="Ex. DUPONT"
                                value={data.nom}
                                onChange={(e) => setData('nom', e.target.value)}
                                required
                            />
                        </Field>

                        <Field id="user-prenom" label="Prénom" required error={errors.prenom}>
                            <Input
                                id="user-prenom"
                                placeholder="Ex. Jean"
                                value={data.prenom}
                                onChange={(e) => setData('prenom', e.target.value)}
                                required
                            />
                        </Field>
                    </div>

                    <Field
                        id="user-email"
                        label="Adresse e-mail"
                        required
                        error={errors.email}
                        hint="Un mot de passe temporaire sera généré et envoyé à cette adresse."
                    >
                        <Input
                            id="user-email"
                            type="email"
                            placeholder="jean.dupont@entreprise.tg"
                            value={data.email}
                            onChange={(e) => setData('email', e.target.value)}
                            required
                        />
                    </Field>

                    <Field id="user-adresse" label="Adresse (facultatif)" error={errors.adresse}>
                        <Input
                            id="user-adresse"
                            placeholder="Ex. Lomé, Togo"
                            value={data.adresse}
                            onChange={(e) => setData('adresse', e.target.value)}
                        />
                    </Field>

                    <Field
                        id="user-role"
                        label="Profil d’habilitation"
                        required
                        error={errors.role_name}
                    >
                        <Select
                            id="user-role"
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
                            icon="user-plus"
                            loading={processing}
                            disabled={processing}
                        >
                            {processing ? 'Création…' : 'Créer l’utilisateur'}
                        </Button>
                    </div>
                </Card>
            </div>
        </AuthenticatedLayout>
    );
}
