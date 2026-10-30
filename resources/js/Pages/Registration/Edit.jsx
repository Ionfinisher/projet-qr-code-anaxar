import { useForm } from '@inertiajs/react';
import GuestLayout from '@/Layouts/GuestLayout';
import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import PrimaryButton from '@/Components/PrimaryButton';
import TextInput from '@/Components/TextInput';
import { Head } from '@inertiajs/react';

export default function Edit({ registration, pieces }) {
    const { data, setData, post, processing, errors } = useForm({
        email: registration.email,
        nom: registration.nom || '',
        prenom: registration.prenom || '',
        raisonsociale: registration.raison_sociale || '',
        password: '',
        password_confirmation: '',
        documents: {},
    });

    const submit = (event) => {
        event.preventDefault();
        post(route('registration.update', registration.numero_dossier), { forceFormData: true });
    };

    return (
        <GuestLayout>
            <Head title="Modifier mon dossier" />
            <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">Modifier mon dossier</h1>
            <p className="mt-2 text-sm text-gray-600">Corrigez les informations demandées puis resoumettez votre dossier.</p>
            <form onSubmit={submit} className="mt-8">
                <div>
                    <InputLabel htmlFor="email" value="Email" />
                    <TextInput id="email" type="email" value={data.email} className="mt-1 block w-full" onChange={(event) => setData('email', event.target.value)} required />
                    <InputError message={errors.email} className="mt-2" />
                </div>
                {registration.user_type === 'societe' ? (
                    <div className="mt-5">
                        <InputLabel htmlFor="raisonsociale" value="Raison sociale" />
                        <TextInput id="raisonsociale" value={data.raisonsociale} className="mt-1 block w-full" onChange={(event) => setData('raisonsociale', event.target.value)} required />
                    </div>
                ) : (
                    <div className="mt-5 grid grid-cols-2 gap-4">
                        <TextInput value={data.nom} placeholder="Nom" onChange={(event) => setData('nom', event.target.value)} required />
                        <TextInput value={data.prenom} placeholder="Prénom" onChange={(event) => setData('prenom', event.target.value)} required />
                    </div>
                )}
                {pieces.map((piece) => (
                    <div className="mt-5" key={piece.id}>
                        <InputLabel htmlFor={`document-${piece.id}`} value={piece.nom} />
                        <input id={`document-${piece.id}`} type="file" accept=".pdf,.jpg,.jpeg,.png" className="mt-1 block w-full" required={piece.obligatoire} onChange={(event) => setData('documents', { ...data.documents, [piece.id]: event.target.files[0] })} />
                        <InputError message={errors[`documents.${piece.id}`]} className="mt-2" />
                    </div>
                ))}
                <PrimaryButton className="mt-6" disabled={processing}>Resoumettre</PrimaryButton>
            </form>
        </GuestLayout>
    );
}
