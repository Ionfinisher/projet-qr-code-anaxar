import { useEffect, useRef, useState } from 'react';
import { Head, useForm } from '@inertiajs/react';
import PublicLayout from '@/Layouts/PublicLayout';
import { Field, Input, Select } from '@/Components/ui/Field';
import { PasswordInput, PasswordRules } from '@/Components/ui/PasswordInput';
import { RadioCards, Checkbox } from '@/Components/ui/Choice';
import { Button } from '@/Components/ui/Button';
import { Badge } from '@/Components/ui/Badge';
import { Alert } from '@/Components/ui/Feedback';
import { Icon } from '@/Components/ui/Icon';
import { cn } from '@/Lib/cn';
import { emailValid } from '@/Lib/domain';

const STEPS = [
    { label: 'Identité', sub: 'Type d’activité et coordonnées' },
    { label: 'Contact & Sécurité', sub: 'E-mail et mot de passe' },
    { label: 'Pièces justificatives', sub: 'Téléversement des documents' },
    { label: 'Vérification & Envoi', sub: 'Récapitulatif et validation' },
];

const EMPTY_FORM = {
    user_type: 'societe',
    idpays: '',
    phone_pays_id: '',
    raison_sociale: '',
    nif: '',
    rccm: '',
    representant_nom: '',
    representant_prenom: '',
    fonction_representant: '',
    nom: '',
    prenom: '',
    numero_piece_identite: '',
    telephone: '',
    adresse: '',
    ville: '',
    nombre_camions: '',
    email: '',
    password: '',
    password_confirmation: '',
    documents: {},
    current_email: '',
};

/** Formulaire prérempli pour la mise à jour d'un dossier rejeté. */
function formFromRegistration(registration) {
    return {
        ...EMPTY_FORM,
        user_type: registration.user_type ?? 'societe',
        idpays: registration.idpays ?? '',
        phone_pays_id: registration.phone_pays_id ?? '',
        raison_sociale: registration.raison_sociale ?? '',
        nif: registration.nif ?? '',
        rccm: registration.rccm ?? '',
        representant_nom: registration.representant_nom ?? '',
        representant_prenom: registration.representant_prenom ?? '',
        fonction_representant: registration.fonction_representant ?? '',
        nom: registration.nom ?? '',
        prenom: registration.prenom ?? '',
        numero_piece_identite: registration.numero_piece_identite ?? '',
        telephone: registration.telephone ?? '',
        adresse: registration.adresse ?? '',
        ville: registration.ville ?? '',
        nombre_camions: registration.nombre_camions ?? '',
        email: registration.email ?? '',
        current_email: registration.email ?? '',
    };
}

export default function Register({ pays = [], pieces = [], registration = null }) {
    const editing = !!registration;
    const existingDocuments = registration?.documents ?? {};
    const [step, setStep] = useState(0);
    const [cguAccepted, setCguAccepted] = useState(editing);
    const [cgaAccepted, setCgaAccepted] = useState(editing);
    const [stepErrors, setStepErrors] = useState({});
    const panelRef = useRef(null);

    const { data, setData, post, processing, errors, reset } = useForm(
        editing ? formFromRegistration(registration) : { ...EMPTY_FORM }
    );

    useEffect(() => {
        return () => {
            reset('password', 'password_confirmation', 'documents');
        };
    }, []);

    // If backend returns validation errors, jump to the first erroneous step
    useEffect(() => {
        const errorKeys = Object.keys(errors);
        if (errorKeys.length === 0) return;

        if (errorKeys.some((k) => ['user_type', 'idpays', 'raison_sociale', 'nif', 'rccm', 'representant_nom', 'representant_prenom', 'fonction_representant', 'nom', 'prenom', 'numero_piece_identite', 'adresse', 'ville', 'nombre_camions'].includes(k))) {
            setStep(0);
        } else if (errorKeys.some((k) => ['phone_pays_id', 'telephone', 'email', 'password', 'password_confirmation'].includes(k))) {
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
            if (!data.idpays) errs.idpays = 'Veuillez sélectionner un pays.';
            const business = ['societe', 'transitaire'].includes(data.user_type);
            if (business && !data.raison_sociale.trim()) {
                errs.raison_sociale = 'La raison sociale est requise.';
            }
            if (business && !data.nif.trim()) errs.nif = 'Le NIF est requis.';
            if (business && !data.rccm.trim()) errs.rccm = 'Le numéro RCCM est requis.';
            if (business && !data.adresse.trim()) errs.adresse = 'L’adresse du siège est requise.';
            if (business && !data.representant_prenom.trim()) errs.representant_prenom = 'Le prénom du représentant est requis.';
            if (business && !data.representant_nom.trim()) errs.representant_nom = 'Le nom du représentant est requis.';
            if (business && !data.fonction_representant.trim()) errs.fonction_representant = 'La fonction du représentant est requise.';
            if (business && !data.ville.trim()) errs.ville = 'La ville est requise.';
            if (data.user_type === 'particulier') {
                if (!data.nom.trim()) errs.nom = 'Le nom est requis.';
                if (!data.prenom.trim()) errs.prenom = 'Le prénom est requis.';
                if (data.numero_piece_identite.trim().length < 5) {
                    errs.numero_piece_identite = 'Indiquez le numéro de votre pièce d’identité.';
                }
            }
        } else if (s === 1) {
            if (!data.telephone.trim()) errs.telephone = 'Le numéro de téléphone est requis.';
            if (editing) {
                if (data.email.trim() && !emailValid(data.email.trim())) {
                    errs.email = 'Adresse e-mail invalide.';
                }
                if (data.password && data.password !== data.password_confirmation) {
                    errs.password_confirmation = 'Les mots de passe ne correspondent pas.';
                }
            } else {
                if (!data.email.trim()) errs.email = 'L’adresse e-mail est requise.';
                if (!data.password) errs.password = 'Le mot de passe est requis.';
                if (data.password !== data.password_confirmation) {
                    errs.password_confirmation = 'Les mots de passe ne correspondent pas.';
                }
            }
        } else if (s === 2) {
            availablePieces.forEach((piece) => {
                const provided = !!data.documents[piece.id] || !!existingDocuments[piece.id];
                if (piece.isrequired && !provided) {
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
        const target = editing
            ? route('registration.update', registration.numero_dossier)
            : route('register');
        post(target, { forceFormData: true });
    };

    const formatFileSize = (bytes) => {
        if (!bytes) return '';
        if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} Ko`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
    };

    const selectedCountry = pays.find((p) => String(p.id) === String(data.idpays));
    const selectedPhoneCountry = pays.find((p) => String(p.id) === String(data.phone_pays_id || data.idpays));

    return (
        <PublicLayout wide>
            <Head title={editing ? 'Mettre à jour ma demande' : 'Créer un compte transporteur'} />

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
                            {editing ? 'Mettre à jour ma demande' : 'Créer un compte transporteur'} · étape {step + 1}
                        </p>
                        <h1 tabIndex={-1} className="mt-1.5 text-2xl font-bold tracking-tight text-slate-900 focus:outline-none">
                            {STEPS[step].label}
                        </h1>
                    </div>

                    {/* Step 0: Identité */}
                    {step === 0 && (
                        <div className="flex flex-col gap-5">
                            {editing && registration.rejection_reason && (
                                <Alert tone="warn" icon="file-up" title="Compléments demandés par l’administration">
                                    {registration.rejection_reason}
                                </Alert>
                            )}

                            <div>
                                <label className="mb-2 block text-sm font-semibold text-slate-800">
                                    Type de compte
                                </label>
                                <RadioCards
                                    value={data.user_type}
                                    onChange={(val) => setData('user_type', val)}
                                    columns={3}
                                    options={[
                                        {
                                            value: 'societe',
                                            label: 'Entreprise de transport',
                                            description: 'Société disposant d’une flotte de camions.',
                                            icon: 'building-2',
                                            disabled: editing && data.user_type !== 'societe',
                                        },
                                        {
                                            value: 'transitaire',
                                            label: 'Transitaire · commissionnaire en douane',
                                            description: 'Réserve pour le compte de transporteurs mandatés.',
                                            icon: 'briefcase-business',
                                            disabled: editing && data.user_type !== 'transitaire',
                                        },
                                        {
                                            value: 'particulier',
                                            label: 'Transporteur particulier',
                                            description: 'Propriétaire-exploitant d’un ou plusieurs camions.',
                                            icon: 'user',
                                            disabled: editing && data.user_type !== 'particulier',
                                        },
                                    ]}
                                />
                                {editing && (
                                    <p className="mt-2 text-xs text-slate-500">
                                        Le type de compte ne peut pas être modifié.
                                    </p>
                                )}
                            </div>

                            {['societe', 'transitaire'].includes(data.user_type) ? (
                                <>
                                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                                        <Field id="reg-raison" label="Raison sociale" required error={errors.raison_sociale || stepErrors.raison_sociale}>
                                            <Input id="reg-raison" placeholder="Ex. Transports Togolais Réunis SARL" value={data.raison_sociale} onChange={(e) => setData('raison_sociale', e.target.value)} />
                                        </Field>
                                        <Field id="reg-nif" label="NIF" required hint="Numéro d’identification fiscale." error={errors.nif || stepErrors.nif}>
                                            <Input id="reg-nif" value={data.nif} onChange={(e) => setData('nif', e.target.value.toUpperCase())} />
                                        </Field>
                                        <Field id="reg-rccm" label="N° RCCM" required hint="Ex. TG-LOM 2019 B 1234." error={errors.rccm || stepErrors.rccm}>
                                            <Input id="reg-rccm" value={data.rccm} onChange={(e) => setData('rccm', e.target.value.toUpperCase())} />
                                        </Field>
                                    </div>
                                    <Field id="reg-adresse" label="Adresse du siège" required error={errors.adresse || stepErrors.adresse}>
                                        <Input id="reg-adresse" placeholder="Ex. Zone portuaire, Boulevard du Mono, Lomé" value={data.adresse} onChange={(e) => setData('adresse', e.target.value)} />
                                    </Field>
                                    <p className="text-sm font-semibold text-slate-700">Représentant légal</p>
                                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                                        <Field id="reg-rep-nom" label="Nom" required error={errors.representant_nom || stepErrors.representant_nom}>
                                            <Input id="reg-rep-nom" value={data.representant_nom} onChange={(e) => setData('representant_nom', e.target.value)} />
                                        </Field>
                                        <Field id="reg-rep-prenom" label="Prénom" required error={errors.representant_prenom || stepErrors.representant_prenom}>
                                            <Input id="reg-rep-prenom" value={data.representant_prenom} onChange={(e) => setData('representant_prenom', e.target.value)} />
                                        </Field>
                                        <Field id="reg-rep-fonction" label="Fonction" required error={errors.fonction_representant || stepErrors.fonction_representant}>
                                            <Input id="reg-rep-fonction" placeholder="Ex. Gérante" value={data.fonction_representant} onChange={(e) => setData('fonction_representant', e.target.value)} />
                                        </Field>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                                        <Field id="reg-nom" label="Nom" required error={errors.nom || stepErrors.nom}>
                                            <Input id="reg-nom" placeholder="Ex. KOFFI" value={data.nom} onChange={(e) => setData('nom', e.target.value)} />
                                        </Field>
                                        <Field id="reg-prenom" label="Prénom" required error={errors.prenom || stepErrors.prenom}>
                                            <Input id="reg-prenom" placeholder="Ex. Yao Mensah" value={data.prenom} onChange={(e) => setData('prenom', e.target.value)} />
                                        </Field>
                                        <Field id="reg-piece-identite" label="N° de pièce d’identité" required hint="CNI ou passeport." error={errors.numero_piece_identite || stepErrors.numero_piece_identite}>
                                            <Input id="reg-piece-identite" className="font-mono" value={data.numero_piece_identite} onChange={(e) => setData('numero_piece_identite', e.target.value.toUpperCase())} />
                                        </Field>
                                    </div>
                                    <Field id="reg-adresse" label="Adresse du siège / Domicile" error={errors.adresse || stepErrors.adresse}>
                                        <Input id="reg-adresse" placeholder="Ex. Zone portuaire, Boulevard du Mono, Lomé" value={data.adresse} onChange={(e) => setData('adresse', e.target.value)} />
                                    </Field>
                                </>
                            )}

                            <div className={cn('grid grid-cols-1 gap-4', data.user_type === 'transitaire' ? 'sm:grid-cols-2' : 'sm:grid-cols-3')}>
                                <Field id="reg-pays-identite" label="Pays" required error={errors.idpays || stepErrors.idpays}>
                                    <Select
                                        id="reg-pays-identite"
                                        value={data.idpays}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            setData((prev) => ({
                                                ...prev,
                                                idpays: val,
                                                phone_pays_id: prev.phone_pays_id || val,
                                            }));
                                        }}
                                        aria-label="Pays"
                                    >
                                        <option value="" disabled>
                                            Sélectionner un pays
                                        </option>
                                        {pays.map((p) => (
                                            <option key={p.id} value={p.id}>
                                                {p.nom}
                                            </option>
                                        ))}
                                    </Select>
                                </Field>
                                <Field id="reg-ville" label="Ville" required error={errors.ville || stepErrors.ville}>
                                    <Input id="reg-ville" placeholder="Ex. Lomé" value={data.ville} onChange={(e) => setData('ville', e.target.value)} />
                                </Field>
                                {data.user_type !== 'transitaire' && (
                                    <Field id="reg-camions" label="Nombre de camions" optional error={errors.nombre_camions || stepErrors.nombre_camions}>
                                        <Input id="reg-camions" type="number" min="0" max="5000" value={data.nombre_camions} onChange={(e) => setData('nombre_camions', e.target.value)} />
                                    </Field>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Step 1: Contact & Sécurité */}
                    {step === 1 && (
                        <div className="flex flex-col gap-5">
                            {editing && (
                                <Field
                                    id="reg-email"
                                    label="E-mail"
                                    optional
                                    error={errors.email || stepErrors.email}
                                    hint="Identifiant de connexion et réception des notifications."
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
                            )}

                            <Field
                                id="reg-phone"
                                label="Téléphone mobile"
                                required
                                error={errors.phone_pays_id || errors.telephone || stepErrors.phone_pays_id || stepErrors.telephone}
                                hint={editing ? 'Reçoit les SMS. Sert d’identifiant si aucun e-mail.' : 'Reçoit les SMS et sert d’identifiant de contact.'}
                            >
                                <div className="grid grid-cols-[minmax(0,0.9fr)_minmax(0,1.5fr)] gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
                                    <Select
                                        id="reg-pays"
                                        value={data.phone_pays_id || data.idpays}
                                        onChange={(e) => setData('phone_pays_id', e.target.value)}
                                        aria-label="Pays et indicatif téléphonique"
                                        aria-invalid={errors.phone_pays_id || stepErrors.phone_pays_id ? 'true' : undefined}
                                    >
                                        <option value="" disabled>
                                            Sélectionner un indicatif
                                        </option>
                                        {pays.map((p) => (
                                            <option key={p.id} value={p.id}>
                                                {p.nom} {p.indicatif ? `· +${String(p.indicatif).replace(/^\+/, '')}` : ''}
                                            </option>
                                        ))}
                                    </Select>
                                    <Input
                                        id="reg-phone-number"
                                        type="tel"
                                        autoComplete="tel"
                                        placeholder="90 11 22 33"
                                        value={data.telephone}
                                        onChange={(e) => setData('telephone', e.target.value)}
                                        aria-invalid={errors.telephone || stepErrors.telephone ? 'true' : undefined}
                                    />
                                </div>
                            </Field>

                            {editing ? (
                                <div className="flex flex-col gap-3">
                                    <div>
                                        <h3 className="text-base font-semibold text-slate-900">Nouveau mot de passe</h3>
                                        <p className="mt-0.5 text-sm text-slate-500">
                                            Laissez vide pour conserver le mot de passe choisi à l’inscription.
                                        </p>
                                    </div>
                                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                        <Field
                                            id="reg-pwd"
                                            label="Mot de passe"
                                            optional
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
                                            label="Confirmation"
                                            optional
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
                            ) : (
                                <>
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
                                </>
                            )}
                        </div>
                    )}

                    {/* Step 2: Pièces justificatives */}
                    {step === 2 && (
                        <div className="flex flex-col gap-4">
                            <p className="text-sm text-slate-500">
                                {editing
                                    ? 'Les pièces déjà fournies sont conservées. Sélectionnez un fichier pour la remplacer. Formats acceptés : PDF, JPEG, PNG (max 10 Mo par fichier).'
                                    : 'Veuillez téléverser les documents demandés par l’administration portuaire pour valider votre inscription. Formats acceptés : PDF, JPEG, PNG (max 10 Mo par fichier).'}
                            </p>

                            {availablePieces.length === 0 ? (
                                <Alert tone="info">Aucun document spécifique requis pour ce profil.</Alert>
                            ) : (
                                <div className="flex flex-col gap-3">
                                    {availablePieces.map((piece) => {
                                        const file = data.documents[piece.id];
                                        const existing = existingDocuments[piece.id];
                                        const provided = !!file || !!existing;
                                        const docError = errors[`documents.${piece.id}`] || stepErrors[`documents.${piece.id}`];

                                        return (
                                            <div
                                                key={piece.id}
                                                className={cn(
                                                    'rounded-2xl border p-4 transition-all',
                                                    provided
                                                        ? 'border-emerald-200 bg-emerald-50/30'
                                                        : docError
                                                            ? 'border-rose-300 bg-rose-50/20'
                                                            : 'border-slate-200 bg-slate-50/40 hover:border-slate-300'
                                                )}
                                            >
                                                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                                                    <div>
                                                        <div className="flex flex-wrap items-center gap-2">
                                                            <Icon name="file-text" size={18} className="text-brand-600" />
                                                            <span className="font-semibold text-slate-900">{piece.libelle}</span>
                                                            {existing && !file && (
                                                                <Badge tone="ok" size="sm" icon="check">
                                                                    Déjà fourni
                                                                </Badge>
                                                            )}
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
                                                            <div className="flex flex-col items-start gap-1.5 sm:items-end">
                                                                {existing && (
                                                                    <span className="max-w-[220px] truncate text-xs text-slate-500" title={existing.name}>
                                                                        {existing.name}
                                                                        {existing.size ? ` (${formatFileSize(existing.size)})` : ''}
                                                                    </span>
                                                                )}
                                                                <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition-colors hover:border-brand-500 hover:bg-brand-50 hover:text-brand-700 focus-within:ring-2 focus-within:ring-brand-500">
                                                                    <Icon name="upload" size={15} />
                                                                    <span>{existing ? 'Remplacer le fichier' : 'Sélectionner le fichier'}</span>
                                                                    <input
                                                                        type="file"
                                                                        accept={pieceAccept(piece)}
                                                                        className="sr-only"
                                                                        onChange={(e) => setDocument(piece.id, e.target.files?.[0] || null)}
                                                                    />
                                                                </label>
                                                            </div>
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
                                            {data.user_type === 'transitaire'
                                                ? 'Transitaire · commissionnaire en douane'
                                                : data.user_type === 'societe'
                                                    ? 'Entreprise de transport'
                                                    : 'Transporteur particulier'}
                                        </dd>
                                    </div>
                                    <div>
                                        <dt className="text-xs text-slate-500">Nom / Raison sociale</dt>
                                        <dd className="font-semibold text-slate-900">
                                            {['societe', 'transitaire'].includes(data.user_type)
                                                ? data.raison_sociale
                                                : `${data.nom} ${data.prenom}`.trim()}
                                        </dd>
                                    </div>
                                    {data.user_type === 'particulier' && (
                                        <div>
                                            <dt className="text-xs text-slate-500">N° de pièce d’identité</dt>
                                            <dd className="font-mono text-slate-900">{data.numero_piece_identite || '—'}</dd>
                                        </div>
                                    )}
                                    <div>
                                        <dt className="text-xs text-slate-500">Pays (Identité)</dt>
                                        <dd className="font-semibold text-slate-900">
                                            {selectedCountry?.nom || '—'}
                                        </dd>
                                    </div>
                                    <div>
                                        <dt className="text-xs text-slate-500">Téléphone de contact</dt>
                                        <dd className="text-slate-900">
                                            {selectedPhoneCountry?.indicatif ? `+${String(selectedPhoneCountry.indicatif).replace(/^\+/, '')} ` : ''}{data.telephone}
                                        </dd>
                                    </div>
                                    <div>
                                        <dt className="text-xs text-slate-500">E-mail de contact</dt>
                                        <dd className="font-mono text-slate-900">
                                            {data.email || (editing ? `Inchangé — ${registration.email}` : '—')}
                                        </dd>
                                    </div>
                                    {editing && (
                                        <div>
                                            <dt className="text-xs text-slate-500">Mot de passe</dt>
                                            <dd className="text-slate-900">
                                                {data.password ? 'Nouveau mot de passe défini' : 'Inchangé'}
                                            </dd>
                                        </div>
                                    )}
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
                                                const provided = !!data.documents[p.id] || !!existingDocuments[p.id];
                                                return (
                                                    <span
                                                        key={p.id}
                                                        className={cn(
                                                            'inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs',
                                                            provided
                                                                ? 'bg-emerald-100 text-emerald-800'
                                                                : 'bg-slate-200 text-slate-600'
                                                        )}
                                                    >
                                                        <Icon name={provided ? 'check' : 'x'} size={12} />
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
                            <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 p-4 transition-colors hover:bg-slate-50">
                                <Checkbox
                                    checked={cgaAccepted}
                                    onChange={setCgaAccepted}
                                    className="mt-0.5"
                                />
                                <span className="text-sm text-slate-700 leading-snug">
                                    J’accepte le traitement de mes données pour l’examen de ma demande et la gestion de mon compte.
                                    Loi n° 2019-014 du 29 octobre 2019 relative à la protection des données à caractère personnel.                                </span>
                            </label>
                        </div>
                    )}

                    {/* Footer Actions */}
                    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-5">
                        <Button
                            variant="secondary"
                            icon="arrow-left"
                            type="button"
                            onClick={() =>
                                step === 0
                                    ? (window.location.href = editing
                                        ? route('registration.status', {
                                            email: registration.email,
                                            numero_dossier: registration.numero_dossier,
                                        })
                                        : route('login'))
                                    : goTo(step - 1)
                            }
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
                                disabled={processing || !cguAccepted || !cgaAccepted}
                                onClick={submit}
                            >
                                {processing
                                    ? 'Envoi en cours…'
                                    : editing
                                        ? 'Envoyer la mise à jour'
                                        : 'Envoyer ma demande'}
                            </Button>
                        )}
                    </div>
                </div>
            </div>
        </PublicLayout>
    );
}
