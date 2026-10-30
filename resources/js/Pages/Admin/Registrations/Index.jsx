import { Link } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head } from '@inertiajs/react';

export default function Index({ registrations }) {
    return (
        <AuthenticatedLayout header={<h2 className="text-xl font-semibold leading-tight text-gray-800">Dossiers d'inscription</h2>}>
            <Head title="Dossiers d'inscription" />
            <div className="mx-auto max-w-7xl p-6">
                <div className="overflow-hidden bg-white shadow-sm sm:rounded-lg">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200 text-sm">
                            <thead className="bg-gray-50"><tr><th className="px-6 py-3 text-start">Dossier</th><th className="px-6 py-3 text-start">Demandeur</th><th className="px-6 py-3 text-start">Email</th><th className="px-6 py-3 text-start">Statut</th><th /></tr></thead>
                            <tbody className="divide-y divide-gray-200">
                                {registrations.data.map((registration) => (
                                    <tr key={registration.id}>
                                        <td className="px-6 py-4">{registration.numero_dossier}</td>
                                        <td className="px-6 py-4">{registration.name}</td>
                                        <td className="px-6 py-4">{registration.email}</td>
                                        <td className="px-6 py-4">{registration.status}</td>
                                        <td className="px-6 py-4 text-end"><Link className="text-indigo-700 underline" href={route('admin.registrations.show', registration.id)}>Consulter</Link></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
