import { useState } from 'react';
import { Head, Link } from '@inertiajs/react';
import { TransporteurLayout } from '@/Layouts/TransporteurLayout';
import { PageHeader, buttonClass } from '@/Components/ui';
import CancelDialog from './CancelDialog';
import DemandeActions from './DemandeActions';
import DemandeDetail from './DemandeDetail';
import { statusMeta } from './status';

export default function Show({ demande }) {
    const [cancelling, setCancelling] = useState(false);
    const status = statusMeta(demande.status);

    return (
        <TransporteurLayout inertia>
            <Head title={`Demande ${demande.reference}`} />

            <PageHeader
                eyebrow="Transporteur"
                title="Détail de la demande"
                subtitle={`Référence ${demande.reference}`}
                actions={(
                    <>
                        <span className="rounded-full px-3 py-1 text-sm font-medium">
                            {status.label}
                        </span>
                        <Link
                            href={route('transporteur.demandes.index')}
                            className={buttonClass({ variant: 'secondary' })}
                        >
                            Mes demandes
                        </Link>
                    </>
                )}
            />

            <DemandeDetail
                demande={demande}
                actions={(
                    <DemandeActions
                        demande={demande}
                        onCancel={() => setCancelling(true)}
                    />
                )}
            />

            {cancelling ? (
                <CancelDialog
                    reference={demande.reference}
                    onClose={() => setCancelling(false)}
                />
            ) : null}
        </TransporteurLayout>
    );
}
