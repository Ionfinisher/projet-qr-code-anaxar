import { useEffect, useState } from 'react';
import GuestLayout from '@/Layouts/GuestLayout';
import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import PrimaryButton from '@/Components/PrimaryButton';
import TextInput from '@/Components/TextInput';
import { Head, Link, useForm } from '@inertiajs/react';

const countries = [
    { value: 'Togo', label: 'Togo' },
    { value: 'Benin', label: 'Bénin' },
    { value: 'Burkina Faso', label: 'Burkina Faso' },
    { value: 'Cote d’Ivoire', label: "Côte d'Ivoire" },
    { value: 'Ghana', label: 'Ghana' },
    { value: 'Nigeria', label: 'Nigeria' },
    { value: 'Senegal', label: 'Sénégal' },
    { value: 'Cameroon', label: 'Cameroun' },
    { value: 'Guinea', label: 'Guinée' },
    { value: 'Mali', label: 'Mali' },
    { value: 'Niger', label: 'Niger' },
    { value: 'Other', label: 'Autre' },
];

export default function Register({ pieces = [] }) {
    const [step, setStep] = useState(1);
    const { data, setData, post, processing, errors, reset } = useForm({
        user_type: 'societe',
        country: 'Togo',
        email: '',
        raison_sociale: '',
        nom: '',
        prenom: '',
        password: '',
        password_confirmation: '',
        documents: {},
    });

    useEffect(() => {
        return () => {
            reset('password', 'password_confirmation', 'documents');
        };
    }, []);

    const continueToPassword = (event) => {
        event.preventDefault();
        setStep(2);
    };

    const submit = (event) => {
        event.preventDefault();
        post(route('register'), { forceFormData: true });
    };

    return (
        <GuestLayout>
            <Head title="Créer un compte" />

            <div className="mb-8">
                <p className="text-sm font-semibold text-indigo-700">Étape {step} sur 2</p>
                <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-gray-900">Créer votre compte</h2>
                <div className="mt-5 flex gap-2" aria-label="Progression de l'inscription">
                    <span className={`h-1.5 flex-1 rounded-full ${step >= 1 ? 'bg-indigo-700' : 'bg-gray-200'}`} />
                    <span className={`h-1.5 flex-1 rounded-full ${step >= 2 ? 'bg-indigo-700' : 'bg-gray-200'}`} />
                </div>
            </div>

            {step === 1 ? (
                <form onSubmit={continueToPassword}>
                    <div>
                        <InputLabel value="Type d'utilisateur" />
                        <div className="mt-2 grid grid-cols-2 gap-3">
                            {[
                                ['societe', 'Société'],
                                ['particulier', 'Particulier'],
                            ].map(([value, label]) => (
                                <label
                                    key={value}
                                    className={`cursor-pointer rounded-md border p-3 text-center text-sm font-medium transition ${
                                        data.user_type === value
                                            ? 'border-indigo-700 bg-indigo-50 text-indigo-900 ring-1 ring-indigo-700'
                                            : 'border-gray-300 text-gray-700 hover:border-indigo-400'
                                    }`}
                                >
                                    <input
                                        type="radio"
                                        name="user_type"
                                        value={value}
                                        checked={data.user_type === value}
                                        onChange={(event) => setData('user_type', event.target.value)}
                                        className="sr-only"
                                    />
                                    {label}
                                </label>
                            ))}
                        </div>
                        <InputError message={errors.user_type} className="mt-2" />
                    </div>

                    <div className="mt-5">
                        <InputLabel htmlFor="country" value="Pays" />
                        <select
                            id="country"
                            name="country"
                            value={data.country}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                            onChange={(event) => setData('country', event.target.value)}
                            required
                        >
                            {countries.map((country) => (
                                <option key={country.value} value={country.value}>
                                    {country.label}
                                </option>
                            ))}
                        </select>
                        <InputError message={errors.country} className="mt-2" />
                    </div>

                    {data.user_type === 'societe' ? (
                        <div className="mt-5">
                            <InputLabel htmlFor="raison_sociale" value="Raison sociale" />
                            <TextInput
                                id="raison_sociale"
                                name="raison_sociale"
                                value={data.raison_sociale}
                                className="mt-1 block w-full"
                                autoComplete="organization"
                                onChange={(event) => setData('raison_sociale', event.target.value)}
                                required
                            />
                            <InputError message={errors.raison_sociale} className="mt-2" />
                        </div>
                    ) : (
                        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <div>
                                <InputLabel htmlFor="nom" value="Nom" />
                                <TextInput
                                    id="nom"
                                    name="nom"
                                    value={data.nom}
                                    className="mt-1 block w-full"
                                    autoComplete="family-name"
                                    onChange={(event) => setData('nom', event.target.value)}
                                    required
                                />
                                <InputError message={errors.nom} className="mt-2" />
                            </div>
                            <div>
                                <InputLabel htmlFor="prenom" value="Prénom" />
                                <TextInput
                                    id="prenom"
                                    name="prenom"
                                    value={data.prenom}
                                    className="mt-1 block w-full"
                                    autoComplete="given-name"
                                    onChange={(event) => setData('prenom', event.target.value)}
                                    required
                                />
                                <InputError message={errors.prenom} className="mt-2" />
                            </div>
                        </div>
                    )}

                    <div className="mt-5">
                        <InputLabel htmlFor="email" value="Email" />
                        <TextInput
                            id="email"
                            type="email"
                            name="email"
                            value={data.email}
                            className="mt-1 block w-full"
                            autoComplete="username"
                            onChange={(event) => setData('email', event.target.value)}
                            required
                        />
                        <InputError message={errors.email} className="mt-2" />
                    </div>

                    <div className="mt-6 flex items-center justify-end">
                        <Link
                            href={route('login')}
                            className="text-sm text-gray-600 underline hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                            Déjà inscrit ?
                        </Link>
                        <PrimaryButton className="ms-4">Continuer</PrimaryButton>
                    </div>
                </form>
            ) : (
                <form onSubmit={submit}>
                    <div>
                        <InputLabel htmlFor="password" value="Mot de passe" />
                        <TextInput
                            id="password"
                            type="password"
                            name="password"
                            value={data.password}
                            className="mt-1 block w-full"
                            autoComplete="new-password"
                            isFocused={true}
                            onChange={(event) => setData('password', event.target.value)}
                            required
                        />
                        <InputError message={errors.password} className="mt-2" />
                    </div>

                    <div className="mt-5">
                        <InputLabel htmlFor="password_confirmation" value="Confirmer le mot de passe" />
                        <TextInput
                            id="password_confirmation"
                            type="password"
                            name="password_confirmation"
                            value={data.password_confirmation}
                            className="mt-1 block w-full"
                            autoComplete="new-password"
                            onChange={(event) => setData('password_confirmation', event.target.value)}
                            required
                        />
                        <InputError message={errors.password_confirmation} className="mt-2" />
                    </div>

                    <div className="mt-5 space-y-5">
                        {pieces.filter((piece) => piece.user_type === data.user_type).map((piece) => (
                            <div key={piece.id}>
                                <InputLabel htmlFor={`document-${piece.id}`} value={piece.nom} />
                                <input
                                    id={`document-${piece.id}`}
                                    type="file"
                                    accept=".pdf,.jpg,.jpeg,.png"
                                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-700 file:me-4 file:rounded-md file:border-0 file:bg-indigo-50 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-indigo-700"
                                    onChange={(event) => setData('documents', { ...data.documents, [piece.id]: event.target.files[0] ?? null })}
                                    required={piece.obligatoire}
                                />
                                <p className="mt-1 text-xs text-gray-500">PDF, JPG ou PNG — 10 Mo maximum.</p>
                                <InputError message={errors[`documents.${piece.id}`]} className="mt-2" />
                            </div>
                        ))}
                    </div>

                    <div className="mt-6 flex items-center justify-between">
                        <button
                            type="button"
                            onClick={() => setStep(1)}
                            className="text-sm text-gray-600 underline hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                            Retour
                        </button>
                        <PrimaryButton disabled={processing}>Créer mon compte</PrimaryButton>
                    </div>
                </form>
            )}
        </GuestLayout>
    );
}
