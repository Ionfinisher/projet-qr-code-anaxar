import { Head, Link, useForm } from '@inertiajs/react';
import PublicLayout from '@/Layouts/PublicLayout';
import { PageHeader } from '@/Components/ui/Navigation';
import { Field, Input } from '@/Components/ui/Field';
import { Button } from '@/Components/ui/Button';
import { Badge } from '@/Components/ui/Badge';
import { Alert } from '@/Components/ui/Feedback';
import { Icon } from '@/Components/ui/Icon';
import { cn } from '@/Lib/cn';

export default function Edit({ registration, pieces = [] }) {
    const { data, setData, post, processing, errors } = useForm({
        email: registration.email,
        nom: registration.nom || '',
        prenom: registration.prenom || '',
        raison_sociale: registration.raisonsociale || '',
        telephone: registration.telephone || '',
        adresse: registration.adresse || '',
        password: '',
        password_confirmation: '',
        documents: {},
    });

    const pieceAccept = (piece) => {
        const extensions = (piece.extension || 'pdf,jpg,jpeg,png')
            .split(',')
            .map((extension) => extension.trim().toLowerCase())
            .filter(Boolean);
        return extensions.map((extension) => `.${extension}`).join(',');
    };

    const submit = (e) => {
        e.preventDefault();
        post(route('registration.update', registration.numero_dossier), { forceFormData: true });
    };

    const setDocument = (pieceId, file) => {
        setData('documents', { ...data.documents, [pieceId]: file ?? null });
    };

    const formatFileSize = (bytes) => {
        if (!bytes) return '';
        if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} Ko`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
    };

    return (
        <PublicLayout wide={false}>
            <Head title={`Modifier le dossier ${registration.numero_dossier}`} />

            <div className="flex flex-col gap-6">
                <PageHeader
                    eyebrow={`Mise à jour · ${registration.numero_dossier}`}
                    title="Compléter mon dossier d’inscription"
                    subtitle="Corrigez les informations et téléversez les nouvelles pièces demandées par l’administration portuaire."
                    className="mb-0"
                />

                {registration.rejection_reason && (
                    <Alert tone="warn" icon="file-up" title="Compléments demandés par l’administration">
                        {registration.rejection_reason}
                    </Alert>
                )}

                <form
                    onSubmit={submit}
                    className="flex flex-col gap-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8"
                    noValidate
                >
                    <div className="flex flex-col gap-4 border-b border-slate-100 pb-6">
                        <h2 className="text-base font-semibold text-slate-900">1. Coordonnées et informations</h2>

                        <Field
                            id="edit-email"
                            label="Adresse e-mail"
                            hint="L'adresse e-mail sert d'identifiant unique et ne peut être modifiée ici."
                        >
                            <Input
                                id="edit-email"
                                type="email"
                                value={data.email}
                                readOnly
                                disabled
                                className="bg-slate-100 font-mono text-slate-600"
                            />
                        </Field>

                        {registration.user_type === 'societe' ? (
                            <Field
                                id="edit-raison"
                                label="Raison sociale"
                                required
                                error={errors.raison_sociale}
                            >
                                <Input
                                    id="edit-raison"
                                    value={data.raison_sociale}
                                    onChange={(e) => setData('raison_sociale', e.target.value)}
                                    required
                                />
                            </Field>
                        ) : (
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <Field id="edit-nom" label="Nom" required error={errors.nom}>
                                    <Input
                                        id="edit-nom"
                                        value={data.nom}
                                        onChange={(e) => setData('nom', e.target.value)}
                                        required
                                    />
                                </Field>
                                <Field id="edit-prenom" label="Prénom" required error={errors.prenom}>
                                    <Input
                                        id="edit-prenom"
                                        value={data.prenom}
                                        onChange={(e) => setData('prenom', e.target.value)}
                                        required
                                    />
                                </Field>
                            </div>
                        )}

                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <Field id="edit-phone" label="Téléphone" required error={errors.telephone}>
                                <Input
                                    id="edit-phone"
                                    type="tel"
                                    value={data.telephone}
                                    onChange={(e) => setData('telephone', e.target.value)}
                                    required
                                />
                            </Field>
                            <Field id="edit-adresse" label="Adresse" error={errors.adresse}>
                                <Input
                                    id="edit-adresse"
                                    value={data.adresse}
                                    onChange={(e) => setData('adresse', e.target.value)}
                                />
                            </Field>
                        </div>
                    </div>

                    <div className="flex flex-col gap-4">
                        <h2 className="text-base font-semibold text-slate-900">2. Pièces justificatives</h2>
                        <p className="text-xs text-slate-500">
                            Sélectionnez un nouveau fichier pour remplacer un document précédemment téléversé ou compléter une pièce manquante.
                        </p>

                        <div className="flex flex-col gap-3">
                            {pieces.map((piece) => {
                                const newFile = data.documents[piece.id];
                                const docError = errors[`documents.${piece.id}`];

                                return (
                                    <div
                                        key={piece.id}
                                        className={cn(
                                            'rounded-2xl border p-4 transition-all',
                                            newFile
                                                ? 'border-emerald-200 bg-emerald-50/30'
                                                : docError
                                                ? 'border-rose-300 bg-rose-50/20'
                                                : 'border-slate-200 bg-slate-50/40'
                                        )}
                                    >
                                        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <Icon name="file-text" size={18} className="text-brand-600" />
                                                    <span className="font-semibold text-slate-900">{piece.libelle}</span>
                                                    {piece.already_provided && !newFile && (
                                                        <Badge tone="ok" size="sm" icon="check">
                                                            Déjà fourni
                                                        </Badge>
                                                    )}
                                                    <Badge tone={piece.isrequired ? 'bad' : 'neutral'} size="sm">
                                                        {piece.isrequired ? 'Obligatoire' : 'Optionnel'}
                                                    </Badge>
                                                </div>
                                                {piece.description && (
                                                    <p className="mt-1 text-xs text-slate-500 sm:ml-6">
                                                        {piece.description}
                                                    </p>
                                                )}
                                            </div>

                                            <div className="shrink-0 sm:ml-4">
                                                {newFile ? (
                                                    <div className="flex items-center gap-2">
                                                        <span className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-300 bg-emerald-100/60 px-2.5 py-1 text-xs font-medium text-emerald-800">
                                                            <Icon name="check" size={14} />
                                                            <span className="max-w-[140px] truncate">{newFile.name}</span>
                                                            <span className="text-emerald-600">({formatFileSize(newFile.size)})</span>
                                                        </span>
                                                        <button
                                                            type="button"
                                                            onClick={() => setDocument(piece.id, null)}
                                                            className="rounded-lg p-1 text-slate-400 hover:bg-slate-200 hover:text-rose-600"
                                                            title="Supprimer ce fichier"
                                                        >
                                                            <Icon name="trash-2" size={16} />
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition-colors hover:border-brand-500 hover:bg-brand-50 hover:text-brand-700">
                                                        <Icon name="upload" size={15} />
                                                        <span>{piece.already_provided ? 'Remplacer le fichier' : 'Téléverser le fichier'}</span>
                                                        <input
                                                            type="file"
                                                            accept={pieceAccept(piece)}
                                                            className="sr-only"
                                                            onChange={(e) => setDocument(piece.id, e.target.files?.[0] || null)}
                                                        />
                                                    </label>
                                                )}
                                            </div>
                                        </div>

                                        {docError && (
                                            <p role="alert" className="mt-2 text-xs font-medium text-rose-700 sm:ml-6">
                                                {docError}
                                            </p>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-5">
                        <Link
                            href={route('registration.status', { email: registration.email, numero_dossier: registration.numero_dossier })}
                            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
                        >
                            <Icon name="arrow-left" size={16} /> Annuler
                        </Link>

                        <Button
                            type="submit"
                            size="lg"
                            icon="send"
                            loading={processing}
                            disabled={processing}
                        >
                            {processing ? 'Envoi en cours…' : 'Envoyer la mise à jour'}
                        </Button>
                    </div>
                </form>
            </div>
        </PublicLayout>
    );
}
