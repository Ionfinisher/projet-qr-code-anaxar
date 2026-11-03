import { useState } from 'react';
import { Head, Link, router, useForm } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { PageHeader } from '@/Components/ui/Navigation';
import { Card } from '@/Components/ui/Card';
import { Badge } from '@/Components/ui/Badge';
import { Button, buttonClass } from '@/Components/ui/Button';
import { Textarea } from '@/Components/ui/Field';
import { Alert } from '@/Components/ui/Feedback';
import { Icon } from '@/Components/ui/Icon';

const PRESET_REASONS = [
    'Document téléversé illisible ou tronqué.',
    'Numéro RCCM ou NIF non concordant avec les pièces fournies.',
    'Pièce d’identité expirée ou non valide.',
    'Attestation d’assurance ou licence de transport manquante.',
];

const STATUS_MAP = {
    pending: { label: 'À traiter', tone: 'warn', icon: 'clock' },
    approved: { label: 'Validée', tone: 'ok', icon: 'check' },
    rejected: { label: 'À corriger', tone: 'bad', icon: 'triangle-alert' },
};

export default function Show({ auth, registration }) {
    const rejectForm = useForm({ raison: '' });
    const [confirmApprove, setConfirmApprove] = useState(false);

    const transporteur = registration.transporteur;
    const pieces = registration.pieceinscriptions || [];
    const isPending = registration.statut === 'pending';

    const statusConfig = STATUS_MAP[registration.statut] || {
        label: registration.statut,
        tone: 'neutral',
        icon: 'file-text',
    };

    const applicantName =
        transporteur?.raisonsociale ||
        `${transporteur?.prenom ?? ''} ${transporteur?.nom ?? ''}`.trim() ||
        'Demandeur sans nom';

    const handleApprove = () => {
        router.post(route('admin.registrations.approve', registration.id));
    };

    const handleReject = (e) => {
        e.preventDefault();
        rejectForm.post(route('admin.registrations.reject', registration.id), {
            onSuccess: () => rejectForm.reset(),
        });
    };

    return (
        <AuthenticatedLayout user={auth.user}>
            <Head title={`Dossier ${registration.numero_dossier}`} />

            <div className="flex flex-col gap-6">
                <PageHeader
                    eyebrow="Demande d’inscription"
                    title={`Dossier ${registration.numero_dossier}`}
                    subtitle={`Déposé par ${applicantName}`}
                    className="mb-0"
                    actions={
                        <Link
                            href={route('admin.registrations.index')}
                            className={buttonClass({ variant: 'ghost', size: 'sm' })}
                        >
                            <Icon name="arrow-left" size={16} /> Retour à la liste
                        </Link>
                    }
                />

                <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] lg:gap-8">
                    {/* Left Column: Dossier Information & Documents */}
                    <div className="flex flex-col gap-6">
                        {/* Status Bar */}
                        <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                            <div>
                                <span className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
                                    Statut de la demande
                                </span>
                                <span className="text-base font-bold text-slate-900">
                                    {statusConfig.label}
                                </span>
                            </div>
                            <Badge tone={statusConfig.tone} icon={statusConfig.icon} size="lg">
                                {statusConfig.label}
                            </Badge>
                        </div>

                        {registration.latest_rejection && registration.statut === 'rejected' && (
                            <Alert tone="bad" icon="file-up" title="Dernier motif de rejet / corrections demandées">
                                {registration.latest_rejection.raison}
                            </Alert>
                        )}

                        {registration.statut === 'approved' && (
                            <Alert tone="ok" icon="check" title="Dossier validé">
                                Ce dossier a été validé. Le compte transporteur associé et ses accès sont actifs.
                            </Alert>
                        )}

                        {/* Identity & Contact Card */}
                        <Card>
                            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-500">
                                Informations du transporteur
                            </h3>
                            <dl className="grid grid-cols-1 gap-x-4 gap-y-4 sm:grid-cols-2 text-sm">
                                <div>
                                    <dt className="text-xs text-slate-500">Type de transporteur</dt>
                                    <dd className="font-semibold text-slate-900 capitalize">
                                        {transporteur?.typetransporteur || '—'}
                                    </dd>
                                </div>
                                <div>
                                    <dt className="text-xs text-slate-500">Nom / Raison sociale</dt>
                                    <dd className="font-semibold text-slate-900">{applicantName}</dd>
                                </div>
                                <div>
                                    <dt className="text-xs text-slate-500">Adresse e-mail</dt>
                                    <dd className="font-mono text-slate-900">{registration.email}</dd>
                                </div>
                                <div>
                                    <dt className="text-xs text-slate-500">Téléphone</dt>
                                    <dd className="text-slate-900">{transporteur?.telephone || '—'}</dd>
                                </div>
                                {transporteur?.adresse && (
                                    <div className="sm:col-span-2">
                                        <dt className="text-xs text-slate-500">Adresse postale</dt>
                                        <dd className="text-slate-900">{transporteur.adresse}</dd>
                                    </div>
                                )}
                            </dl>
                        </Card>

                        {/* Documents Provided */}
                        <Card>
                            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-500">
                                Pièces justificatives téléversées
                            </h3>

                            {pieces.length === 0 ? (
                                <p className="text-sm text-slate-500">Aucun document joint à ce dossier.</p>
                            ) : (
                                <div className="flex flex-col gap-3">
                                    {pieces.map((piece) => (
                                        <div
                                            key={piece.id}
                                            className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50/50 p-3.5 transition-colors hover:bg-slate-50"
                                        >
                                            <div className="flex items-center gap-3 min-w-0">
                                                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
                                                    <Icon name="file-text" size={18} />
                                                </div>
                                                <div className="min-w-0">
                                                    <span className="block truncate font-semibold text-sm text-slate-900">
                                                        {piece.pieceafournir?.libelle || 'Document justificatif'}
                                                    </span>
                                                    <span className="block text-xs text-slate-400">
                                                        Statut : {piece.statut}
                                                    </span>
                                                </div>
                                            </div>

                                            <a
                                                href={route('admin.registrations.documents.download', piece.id)}
                                                className={buttonClass({ variant: 'secondary', size: 'sm' })}
                                            >
                                                <Icon name="download" size={15} /> Télécharger
                                            </a>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </Card>
                    </div>

                    {/* Right Column: Decision Actions */}
                    <div className="flex flex-col gap-6">
                        {isPending ? (
                            <>
                                {/* Validation Card */}
                                <Card className="border-emerald-200 bg-emerald-50/30">
                                    <div className="flex items-start gap-3">
                                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-600 text-white">
                                            <Icon name="check" size={18} />
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-slate-900">Valider ce dossier</h3>
                                            <p className="mt-1 text-xs text-slate-600">
                                                La validation ouvrira le compte du transporteur et lui enverra un e-mail de confirmation.
                                            </p>
                                        </div>
                                    </div>

                                    {confirmApprove ? (
                                        <div className="mt-4 flex flex-col gap-2 rounded-xl bg-white p-3 border border-emerald-200">
                                            <p className="text-xs font-semibold text-slate-900">
                                                Confirmez-vous l’ouverture définitive de ce compte ?
                                            </p>
                                            <div className="flex gap-2">
                                                <Button
                                                    size="sm"
                                                    variant="primary"
                                                    onClick={handleApprove}
                                                >
                                                    Oui, valider
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    onClick={() => setConfirmApprove(false)}
                                                >
                                                    Annuler
                                                </Button>
                                            </div>
                                        </div>
                                    ) : (
                                        <Button
                                            className="mt-4 w-full"
                                            variant="primary"
                                            icon="check"
                                            onClick={() => setConfirmApprove(true)}
                                        >
                                            Valider l’inscription
                                        </Button>
                                    )}
                                </Card>

                                {/* Rejection / Compléments Card */}
                                <Card className="border-rose-200 bg-rose-50/20">
                                    <div className="flex items-start gap-3">
                                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-rose-600 text-white">
                                            <Icon name="triangle-alert" size={18} />
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-slate-900">Demander des compléments</h3>
                                            <p className="mt-1 text-xs text-slate-600">
                                                Indiquez au transporteur les pièces ou informations à corriger.
                                            </p>
                                        </div>
                                    </div>

                                    <form onSubmit={handleReject} className="mt-4 flex flex-col gap-3">
                                        <div>
                                            <label className="text-xs font-semibold text-slate-700 block mb-1">
                                                Motif du refus ou compléments attendus
                                            </label>
                                            <Textarea
                                                rows={4}
                                                placeholder="Précisez la raison du rejet..."
                                                value={rejectForm.data.raison}
                                                onChange={(e) => rejectForm.setData('raison', e.target.value)}
                                                required
                                            />
                                            {rejectForm.errors.raison && (
                                                <p className="mt-1 text-xs text-rose-700">{rejectForm.errors.raison}</p>
                                            )}
                                        </div>

                                        {/* Presets */}
                                        <div className="flex flex-col gap-1">
                                            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                                                Suggestions rapides :
                                            </span>
                                            <div className="flex flex-wrap gap-1.5">
                                                {PRESET_REASONS.map((preset) => (
                                                    <button
                                                        key={preset}
                                                        type="button"
                                                        onClick={() => rejectForm.setData('raison', preset)}
                                                        className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-left text-xs text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                                                    >
                                                        {preset}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        <Button
                                            type="submit"
                                            variant="danger"
                                            icon="x"
                                            loading={rejectForm.processing}
                                            disabled={rejectForm.processing || !rejectForm.data.raison.trim()}
                                            className="w-full mt-2"
                                        >
                                            {rejectForm.processing ? 'Envoi…' : 'Renvoyer pour correction'}
                                        </Button>
                                    </form>
                                </Card>
                            </>
                        ) : (
                            <Card className="text-center py-6">
                                <Icon name="shield-check" size={36} className="mx-auto text-slate-400" />
                                <h4 className="mt-2 text-sm font-semibold text-slate-800">
                                    Décision enregistrée
                                </h4>
                                <p className="mt-1 text-xs text-slate-500">
                                    Ce dossier est déjà {statusConfig.label.toLowerCase()}. Aucune action requise.
                                </p>
                            </Card>
                        )}
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
