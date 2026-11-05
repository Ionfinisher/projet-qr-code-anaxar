import { Head, Link } from '@inertiajs/react';
import { TransporteurLayout } from '@/Layouts/TransporteurLayout';
import { Badge, PageHeader, buttonClass } from '@/Components/ui';
import DemandeForm from './DemandeForm';
import { statusMeta } from './status';

export default function Edit({ demande, slots, me }) {
    const status = statusMeta(demande.status);

    return (
        <TransporteurLayout inertia>
            <Head title={`Modifier ${demande.reference}`} />

            <PageHeader
                eyebrow="Transporteur"
                title={`Modifier ${demande.reference}`}
                subtitle="Mettez à jour le créneau, les camions ou les documents. La demande devra être validée à nouveau si nécessaire."
                actions={(
                    <>
                        <Badge tone={status.tone} icon={status.icon}>{status.label}</Badge>
                        <Link
                            href={route('transporteur.demandes.sent', demande.reference)}
                            className={buttonClass({ variant: 'secondary' })}
                        >
                            Voir la demande
                        </Link>
                    </>
                )}
            />

            <DemandeForm mode="edit" demande={demande} slots={slots} me={me} />
        </TransporteurLayout>
    );
}
