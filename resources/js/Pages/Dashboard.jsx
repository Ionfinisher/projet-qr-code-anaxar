import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link } from '@inertiajs/react';
import { Card, PageHeader } from '@/Components/ui';

export default function Dashboard({ auth }) {
    const isTransporteur = !auth?.user?.is_admin
        && ['societe', 'transitaire', 'particulier'].includes(auth?.user?.user_type);

    return (
        <AuthenticatedLayout user={auth?.user}>
            <Head title="Tableau de bord" />

            <div className="flex flex-col gap-6">
                <PageHeader
                    title="Tableau de bord"
                    subtitle={`Bienvenue, ${auth?.user?.name || 'utilisateur'}.`}
                />

                {isTransporteur ? (
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                        <Link
                            href={route('transporteur.rdv.index')}
                            className="flex flex-col gap-2 rounded-2xl border border-slate-200 bg-white p-6 shadow-xs transition hover:border-brand-500 hover:shadow-md"
                        >
                            <h3 className="text-lg font-bold text-slate-900">Rendez-vous validés</h3>
                            <p className="text-sm text-slate-600">
                                Accédez à vos passes de passage et QR codes signés.
                            </p>
                        </Link>
                        <Link
                            href={route('transporteur.demandes.index')}
                            className="flex flex-col gap-2 rounded-2xl border border-slate-200 bg-white p-6 shadow-xs transition hover:border-brand-500 hover:shadow-md"
                        >
                            <h3 className="text-lg font-bold text-slate-900">Demandes de rendez-vous</h3>
                            <p className="text-sm text-slate-600">
                                Suivez l'état de traitement de vos demandes soumises.
                            </p>
                        </Link>
                        <Link
                            href={route('transporteur.creneaux.index')}
                            className="flex flex-col gap-2 rounded-2xl border border-slate-200 bg-white p-6 shadow-xs transition hover:border-brand-500 hover:shadow-md"
                        >
                            <h3 className="text-lg font-bold text-slate-900">Créneaux disponibles</h3>
                            <p className="text-sm text-slate-600">
                                Consultez les disponibilités et planifiez une nouvelle réservation.
                            </p>
                        </Link>
                    </div>
                ) : (
                    <Card>
                        <p className="text-slate-700">Connecté avec succès.</p>
                    </Card>
                )}
            </div>
        </AuthenticatedLayout>
    );
}