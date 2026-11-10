import { router } from '@inertiajs/react';
import { Button } from '@/Components/ui';

/** Boutons Modifier / Annuler d'une demande, selon les droits calculés côté serveur. */
export default function DemandeActions({ demande, onCancel }) {
    if (!demande) return null;

    return (
        <div className="flex flex-wrap items-center gap-2">
            {demande.can_modify ? (
                <Button
                    variant="secondary"
                    size="sm"
                    icon="pencil"
                    onClick={() => router.get(route('transporteur.demandes.edit', demande.reference))}
                >
                    Modifier
                </Button>
            ) : null}
            {demande.can_cancel ? (
                <Button
                    variant="danger-outline"
                    size="sm"
                    icon="calendar-x"
                    onClick={onCancel}
                >
                    Annuler
                </Button>
            ) : null}
        </div>
    );
}
