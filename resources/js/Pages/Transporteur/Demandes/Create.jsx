import { Head } from '@inertiajs/react';
import { useState } from 'react';
import { TransporteurLayout } from '@/Layouts/TransporteurLayout';
import DemandeForm from './DemandeForm';
import { ModePick } from '@/features/transporteur/components/wizard/ModePick';

export default function Create({ slots, initialSlot, me }) {
    const [truckMode, setTruckMode] = useState(null);

    return (
        <TransporteurLayout inertia>
            <Head title="Nouvelle demande de RDV" />
            {truckMode ? (
                <DemandeForm
                    mode="create"
                    truckMode={truckMode}
                    slots={slots}
                    initialSlot={initialSlot}
                    me={me}
                />
            ) : (
                <ModePick
                    initialSlot={initialSlot}
                    onPick={setTruckMode}
                    onCancel={() => window.history.back()}
                />
            )}
        </TransporteurLayout>
    );
}
