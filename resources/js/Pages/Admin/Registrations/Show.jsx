import { useForm, Link, router } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head } from '@inertiajs/react';
import PrimaryButton from '@/Components/PrimaryButton';

export default function Show({ registration }) {
    const rejectForm = useForm({ raison: '' });
    const approve = () => window.confirm('Valider ce dossier ?') && router.post(route('admin.registrations.approve', registration.id));
    const reject = (event) => {
        event.preventDefault();
        rejectForm.post(route('admin.registrations.reject', registration.id));
    };

    return (
        <AuthenticatedLayout header={<h2 className="text-xl font-semibold leading-tight text-gray-800">Dossier {registration.numero_dossier}</h2>}>
            <Head title={`Dossier ${registration.numero_dossier}`} />
            <div className="mx-auto max-w-4xl space-y-6 p-6">
                <div className="rounded-lg bg-white p-6 shadow-sm">
                    <p><strong>Email :</strong> {registration.email}</p>
                    <p className="mt-2"><strong>Statut :</strong> {registration.statut}</p>
                    <h3 className="mt-6 font-semibold">Documents</h3>
                    <ul className="mt-2 list-disc ps-5">
                        {registration.pieceinscriptions.map((piece) => <li key={piece.id}><a className="text-indigo-700 underline" href={route('admin.registrations.documents.download', piece.id)}>Télécharger le document</a></li>)}
                    </ul>
                </div>
                {registration.statut === 'pending' && (
                    <div className="rounded-lg bg-white p-6 shadow-sm">
                        <div className="flex gap-3"><PrimaryButton type="button" onClick={approve}>Valider</PrimaryButton></div>
                        <form onSubmit={reject} className="mt-6">
                            <textarea value={rejectForm.data.raison} onChange={(event) => rejectForm.setData('raison', event.target.value)} className="w-full rounded-md border-gray-300" placeholder="Motif du rejet" required />
                            <PrimaryButton className="mt-3" disabled={rejectForm.processing}>Rejeter</PrimaryButton>
                        </form>
                    </div>
                )}
                <Link href={route('admin.registrations.index')} className="text-sm text-indigo-700 underline">Retour à la liste</Link>
            </div>
        </AuthenticatedLayout>
    );
}
