import { useState } from 'react';
import { Head, Link } from '@inertiajs/react';
import { TransporteurLayout } from '@/Layouts/TransporteurLayout';
import { Alert, Badge, Button, PageHeader, buttonClass } from '@/Components/ui';
import DemandeDetail from './DemandeDetail';
import CancelDialog from './CancelDialog';
import { statusMeta } from './status';

export default function Sent({ demande, edited, notified_email }) {
    const [cancelling, setCancelling] = useState(false);
    const status = statusMeta(demande.status);

    return (
        <TransporteurLayout inertia>
            <Head title={`Demande ${demande.reference}`} />

            <PageHeader
                eyebrow="Transporteur"
                title={edited ? 'Demande mise à jour' : 'Demande envoyée'}
                subtitle={`Référence ${demande.reference}`}
                actions={(
                    <>
                        <Badge tone={status.tone} icon={status.icon}>{status.label}</Badge>
                        <Link href={route('transporteur.demandes.index')} className={buttonClass({ variant: 'secondary' })}>
                            Mes demandes
                        </Link>
                        <Link href={route('transporteur.demandes.create')} className={buttonClass({ variant: 'primary' })}>
                            Nouvelle demande
                        </Link>
                    </>
                )}
            />

            <div className="flex flex-col gap-5">
                <Alert tone="ok" title={edited ? 'Vos modifications ont été enregistrées' : 'Votre demande a bien été envoyée'}>
                    <p>
                        Référence <strong className="font-semibold">{demande.reference}</strong>. Un e-mail de confirmation
                        a été envoyé à <strong className="font-semibold">{notified_email}</strong>.
                    </p>
                    <p className="mt-1 text-sm">
                        Vous serez notifié dès que l’administration aura statué sur votre demande.
                    </p>
                </Alert>

                <DemandeDetail
                    demande={demande}
                    actions={(
                        <>
                            {demande.can_modify ? (
                                <Link
                                    href={route('transporteur.demandes.edit', demande.reference)}
                                    className={buttonClass({ variant: 'secondary', size: 'sm' })}
                                >
                                    Modifier
                                </Link>
                            ) : null}
                            {demande.can_cancel ? (
                                <Button
                                    size="sm"
                                    variant="danger-outline"
                                    icon="calendar-x"
                                    onClick={() => setCancelling(true)}
                                >
                                    Annuler
                                </Button>
                            ) : null}
                        </>
                    )}
                />
            </div>

            {cancelling ? (
                <CancelDialog reference={demande.reference} onClose={() => setCancelling(false)} />
            ) : null}
        </TransporteurLayout>
    );
}
