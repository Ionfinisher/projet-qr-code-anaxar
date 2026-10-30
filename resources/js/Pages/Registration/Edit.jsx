import { Head, useForm } from '@inertiajs/react';
import GuestLayout from '@/Layouts/GuestLayout';
import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import PrimaryButton from '@/Components/PrimaryButton';
import TextInput from '@/Components/TextInput';

const pieceAccept = (piece) => {
    const extensions = (piece.extension || 'pdf,jpg,jpeg,png')
        .split(',')
        .map((extension) => extension.trim().toLowerCase())
        .filter(Boolean);

    return extensions.map((extension) => `.${extension}`).join(',');
};

export default function Edit({ registration, pieces = [] }) {
    const { data, setData, post, processing, errors } = useForm({
        email: registration.email,
        nom: registration.nom || '',
        prenom: registration.prenom || '',
        raison_sociale: registration.raisonsociale || '',
        telephone: registration.telephone || '',
        adresse: registration.adresse || '',
        password: '',
        password_confirmation: '',
        documents: {},
    });

    const submit = (event) => {
        event.preventDefault();
        post(route('registration.update', registration.numero_dossier), { forceFormData: true });
    };

    const setDocument = (pieceId, file) => {
        setData('documents', { ...data.documents, [pieceId]: file ?? null });
    };

    return (
        <GuestLayout>
            <Head title="Modifier mon dossier" />
            <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">Modifier mon dossier</h1>
            <p className="mt-2 text-sm text-gray-600">
                Dossier {registration.numero_dossier} — corrigez les informations demandées puis resoumettez-le.
            </p>
            {registration.rejection_reason && (
                <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-800">
                    <strong>Motif du rejet :</strong> {registration.rejection_reason}
                </div>
            )}

            <form onSubmit={submit} className="mt-8">
                <div>
                    <InputLabel htmlFor="email" value="Email" />
                    <TextInput
                        id="email"
                        type="email"
                        value={data.email}
                        className="mt-1 block w-full bg-gray-100"
                        onChange={(event) => setData('email', event.target.value)}
                        readOnly
                    />
                    <p className="mt-1 text-xs text-gray-500">
                        L'email sert à identifier votre dossier et ne peut pas être modifié ici.
                    </p>
                    <InputError message={errors.email} className="mt-2" />
                </div>

                {registration.user_type === 'societe' ? (
                    <div className="mt-5">
                        <InputLabel htmlFor="raison_sociale" value="Raison sociale" />
                        <TextInput
                            id="raison_sociale"
                            value={data.raison_sociale}
                            className="mt-1 block w-full"
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
                                value={data.nom}
                                className="mt-1 block w-full"
                                onChange={(event) => setData('nom', event.target.value)}
                                required
                            />
                            <InputError message={errors.nom} className="mt-2" />
                        </div>
                        <div>
                            <InputLabel htmlFor="prenom" value="Prénom" />
                            <TextInput
                                id="prenom"
                                value={data.prenom}
                                className="mt-1 block w-full"
                                onChange={(event) => setData('prenom', event.target.value)}
                                required
                            />
                            <InputError message={errors.prenom} className="mt-2" />
                        </div>
                    </div>
                )}

                <div className="mt-5">
                    <InputLabel htmlFor="telephone" value="Téléphone" />
                    <TextInput
                        id="telephone"
                        type="tel"
                        value={data.telephone}
                        className="mt-1 block w-full"
                        onChange={(event) => setData('telephone', event.target.value)}
                        required
                    />
                    <InputError message={errors.telephone} className="mt-2" />
                </div>

                <div className="mt-5">
                    <InputLabel htmlFor="adresse" value="Adresse (optionnel)" />
                    <TextInput
                        id="adresse"
                        value={data.adresse}
                        className="mt-1 block w-full"
                        onChange={(event) => setData('adresse', event.target.value)}
                    />
                    <InputError message={errors.adresse} className="mt-2" />
                </div>

                <div className="mt-8 space-y-5">
                    <h3 className="text-sm font-semibold text-gray-900">Pièces à fournir</h3>
                    {pieces.map((piece) => (
                        <div key={piece.id}>
                            <InputLabel
                                htmlFor={`document-${piece.id}`}
                                value={`${piece.libelle}${piece.isrequired ? ' *' : ' (optionnel)'}`}
                            />
                            {piece.description && (
                                <p className="mt-1 text-xs text-gray-500">{piece.description}</p>
                            )}
                            {piece.already_provided && (
                                <p className="mt-1 text-xs font-medium text-green-700">
                                    Un document a déjà été fourni. Choisissez un nouveau fichier pour le remplacer.
                                </p>
                            )}
                            <input
                                id={`document-${piece.id}`}
                                type="file"
                                accept={pieceAccept(piece)}
                                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-700 file:me-4 file:rounded-md file:border-0 file:bg-indigo-50 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-indigo-700"
                                onChange={(event) => setDocument(piece.id, event.target.files[0])}
                                required={!piece.already_provided && piece.isrequired}
                            />
                            <p className="mt-1 text-xs text-gray-500">PDF, JPG ou PNG — 10 Mo maximum.</p>
                            <InputError message={errors[`documents.${piece.id}`]} className="mt-2" />
                        </div>
                    ))}
                </div>

                <div className="mt-8 border-t border-gray-200 pt-6">
                    <p className="text-sm text-gray-600">
                        Pour changer votre mot de passe, renseignez les deux champs ci-dessous. Sinon, laissez-les vides.
                    </p>
                    <div className="mt-4">
                        <InputLabel htmlFor="password" value="Nouveau mot de passe (optionnel)" />
                        <TextInput
                            id="password"
                            type="password"
                            value={data.password}
                            className="mt-1 block w-full"
                            autoComplete="new-password"
                            onChange={(event) => setData('password', event.target.value)}
                        />
                        <InputError message={errors.password} className="mt-2" />
                    </div>
                    <div className="mt-4">
                        <InputLabel htmlFor="password_confirmation" value="Confirmer le mot de passe" />
                        <TextInput
                            id="password_confirmation"
                            type="password"
                            value={data.password_confirmation}
                            className="mt-1 block w-full"
                            autoComplete="new-password"
                            onChange={(event) => setData('password_confirmation', event.target.value)}
                        />
                        <InputError message={errors.password_confirmation} className="mt-2" />
                    </div>
                </div>

                <PrimaryButton className="mt-6" disabled={processing}>
                    Resoumettre mon dossier
                </PrimaryButton>
            </form>
        </GuestLayout>
    );
}
