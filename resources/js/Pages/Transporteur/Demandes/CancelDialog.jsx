import { useState } from 'react';
import { router } from '@inertiajs/react';
import { Alert, Button, Field, Modal, Select, Textarea } from '@/Components/ui';
import { CANCEL_REASONS } from './status';

export default function CancelDialog({ reference, onClose }) {
    const [motif, setMotif] = useState(CANCEL_REASONS[0]);
    const [custom, setCustom] = useState('');
    const [processing, setProcessing] = useState(false);
    const [error, setError] = useState(null);

    const reason = motif === 'Autre motif' ? custom.trim() : motif;
    const canSubmit = reason.length > 0 && reason.length <= 500 && !processing;

    const submit = () => {
        if (!canSubmit) return;
        setProcessing(true);
        setError(null);

        router.post(
            route('transporteur.demandes.cancel', reference),
            { reason },
            {
                preserveScroll: true,
                onSuccess: () => onClose(),
                onError: (errors) => setError(errors.reason || errors.demande || 'Annulation impossible.'),
                onFinish: () => setProcessing(false),
            },
        );
    };

    return (
        <Modal
            open
            onClose={onClose}
            title="Annuler la demande"
            description={reference}
            size="sm"
            footer={(
                <>
                    <Button variant="secondary" onClick={onClose} disabled={processing}>Retour</Button>
                    <Button variant="danger" icon="calendar-x" loading={processing} disabled={!canSubmit} onClick={submit}>
                        Annuler la demande
                    </Button>
                </>
            )}
        >
            {error ? <Alert tone="bad" title="Annulation impossible">{error}</Alert> : null}

            <Field id="cancel-reason" label="Motif de l’annulation" required>
                <Select
                    id="cancel-reason"
                    value={motif}
                    onChange={(event) => setMotif(event.target.value)}
                    disabled={processing}
                >
                    {CANCEL_REASONS.map((item) => <option key={item} value={item}>{item}</option>)}
                </Select>
            </Field>

            {motif === 'Autre motif' ? (
                <Field
                    id="cancel-custom"
                    label="Précisez le motif"
                    required
                    hint={`${custom.length}/500 caractères`}
                    error={custom.length > 500 ? '500 caractères maximum.' : null}
                >
                    <Textarea
                        id="cancel-custom"
                        rows={3}
                        value={custom}
                        maxLength={500}
                        onChange={(event) => setCustom(event.target.value)}
                        disabled={processing}
                        placeholder="Ex. conteneur non encore libéré par la douane"
                    />
                </Field>
            ) : null}

            <p className="text-sm text-slate-500">
                Cette action libère immédiatement la place occupée par vos camions. Elle est définitive.
            </p>
        </Modal>
    );
}
