import { useEffect, useRef, useState } from 'react';
import { Head, Link, useForm } from '@inertiajs/react';
import PublicLayout from '@/Layouts/PublicLayout';
import { Field, Input, Select } from '@/Components/ui/Field';
import { PasswordInput, PasswordRules } from '@/Components/ui/PasswordInput';
import { RadioCards, Checkbox } from '@/Components/ui/Choice';
import { Button } from '@/Components/ui/Button';
import { Badge } from '@/Components/ui/Badge';
import { Alert } from '@/Components/ui/Feedback';
import { Icon } from '@/Components/ui/Icon';
import { cn } from '@/Lib/cn';

const STEPS = [
    { label: 'Identité', sub: 'Type d’activité et coordonnées' },
    { label: 'Contact & Sécurité', sub: 'E-mail et mot de passe' },
    { label: 'Pièces justificatives', sub: 'Téléversement des documents' },
    { label: 'Vérification & Envoi', sub: 'Récapitulatif et validation' },
];

export default function Register({ pays = [], pieces = [] }) {
    const [step, setStep] = useState(0);
    const [cguAccepted, setCguAccepted] = useState(false);
    const [stepErrors, setStepErrors] = useState({});
    const panelRef = useRef(null);

    const { data, setData, post, processing, errors, reset } = useForm({
        user_type: 'societe',
        idpays: pays[0]?.id ?? '',
        raison_sociale: '',
        nom: '',
        prenom: '',
        telephone: '',
        adresse: '',
        email: '',
        password: '',
        password_confirmation: '',
        documents: {},
    });

    useEffect(() => {
        return () => {
            reset('password', 'password_confirmation', 'documents');
        };
    }, []);

    // If backend returns validation errors, jump to the first erroneous step
    useEffect(() => {
        const errorKeys = Object.keys(errors);
        if (errorKeys.length === 0) return;

        if (errorKeys.some((k) => ['user_type', 'idpays', 'raison_sociale', 'nom', 'prenom', 'telephone', 'adresse'].includes(k))) {
            setStep(0);
        } else if (errorKeys.some((k) => ['email', 'password', 'password_confirmation'].includes(k))) {
            setStep(1);
        } else if (errorKeys.some((k) => k.startsWith('documents.'))) {
            setStep(2);
        }
    }, [errors]);

    const availablePieces = pieces.filter(
        (piece) =>
            !piece.type_de_piece ||
            piece.type_de_piece === 'all' ||
            piece.type_de_piece === data.user_type
    );

    const pieceAccept = (piece) => {
        const extensions = (piece.extension || 'pdf,jpg,jpeg,png')
            .split(',')
            .map((ext) => ext.trim().toLowerCase())
            .filter(Boolean);
        return extensions.map((ext) => `.${ext}`).join(',');
    };

    const validateStep = (s) => {
        const errs = {};
        if (s === 0) {
            if (data.user_type === 'societe' && !data.raison_sociale.trim()) {
                errs.raison_sociale = 'La raison sociale est requise.';
            }
            if (data.user_type === 'particulier') {
                if (!data.nom.trim()) errs.nom = 'Le nom est requis.';
                if (!data.prenom.trim()) errs.prenom = 'Le prénom est requis.';
            }
            if (!data.idpays) errs.idpays = 'Veuillez sélectionner un pays.';
            if (!data.telephone.trim()) errs.telephone = 'Le numéro de téléphone est requis.';
        } else if (s === 1) {
            if (!data.email.trim()) errs.email = 'L’adresse e-mail est requise.';
            if (!data.password) errs.password = 'Le mot de passe est requis.';
            if (data.password !== data.password_confirmation) {
                errs.password_confirmation = 'Les mots de passe ne correspondent pas.';
            }
        } else if (s === 2) {
            availablePieces.forEach((piece) => {
                if (piece.isrequired && !data.documents[piece.id]) {
                    errs[`documents.${piece.id}`] = `Le document « ${piece.libelle} » est obligatoire.`;
                }
            });
        }
        return errs;
    };

    const goTo = (targetStep) => {
        setStep(targetStep);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const next = () => {
        const errs = validateStep(step);
        setStepErrors(errs);
        if (Object.keys(errs).length > 0) return;
        goTo(step + 1);
    };

    const setDocument = (pieceId, file) => {
        setData('documents', { ...data.documents, [pieceId]: file ?? null });
        setStepErrors((prev) => {
            const next = { ...prev };
            delete next[`documents.${pieceId}`];
            return next;
        });
    };

    const submit = (e) => {
        e?.preventDefault();
        post(route('register'), { forceFormData: true });
    };

    const formatFileSize = (bytes) => {
        if (!bytes) return '';
        if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} Ko`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
    };

    const selectedCountry = pays.find((p) => String(p.id) === String(data.idpays));

    return (
        <PublicLayout wide>
            <Head title="Créer un compte transporteur" />

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-[280px_minmax(0,1fr)] lg:gap-10">
                {/* Stepper Navigation */}
                <aside>
                    <div className="hidden lg:sticky lg:top-24 lg:block">
                        <p className="mb-3 px-2 text-xs font-semibold uppercase tracking-[0.08em] text-brand-700">
                            Demande d’inscription
                        </p>
                        <ol className="flex flex-col gap-1">
                            {STEPS.map((s, i) => {
                                const ok = i < step;
                                const current = i === step;
                                return (
                                    <li key={s.label}>
                                        <button
                                            type="button"
                                            onClick={() => i < step && goTo(i)}
                                            disabled={i > step}
                                            aria-current={current ? 'step' : undefined}
                                            className={cn(
                                                'flex w-full cursor-pointer items-start gap-3 rounded-xl px-2 py-2.5 text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 disabled:cursor-not-allowed disabled:opacity-50',
                                                current
                                                    ? 'bg-white shadow-[0_1px_2px_rgba(15,23,42,0.08)] ring-1 ring-slate-200'
                                                    : 'hover:bg-white/70'
                                            )}
                                        >
                                            <span
                                                className={cn(
                                                    'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold',
                                                    ok
                                                        ? 'bg-emerald-600 text-white'
                                                        : current
                                                        ? 'bg-brand-600 text-white'
                                                        : 'bg-slate-200 text-slate-600'
                                                )}
                                            >
                                                {ok ? <Icon name="check" size={15} strokeWidth={3} /> : i + 1}
                                            </span>
                                            <span>
                                                <span className="block text-sm font-semibold text-slate-900">{s.label}</span>
                                                <span className="block text-xs text-slate-500">{s.sub}</span>
                                            </span>
                                        </button>
                                    </li>
                                );
                            })}
                        </ol>
                    </div>

                    {/* Mobile Progress Bar */}
                    <div className="flex flex-col gap-2 lg:hidden">
                        <div className="flex items-center justify-between text-sm text-slate-600">
                            <span>
                                Étape {step + 1} sur 4 · <strong className="text-slate-900">{STEPS[step].label}</strong>
                            </span>
                        </div>
                        <div
                            role="progressbar"
                            aria-valuemin={1}
                            aria-valuemax={4}
                            aria-valuenow={step + 1}
                            className="h-1.5 overflow-hidden rounded-full bg-slate-200"
                        >
                            <span
                                className="block h-full rounded-full bg-brand-600 transition-all"
                                style={{ width: `${((step + 1) / 4) * 100}%` }}
                            />
                        </div>
                    </div>
                </aside>

                {/* Main Form Panel */}
                <div
                    ref={panelRef}
                    className="flex min-w-0 flex-col gap-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.05)] sm:p-8"
                >
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-brand-700">
                            Créer un compte transporteur · étape {step + 1}
                        </p>
                        <h1 tabIndex={-1} className="mt-1.5 text-2xl font-bold tracking-tight text-slate-900 focus:outline-none">
                            {STEPS[step].label}
                        </h1>
                    </div>

                    {/* Step 0: Identité */}
                    {step === 0 && (
                        <div className="flex flex-col gap-5">
                            <div>
                                <label className="mb-2 block text-sm font-semibold text-slate-800">
                                    Type de compte
                                </label>
                                <RadioCards
                                    value={data.user_type}
                                    onChange={(val) => setData('user_type', val)}
                                    columns={2}
                                    options={[
                                        {
                                            value: 'societe',
                                            label: 'Société de transport / Transitaire',
                                            description: 'Flotte de camions, plusieurs chauffeurs ou activités de transit.',
                                            icon: 'building-2',
                                        },
                                        {
                                            value: 'particulier',
                                            label: 'Transporteur individuel',
                                            description: 'Chauffeur propriétaire ou artisan transporteur indépendant.',
                                            icon: 'user',
                                        },
                                    ]}
                                />
                            </div>

                            {data.user_type === 'societe' ? (
                                <Field
                                    id="reg-raison"
                                    label="Raison sociale de l’entreprise"
                                    required
                                    error={errors.raison_sociale || stepErrors.raison_sociale}
                                >
                                    <Input
                                        id="reg-raison"
                                        placeholder="Ex. Transports Togolais Réunis SARL"
                                        value={data.raison_sociale}
                                        onChange={(e) => setData('raison_sociale', e.target.value)}
                                    />
                                </Field>
                            ) : (
                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                    <Field
                                        id="reg-nom"
                                        label="Nom de famille"
                                        required
                                        error={errors.nom || stepErrors.nom}
                                    >
                                        <Input
                                            id="reg-nom"
                                            placeholder="Ex. KOFFI"
                                            value={data.nom}
                                            onChange={(e) => setData('nom', e.target.value)}
                                        />
                                    </Field>
                                    <Field
                                        id="reg-prenom"
                                        label="Prénom(s)"
                                        required
                                        error={errors.prenom || stepErrors.prenom}
                                    >
                                        <Input
                                            id="reg-prenom"
                                            placeholder="Ex. Yao Mensah"
                                            value={data.prenom}
                                            onChange={(e) => setData('prenom', e.target.value)}
                                        />
                                    </Field>
                                </div>
                            )}

                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <Field
                                    id="reg-pays"
                                    label="Pays d’immatriculation"
                                    required
                                    error={errors.idpays || stepErrors.idpays}
                                >
                                    <Select
                                        id="reg-pays"
                                        value={data.idpays}
                                        onChange={(e) => setData('idpays', e.target.value)}
                                    >
                                        {pays.map((p) => (
                                            <option key={p.id} value={p.id}>
                                                {p.nom} {p.indicatif ? `(${p.indicatif})` : ''}
                                            </option>
                                        ))}
                                    </Select>
                                </Field>

                                <Field
                                    id="reg-phone"
                                    label="Numéro de téléphone"
                                    required
                                    error={errors.telephone || stepErrors.telephone}
                                    hint="Joignable pour le suivi et les SMS de validation"
                                >
                                    <Input
                                        id="reg-phone"
                                        type="tel"
                                        placeholder="Ex. +228 90 11 22 33"
                                        value={data.telephone}
                                        onChange={(e) => setData('telephone', e.target.value)}
                                    />
                                </Field>
                            </div>

                            <Field id="reg-adresse" label="Adresse du siège / Domicile" error={errors.adresse}>
                                <Input
                                    id="reg-adresse"
                                    placeholder="Ex. Zone portuaire, Boulevard du Mono, Lomé"
                                    value={data.adresse}
                                    onChange={(e) => setData('adresse', e.target.value)}
                                />
                            </Field>
                        </div>
                    )}

                    {/* Step 1: Contact & Sécurité */}
                    {step === 1 && (
                        <div className="flex flex-col gap-5">
                            <Field
                                id="reg-email"
                                label="Adresse e-mail professionnelle"
                                required
                                error={errors.email || stepErrors.email}
                                hint="Sera utilisée comme identifiant principal de connexion"
                            >
                                <Input
                                    id="reg-email"
                                    type="email"
                                    autoComplete="username"
                                    placeholder="contact@societe.tg"
                                    value={data.email}
                                    onChange={(e) => setData('email', e.target.value)}
                                />
                            </Field>

                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <Field
                                    id="reg-pwd"
                                    label="Mot de passe"
                                    required
                                    error={errors.password || stepErrors.password}
                                >
                                    <PasswordInput
                                        id="reg-pwd"
                                        value={data.password}
                                        onChange={(val) => setData('password', val)}
                                        autoComplete="new-password"
                                    />
                                </Field>

                                <Field
                                    id="reg-pwd-conf"
                                    label="Confirmer le mot de passe"
                                    required
                                    error={errors.password_confirmation || stepErrors.password_confirmation}
                                >
                                    <PasswordInput
                                        id="reg-pwd-conf"
                                        value={data.password_confirmation}
                                        onChange={(val) => setData('password_confirmation', val)}
                                        autoComplete="new-password"
                                    />
                                </Field>
                            </div>

                            <PasswordRules value={data.password} />
                        </div>
                    )}

                    {/* Step 2: Pièces justificatives */}
                    {step === 2 && (
                        <div className="flex flex-col gap-4">
                            <p className="text-sm text-slate-500">
                                Veuillez téléverser les documents demandés par l’administration portuaire pour valider votre inscription. Formats acceptés : PDF, JPEG, PNG (max 10 Mo par fichier).
                            </p>

                            {availablePieces.length === 0 ? (
                                <Alert tone="info">Aucun document spécifique requis pour ce profil.</Alert>
                            ) : (
                                <div className="flex flex-col gap-3">
                                    {availablePieces.map((piece) => {
                                        const file = data.documents[piece.id];
                                        const docError = errors[`documents.${piece.id}`] || stepErrors[`documents.${piece.id}`];

                                        return (
                                            <div
                                                key={piece.id}
                                                className={cn(
                                                    'rounded-2xl border p-4 transition-all',
                                                    file
                                                        ? 'border-emerald-200 bg-emerald-50/30'
                                                        : docError
                                                        ? 'border-rose-300 bg-rose-50/20'
                                                        : 'border-slate-200 bg-slate-50/40 hover:border-slate-300'
                                                )}
                                            >
                                                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <Icon name="file-text" size={18} className="text-brand-600" />
                                                            <span className="font-semibold text-slate-900">{piece.libelle}</span>
                                                            <Badge tone={piece.isrequired ? 'bad' : 'neutral'} size="sm">
                                                                {piece.isrequired ? 'Obligatoire' : 'Optionnel'}
                                                            </Badge>
                                                            {piece.extension && (
                                                                <span className="text-xs uppercase text-slate-400 font-mono">
                                                                    {piece.extension}
                                                                </span>
                                                            )}
                                                        </div>
                                                        {piece.description && (
                                                            <p className="mt-1 text-xs text-slate-500 sm:ml-6">
                                                                {piece.description}
                                                            </p>
                                                        )}
                                                    </div>

                                                    <div className="shrink-0 sm:ml-4">
                                                        {file ? (
                                                            <div className="flex items-center gap-2">
                                                                <span className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-300 bg-emerald-100/60 px-2.5 py-1 text-xs font-medium text-emerald-800">
                                                                    <Icon name="check" size={14} />
                                                                    <span className="max-w-[140px] truncate">{file.name}</span>
                                                                    <span className="text-emerald-600">({formatFileSize(file.size)})</span>
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
                                                            <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition-colors hover:border-brand-500 hover:bg-brand-50 hover:text-brand-700 focus-within:ring-2 focus-within:ring-brand-500">
                                                                <Icon name="upload" size={15} />
                                                                <span>Sélectionner le fichier</span>
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
                            )}
                        </div>
                    )}

                    {/* Step 3: Vérification & Envoi */}
                    {step === 3 && (
                        <div className="flex flex-col gap-6">
                            <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 sm:p-5">
                                <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-500">
                                    Récapitulatif de votre dossier
                                </h3>

                                <dl className="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2 text-sm">
                                    <div>
                                        <dt className="text-xs text-slate-500">Type d’activité</dt>
                                        <dd className="font-semibold text-slate-900">
                                            {data.user_type === 'societe' ? 'Société de transport / Transitaire' : 'Transporteur individuel'}
                                        </dd>
                                    </div>
                                    <div>
                                        <dt className="text-xs text-slate-500">Nom / Raison sociale</dt>
                                        <dd className="font-semibold text-slate-900">
                                            {data.user_type === 'societe' ? data.raison_sociale : `${data.prenom} ${data.nom}`}
                                        </dd>
                                    </div>
                                    <div>
                                        <dt className="text-xs text-slate-500">Pays & Téléphone</dt>
                                        <dd className="text-slate-900">
                                            {selectedCountry?.nom || '—'} · {data.telephone}
                                        </dd>
                                    </div>
                                    <div>
                                        <dt className="text-xs text-slate-500">E-mail de contact</dt>
                                        <dd className="font-mono text-slate-900">{data.email}</dd>
                                    </div>
                                    {data.adresse && (
                                        <div className="sm:col-span-2">
                                            <dt className="text-xs text-slate-500">Adresse</dt>
                                            <dd className="text-slate-900">{data.adresse}</dd>
                                        </div>
                                    )}
                                    <div className="sm:col-span-2 border-t border-slate-200 pt-3">
                                        <dt className="text-xs text-slate-500 mb-1">Documents fournis</dt>
                                        <dd className="flex flex-wrap gap-2">
                                            {availablePieces.map((p) => {
                                                const file = data.documents[p.id];
                                                return (
                                                    <span
                                                        key={p.id}
                                                        className={cn(
                                                            'inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs',
                                                            file
                                                                ? 'bg-emerald-100 text-emerald-800'
                                                                : 'bg-slate-200 text-slate-600'
                                                        )}
                                                    >
                                                        <Icon name={file ? 'check' : 'x'} size={12} />
                                                        {p.libelle}
                                                    </span>
                                                );
                                            })}
                                        </dd>
                                    </div>
                                </dl>
                            </div>

                            <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 p-4 transition-colors hover:bg-slate-50">
                                <Checkbox
                                    checked={cguAccepted}
                                    onChange={setCguAccepted}
                                    className="mt-0.5"
                                />
                                <span className="text-sm text-slate-700 leading-snug">
                                    J’accepte les Conditions Générales d’Utilisation (CGU) et certifie sur l’honneur l’exactitude de l’ensemble des informations et documents fournis.
                                </span>
                            </label>
                        </div>
                    )}

                    {/* Footer Actions */}
                    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-5">
                        <Button
                            variant="secondary"
                            icon="arrow-left"
                            type="button"
                            onClick={() => (step === 0 ? (window.location.href = route('login')) : goTo(step - 1))}
                        >
                            {step === 0 ? 'Annuler' : 'Retour'}
                        </Button>

                        {step < 3 ? (
                            <Button type="button" iconRight="arrow-right" onClick={next}>
                                Continuer
                            </Button>
                        ) : (
                            <Button
                                size="lg"
                                icon="send"
                                type="button"
                                loading={processing}
                                disabled={processing || !cguAccepted}
                                onClick={submit}
                            >
                                {processing ? 'Envoi en cours…' : 'Envoyer ma demande'}
                            </Button>
                        )}
                    </div>
                </div>
            </div>
        </PublicLayout>
    );
}
