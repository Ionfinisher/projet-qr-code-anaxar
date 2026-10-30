import { useState } from 'react';
import { Head, Link, useForm } from '@inertiajs/react';
import GuestLayout from '@/Layouts/GuestLayout';
import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import PrimaryButton from '@/Components/PrimaryButton';
import TextInput from '@/Components/TextInput';

export default function Status({
    registration = null,
    lookup = { email: '', numero_dossier: '' },
}) {
    const [hasSearched, setHasSearched] = useState(registration !== null);
    const { data, setData, get, processing, errors } = useForm(lookup);

    const updateField = (field) => (event) => {
        setData(field, event.target.value);
        setHasSearched(false);
    };

    const submit = (event) => {
        event.preventDefault();

        get(route('registration.status.search'), {
            preserveState: true,
            preserveScroll: true,
            onSuccess: () => setHasSearched(true),
            onError: () => setHasSearched(false),
        });
    };

    return (
        <GuestLayout>
            <Head title="Suivre mon dossier" />
            <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">Suivre mon dossier</h1>
            <p className="mt-2 text-sm text-gray-600">Saisissez votre email et votre numéro de dossier.</p>

            <form onSubmit={submit} className="mt-8">
                <div>
                    <InputLabel htmlFor="email" value="Email" />
                    <TextInput
                        id="email"
                        type="email"
                        value={data.email}
                        className="mt-1 block w-full"
                        onChange={updateField('email')}
                        required
                    />
                    <InputError message={errors.email} className="mt-2" />
                </div>
                <div className="mt-5">
                    <InputLabel htmlFor="numero_dossier" value="Numéro de dossier" />
                    <TextInput
                        id="numero_dossier"
                        value={data.numero_dossier}
                        className="mt-1 block w-full"
                        onChange={updateField('numero_dossier')}
                        required
                    />
                    <InputError message={errors.numero_dossier} className="mt-2" />
                </div>
                <PrimaryButton className="mt-6" disabled={processing}>
                    Rechercher
                </PrimaryButton>
            </form>

            {hasSearched && registration && (
                <div className="mt-8 rounded-md border border-gray-200 bg-gray-50 p-4">
                    <p className="text-sm text-gray-600">Dossier {registration.numero_dossier}</p>
                    <p className="mt-1 font-semibold text-gray-900">
                        Statut : {registration.status_label || registration.status}
                    </p>
                    {registration.rejection_reason && (
                        <p className="mt-3 text-sm text-red-700">Motif : {registration.rejection_reason}</p>
                    )}
                    {registration.can_edit && registration.edit_url && (
                        <Link
                            href={registration.edit_url}
                            className="mt-4 inline-block text-sm font-semibold text-indigo-700 underline"
                        >
                            Modifier mon dossier
                        </Link>
                    )}
                </div>
            )}

            {hasSearched && registration === null && data.email && data.numero_dossier && !errors.email && !errors.numero_dossier && (
                <p className="mt-6 text-sm text-red-700">
                    Aucun dossier ne correspond à ces informations.
                </p>
            )}
        </GuestLayout>
    );
}
