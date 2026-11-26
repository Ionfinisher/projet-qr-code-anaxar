import { useMemo, useRef, useState } from 'react';
import { Link, useForm, usePage } from '@inertiajs/react';
import axios from 'axios';
import {
    Alert,
    Badge,
    Button,
    Card,
    Field,
    Icon,
    IconButton,
    Input,
    PhoneInput,
    SectionTitle,
    Select,
    Textarea,
    buttonClass,
} from '@/Components/ui';
import { cn } from '@/Lib/cn';
import { StepTrucks } from '@/features/transporteur/components/wizard/StepTrucks';
import InertiaStepSlot from './InertiaStepSlot';
import DemandeReview from './DemandeReview';
import TruckDocuments from './TruckDocuments';
import {
    COUNTRIES,
    DOCS,
    getRdvDocs,
    ISO_TYPES,
    OPS,
    fmtInt,
    formatPhone,
    normalizePlate,
    parseBL,
    parseContainer,
    toE164,
    uid,
} from '@/Lib/domain';
import { docSlot, newTruck, parseSlotKey, slotKey, splitPhone } from './helpers';

const MAX_TRUCKS = 20;
const emptyDocs = () => Object.fromEntries(DOCS.map((doc) => [doc.key, '']));

// Champs de camion exposés à StepTrucks (clé courte → suffixe du chemin d'erreur serveur).
const TRUCK_ERROR_FIELDS = {
    'driver.first': 'first',
    'driver.last': 'last',
    'driver.phone': 'phone',
    'driver.license': 'license',
    'vehicle.country': 'country',
    'vehicle.tractor': 'tractor',
    'vehicle.trailer': 'trailer',
    'container.number': 'container',
    'container.iso': 'iso',
    'container.bl': 'bl',
    'container.goods': 'goods',
    'container.vgm': 'vgm',
};

// Champs qui ne peuvent pas être identiques entre deux camions d'une même demande.
const TRUCK_UNIQUE_RULES = [
    { field: 'driver.phone', value: (t) => (t.driver.phone_national.trim() ? toE164(t.driver.phone_cc, t.driver.phone_national) : ''), message: 'Ce numéro de téléphone est déjà utilisé pour un autre camion.' },
    { field: 'driver.license', value: (t) => t.driver.license.trim().toUpperCase().replace(/[^A-Z0-9]/g, ''), message: 'Ce n° de permis est déjà utilisé pour un autre camion.' },
    { field: 'vehicle.tractor', value: (t) => normalizePlate(t.vehicle.tractor).trim(), message: 'Ce tracteur est déjà utilisé pour un autre camion.' },
    { field: 'vehicle.trailer', value: (t) => normalizePlate(t.vehicle.trailer).trim(), message: 'Cette remorque est déjà utilisée pour un autre camion.' },
    { field: 'container.number', value: (t) => parseContainer(t.container.number).raw, message: 'Ce conteneur est déjà saisi pour un autre camion.' },
    { field: 'container.bl', value: (t) => parseBL(t.container.bl).raw, message: 'Ce n° de connaissement est déjà utilisé pour un autre camion.' },
];

// Conversion camion « formulaire » (imbriqué) ↔ camion « modèle » (plat, attendu par StepTrucks).
const toTemplateTruck = (truck, index) => ({
    k: truck.key || truck.rdvId || `inertia-${index}`,
    rdvId: truck.rdvId || null,
    first: truck.driver.first,
    last: truck.driver.last,
    phoneCc: truck.driver.phone_cc,
    phone: truck.driver.phone_national,
    license: truck.driver.license,
    country: truck.vehicle.country,
    tractor: truck.vehicle.tractor,
    trailer: truck.vehicle.trailer,
    container: truck.container.number,
    iso: truck.container.iso,
    bl: truck.container.bl,
    goods: truck.container.goods,
    vgm: truck.container.vgm,
});

const formTruck = (truck) => ({
    key: truck.k || truck.key || uid(),
    rdvId: truck.rdvId || null,
    driver: {
        first: truck.first || '',
        last: truck.last || '',
        phone_cc: truck.phoneCc || 'TG',
        phone_national: truck.phone || '',
        license: truck.license || '',
    },
    vehicle: {
        country: truck.country || 'TG',
        tractor: truck.tractor || '',
        trailer: truck.trailer || '',
    },
    container: {
        number: truck.container || '',
        iso: truck.iso || '22G1',
        bl: truck.bl || '',
        goods: truck.goods || '',
        vgm: truck.vgm ?? '',
    },
});

function fromDemande(demande) {
    const mandated = splitPhone(demande.mandated?.phone);
    const trucks = (demande.trucks || []).map((truck, index) => {
        const phone = splitPhone(truck.driver?.phone);
        const key = String(truck.id ?? index);

        return {
            key,
            rdvId: truck.id,
            driver: {
                first: truck.driver?.first || '',
                last: truck.driver?.last || '',
                phone_cc: phone.cc,
                phone_national: phone.national,
                license: truck.driver?.license || '',
            },
            vehicle: {
                country: truck.vehicle?.country || 'TG',
                tractor: truck.vehicle?.tractor || '',
                trailer: truck.vehicle?.trailer || '',
            },
            container: {
                number: truck.container?.number || '',
                iso: truck.container?.iso || '22G1',
                bl: truck.container?.bl || '',
                goods: truck.container?.goods || '',
                vgm: truck.container?.vgm ?? '',
            },
        };
    });

    return {
        op: demande.op || 'IMP',
        terminal: demande.terminal || 'LCT',
        slot: slotKey(demande.date, demande.start),
        notes: demande.notes || '',
        transitaire: demande.transitaire || '',
        mandated: {
            type: demande.mandated?.type || 'entreprise',
            company: demande.mandated?.company || '',
            first: demande.mandated?.first || '',
            last: demande.mandated?.last || '',
            phone_cc: mandated.cc,
            phone_national: mandated.national,
        },
        trucks,
        docs: Object.fromEntries(trucks.map((truck) => [
            truck.key,
            Object.fromEntries(DOCS.map((doc) => [doc.key, demande.docs?.[truck.key]?.[doc.key]?.id ?? ''])),
        ])),
    };
}

function fromInitialSlot(initialSlot, truckMode) {
    const trucks = Array.from({ length: truckMode === 'lot' ? 2 : 1 }, () => newTruck());

    return {
        op: '',
        terminal: '',
        slot: initialSlot?.date && initialSlot?.start ? slotKey(initialSlot.date, initialSlot.start) : '',
        notes: '',
        transitaire: '',
        mandated: { type: 'entreprise', company: '', first: '', last: '', phone_cc: 'TG', phone_national: '' },
        trucks,
        docs: Object.fromEntries(trucks.map((truck) => [truck.key, emptyDocs()])),
    };
}

export default function DemandeForm({ mode = 'create', truckMode = 'single', demande = null, slots = [], terminals = [], initialSlot = null, me }) {
    const { doc_types } = usePage().props;
    const rdvDocs = useMemo(() => getRdvDocs(doc_types), [doc_types]);
    const isTransit = me?.acct === 'transit';
    const form = useForm(demande ? fromDemande(demande) : fromInitialSlot(initialSlot, truckMode));
    const [step, setStep] = useState(0);
    const [attempted, setAttempted] = useState(false);
    const [activeTruckKey, setActiveTruckKey] = useState(null);
    const steps = [
        ['Opération et créneau', 'Choisissez le rendez-vous'],
        ['Camions', `${form.data.trucks.length} camion${form.data.trucks.length > 1 ? 's' : ''}`],
        ['Documents', 'Pièces obligatoires'],
        ['Vérification', 'Relisez et envoyez'],
    ];

    const originalDocs = useMemo(() => {
        if (mode !== 'edit' || !demande) return {};

        return Object.fromEntries((demande.trucks || []).map((truck, index) => {
            const key = String(truck.id ?? index);

            return [key, Object.fromEntries(DOCS.map((doc) => [doc.key, demande.docs?.[key]?.[doc.key]?.id ?? '']))];
        }));
    }, [mode, demande]);

    const originalMeta = useMemo(() => {
        if (mode !== 'edit' || !demande) return {};

        return Object.fromEntries((demande.trucks || []).flatMap((truck, index) => {
            const key = String(truck.id ?? index);

            return DOCS.flatMap((doc) => {
                const file = demande.docs?.[key]?.[doc.key];

                return file ? [[docSlot(key, doc.key), { name: file.name, size: file.size, url: file.url, existing: true }]] : [];
            });
        }));
    }, [mode, demande]);

    const [uploaded, setUploaded] = useState(() => ({ ...originalMeta }));
    const [uploading, setUploading] = useState({});
    const [uploadErrors, setUploadErrors] = useState({});
    const fileInputs = useRef({});

    const groups = useMemo(() => {
        const map = new Map();

        slots.forEach((slot) => {
            if (!map.has(slot.date)) map.set(slot.date, []);
            map.get(slot.date).push(slot);
        });

        return [...map.entries()];
    }, [slots]);

    const selectedSlot = useMemo(
        () => slots.find((slot) => slotKey(slot.date, slot.start) === form.data.slot) || null,
        [slots, form.data.slot],
    );

    const templateTrucks = useMemo(() => form.data.trucks.map(toTemplateTruck), [form.data.trucks]);
    const selectedTruck = form.data.trucks.find((truck) => String(truck.key) === activeTruckKey) || form.data.trucks[0];
    const selectedTruckKey = selectedTruck ? String(selectedTruck.key) : '';
    const selectedTruckIndex = selectedTruck ? form.data.trucks.indexOf(selectedTruck) : -1;

    const docsComplete = (truckKey) => rdvDocs.filter((doc) => form.data.docs?.[String(truckKey)]?.[doc.key]).length;
    const totalDocs = form.data.trucks.reduce((sum, truck) => sum + docsComplete(truck.key), 0);
    const expectedDocs = form.data.trucks.length * rdvDocs.length;

    const setTemplateTruck = (key, patch) => {
        form.setData((data) => ({
            ...data,
            trucks: data.trucks.map((truck, index) => {
                const currentKey = truck.key || truck.rdvId || `inertia-${index}`;
                if (currentKey !== key) return truck;

                const next = { ...truck };
                const driver = { ...next.driver };
                const vehicle = { ...next.vehicle };
                const container = { ...next.container };
                if ('first' in patch) driver.first = patch.first;
                if ('last' in patch) driver.last = patch.last;
                if ('phoneCc' in patch) driver.phone_cc = patch.phoneCc;
                if ('phone' in patch) driver.phone_national = patch.phone;
                if ('license' in patch) driver.license = patch.license;
                if ('country' in patch) vehicle.country = patch.country;
                if ('tractor' in patch) vehicle.tractor = patch.tractor;
                if ('trailer' in patch) vehicle.trailer = patch.trailer;
                if ('container' in patch) container.number = patch.container;
                if ('iso' in patch) container.iso = patch.iso;
                if ('bl' in patch) container.bl = patch.bl;
                if ('goods' in patch) container.goods = patch.goods;
                if ('vgm' in patch) container.vgm = patch.vgm;
                return { ...next, driver, vehicle, container };
            }),
        }));
    };

    // Garantit que chaque camion possède son propre jeu de 6 documents, et supprime
    // les jeux devenus orphelins lors d'une suppression.
    const syncDocsForTrucks = (data) => {
        const keys = new Set(data.trucks.map((truck) => String(truck.key)));
        const docs = Object.fromEntries([...keys].map((key) => [key, data.docs?.[key] || emptyDocs()]));

        return { ...data, docs };
    };

    // `set` accepte un patch { trucks } ou un updater (comme l'ancien assistant) : StepTrucks ajoute,
    // duplique, retire et importe des camions via une fonction (mise à jour sûre malgré des clics rapprochés).
    const setTemplateForm = (patchOrUpdater) => {
        form.setData((data) => {
            const current = data.trucks.map(toTemplateTruck);
            const patch = typeof patchOrUpdater === 'function'
                ? patchOrUpdater({ trucks: current })
                : patchOrUpdater;

            if (!patch?.trucks) return data;

            return syncDocsForTrucks({ ...data, trucks: patch.trucks.map(formTruck) });
        });
    };

    const patchTruck = (index, section, patch) => {
        form.setData((data) => ({
            ...data,
            trucks: data.trucks.map((truck, i) => (
                i === index ? { ...truck, [section]: { ...truck[section], ...patch } } : truck
            )),
        }));
    };

    const setTruckValue = (index, section, field, value) => patchTruck(index, section, { [field]: value });

    const addTruck = () => {
        if (form.data.trucks.length >= MAX_TRUCKS) return;
        form.setData((data) => syncDocsForTrucks({ ...data, trucks: [...data.trucks, newTruck()] }));
    };

    const removeTruck = (index) => {
        if (form.data.trucks.length === 1) return;
        form.setData((data) => syncDocsForTrucks({
            ...data,
            trucks: data.trucks.filter((_, i) => i !== index),
        }));
    };

    const setMandated = (patch) => {
        form.setData((data) => ({ ...data, mandated: { ...data.mandated, ...patch } }));
    };

    const upload = async (truckKey, type, file) => {
        if (!file) return;

        const slot = docSlot(truckKey, type);

        setUploading((prev) => ({ ...prev, [slot]: true }));
        setUploadErrors((prev) => ({ ...prev, [slot]: null }));

        const body = new FormData();
        body.append('type', type);
        body.append('truck_key', truckKey);
        body.append('file', file);

        try {
            const { data } = await axios.post(route('transporteur.uploads.store'), body);
            form.setData((current) => ({
                ...current,
                docs: {
                    ...current.docs,
                    [truckKey]: { ...(current.docs?.[truckKey] || emptyDocs()), [type]: data.token },
                },
            }));
            form.clearErrors(`docs.${truckKey}.${type}`);
            setUploadErrors((prev) => ({ ...prev, [slot]: null }));
            setUploaded((prev) => ({
                ...prev,
                [slot]: { name: data.name, size: data.size, token: data.token, existing: false },
            }));
        } catch (error) {
            const message = error?.response?.data?.errors?.file?.[0]
                || error?.response?.data?.errors?.truck_key?.[0]
                || error?.response?.data?.message
                || 'Téléversement impossible. Réessayez.';

            setUploadErrors((prev) => ({ ...prev, [slot]: message }));
        } finally {
            setUploading((prev) => ({ ...prev, [slot]: false }));
            if (fileInputs.current[slot]) fileInputs.current[slot].value = '';
        }
    };

    const removeUpload = async (truckKey, type) => {
        const slot = docSlot(truckKey, type);
        const token = form.data.docs?.[truckKey]?.[type];

        if (typeof token === 'string' && token.length > 20) {
            try {
                await axios.delete(route('transporteur.uploads.destroy', token));
            } catch {
                // Le fichier temporaire sera purgé par la tâche planifiée.
            }
        }

        const original = originalDocs[truckKey]?.[type];
        form.setData((current) => ({
            ...current,
            docs: {
                ...current.docs,
                [truckKey]: { ...(current.docs?.[truckKey] || emptyDocs()), [type]: original || '' },
            },
        }));
        setUploaded((prev) => {
            const next = { ...prev };

            if (original && originalMeta[slot]) next[slot] = originalMeta[slot];
            else delete next[slot];

            return next;
        });
    };

    form.transform((data) => {
        const slot = parseSlotKey(data.slot);

        return {
            op: data.op,
            terminal: data.terminal,
            date: slot?.date || '',
            start: slot?.start || '',
            notes: data.notes?.trim() || '',
            transitaire: data.transitaire?.trim() || '',
            mandated: isTransit ? {
                type: data.mandated.type,
                company: data.mandated.type === 'entreprise' ? data.mandated.company.trim() : '',
                first: data.mandated.type === 'particulier' ? data.mandated.first.trim() : '',
                last: data.mandated.type === 'particulier' ? data.mandated.last.trim().toUpperCase() : '',
                phone: toE164(data.mandated.phone_cc, data.mandated.phone_national),
            } : null,
            trucks: data.trucks.map((truck) => ({
                key: String(truck.key || truck.rdvId || ''),
                rdvId: truck.rdvId ?? null,
                driver: {
                    first: truck.driver.first.trim(),
                    last: truck.driver.last.trim().toUpperCase(),
                    phone: toE164(truck.driver.phone_cc, truck.driver.phone_national),
                    license: truck.driver.license.trim().toUpperCase(),
                },
                vehicle: {
                    country: truck.vehicle.country,
                    tractor: normalizePlate(truck.vehicle.tractor).trim(),
                    trailer: normalizePlate(truck.vehicle.trailer).trim(),
                },
                container: {
                    number: parseContainer(truck.container.number).raw,
                    iso: truck.container.iso,
                    bl: parseBL(truck.container.bl).raw,
                    goods: truck.container.goods.trim(),
                    vgm: truck.container.vgm === '' || truck.container.vgm === null || truck.container.vgm === undefined
                        ? null
                        : Number(truck.container.vgm),
                },
            })),
            docs: data.docs,
        };
    });

    const uploadingAny = Object.values(uploading).some(Boolean);
    const needsBlAndGoods = ['IMP', 'EXP'].includes(form.data.op);
    const errors = Object.values(form.errors).filter((value) => typeof value === 'string');

    const truckErrors = templateTrucks.map((_, index) => {
        const map = {};

        Object.entries(TRUCK_ERROR_FIELDS).forEach(([suffix, field]) => {
            const message = form.errors[`trucks.${index}.${suffix}`];
            if (message) map[field] = message;
        });

        return map;
    });

    // L'envoi n'est déclenché QUE par un clic explicite sur « Envoyer la demande ».
    // Aucune soumission native du formulaire ne doit pouvoir envoyer la demande.
    const submit = () => {
        if (step !== 3 || uploadingAny) return;

        if (mode === 'edit') {
            form.put(route('transporteur.demandes.update', demande.reference), { preserveScroll: true });
        } else {
            form.post(route('transporteur.demandes.store'), { preserveScroll: true });
        }
    };

    // Neutralise toute soumission native du formulaire (touche Entrée, bouton
    // implicite, etc.) : le seul déclencheur d'envoi est le clic sur le bouton.
    const blockNativeSubmit = (event) => event.preventDefault();

    // Empêche l'envoi implicite du formulaire (touche Entrée) avant l'étape de
    // vérification : l'utilisateur doit cliquer sur « Envoyer la demande ».
    const onFormKeyDown = (event) => {
        if (event.key !== 'Enter' || step >= 3) return;
        if (event.target?.tagName === 'TEXTAREA') return;
        event.preventDefault();
    };

    const goNext = () => {
        setAttempted(true);
        if (step === 0) {
            if (!form.data.op) {
                form.setError('op', 'Sélectionnez un type d’opération.');
                return;
            }
            if (!form.data.terminal) {
                form.setError('terminal', 'Sélectionnez un terminal.');
                return;
            }
            if (!form.data.slot) {
                form.setError('slot', 'Sélectionnez un créneau disponible.');
                return;
            }
        }
        if (step === 1) {
            const needsContainer = form.data.op !== 'MTP';
            const incomplete = form.data.trucks.findIndex((truck) => (
                !truck.driver.first.trim()
                || !truck.driver.last.trim()
                || !truck.driver.phone_national.trim()
                || !truck.driver.license.trim()
                || !truck.vehicle.tractor.trim()
                || (needsContainer && !truck.container.number.trim())
                || (needsBlAndGoods && (!truck.container.bl.trim() || !truck.container.goods.trim()))
            ));

            if (incomplete >= 0) {
                form.setError(`trucks.${incomplete}.driver.first`, 'Complétez les informations du camion.');
                return;
            }

            for (const rule of TRUCK_UNIQUE_RULES) {
                const seen = new Set();
                const clash = form.data.trucks.findIndex((truck) => {
                    const value = rule.value(truck);
                    if (!value) return false;
                    if (seen.has(value)) return true;
                    seen.add(value);
                    return false;
                });

                if (clash >= 0) {
                    form.setError(`trucks.${clash}.${rule.field}`, rule.message);
                    return;
                }
            }
        }
        if (step === 2) {
            const incompleteIndex = form.data.trucks.findIndex((truck) => (
                rdvDocs.some((doc) => !form.data.docs?.[String(truck.key)]?.[doc.key])
            ));

            if (incompleteIndex >= 0) {
                const truck = form.data.trucks[incompleteIndex];
                const key = String(truck.key);
                const missing = rdvDocs.find((doc) => !form.data.docs?.[key]?.[doc.key]);

                form.setError(
                    `docs.${key}.${missing.key}`,
                    `Le document « ${missing.label} » est obligatoire pour le camion ${incompleteIndex + 1}.`,
                );
                return;
            }
        }
        if (step < 3) {
            setStep((current) => current + 1);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    const goPrevious = () => {
        setAttempted(false);
        setStep((current) => Math.max(0, current - 1));
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    return (
        <form onSubmit={blockNativeSubmit} onKeyDown={onFormKeyDown} className="grid gap-6 lg:grid-cols-[250px_minmax(0,1fr)] lg:gap-8">
            <aside>
                <div className="hidden lg:sticky lg:top-24 lg:block">
                    <p className="mb-3 px-2 text-xs font-semibold uppercase tracking-[0.08em] text-brand-700">
                        {mode === 'edit' ? `Modification · ${demande.reference}` : truckMode === 'lot' ? `Plusieurs camions · ${form.data.trucks.length}` : 'Un camion'}
                    </p>
                    <ol className="flex flex-col gap-1">
                        {steps.map(([label, sub], index) => {
                            const current = index === step;
                            const complete = index < step;

                            return (
                                <li key={label}>
                                    <button
                                        type="button"
                                        onClick={() => index <= step && setStep(index)}
                                        disabled={index > step}
                                        aria-current={current ? 'step' : undefined}
                                        className={cn(
                                            'flex w-full cursor-pointer items-start gap-3 rounded-xl px-2 py-2.5 text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 disabled:cursor-not-allowed disabled:opacity-50',
                                            current ? 'bg-white shadow-[0_1px_2px_rgba(15,23,42,0.08)] ring-1 ring-slate-200' : 'hover:bg-white/70',
                                        )}
                                    >
                                        <span className={cn(
                                            'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold',
                                            complete ? 'bg-emerald-600 text-white' : current ? 'bg-brand-600 text-white' : 'bg-slate-200 text-slate-600',
                                        )}>
                                            {complete ? <Icon name="check" size={15} /> : index + 1}
                                        </span>
                                        <span>
                                            <span className="block text-sm font-semibold text-slate-900">{label}</span>
                                            <span className="block text-xs text-slate-500">{sub}</span>
                                        </span>
                                    </button>
                                </li>
                            );
                        })}
                    </ol>
                </div>
                <div className="flex flex-col gap-2 lg:hidden">
                    <div className="flex items-center justify-between text-sm text-slate-600">
                        <span>Étape {step + 1} sur 4 · <strong className="text-slate-900">{steps[step][0]}</strong></span>
                    </div>
                    <div role="progressbar" aria-valuemin="1" aria-valuemax="4" aria-valuenow={step + 1} className="h-1.5 overflow-hidden rounded-full bg-slate-200">
                        <span className="block h-full rounded-full bg-brand-600 transition-all" style={{ width: `${((step + 1) / 4) * 100}%` }} />
                    </div>
                </div>
            </aside>
            <div className="flex min-w-0 flex-col gap-5 rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.05)] sm:p-8">
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-brand-700">
                            {mode === 'edit' ? `Modifier la demande ${demande.reference}` : 'Nouvelle demande de rendez-vous'} · étape {step + 1}
                        </p>
                        <h1 tabIndex={-1} className="mt-1.5 text-2xl font-bold tracking-tight text-slate-900 focus:outline-none">{steps[step][0]}</h1>
                    </div>
                    {step > 0 && form.data.op ? (
                        <Badge tone="brand">
                            {OPS[form.data.op]?.label || OPS[form.data.op]?.short || form.data.op}
                        </Badge>
                    ) : null}
                </div>
                {form.hasErrors ? (
                    <Alert tone="bad" title="Corrigez les erreurs du formulaire">
                        {errors.length > 0 ? (
                            <ul className="mt-1 list-inside list-disc text-sm">
                                {[...new Set(errors)].slice(0, 6).map((message) => <li key={message}>{message}</li>)}
                            </ul>
                        ) : (
                            <p>Certains champs sont invalides.</p>
                        )}
                    </Alert>
                ) : null}

                <div className={cn(step === 0 ? 'block' : 'hidden')}>
                    <InertiaStepSlot
                        form={form}
                        slots={slots}
                        terminals={terminals}
                        truckCount={form.data.trucks.length}
                        isTransit={isTransit}
                    />
                </div>

                <div className={cn(step === 0 && isTransit ? 'block' : 'hidden')}>
                    {isTransit ? (
                        <Card>
                            <SectionTitle icon="building-2" aside={<Badge tone="brand">Compte transitaire</Badge>}>
                                Transporteur
                            </SectionTitle>
                            <div className="grid gap-4 sm:grid-cols-2">
                                <Field
                                    id="transitaire"
                                    label="Votre société (transitaire)"
                                    optional
                                    className="sm:col-span-2"
                                    error={form.errors.transitaire}
                                >
                                    <Input
                                        id="transitaire"
                                        value={form.data.transitaire}
                                        onChange={(event) => form.setData('transitaire', event.target.value)}
                                        invalid={Boolean(form.errors.transitaire)}
                                        placeholder="Nom de votre société"
                                    />
                                </Field>

                                <Field id="mandated-type" label="Type de transporteur" required error={form.errors['mandated.type']}>
                                    <Select
                                        id="mandated-type"
                                        value={form.data.mandated.type}
                                        onChange={(event) => setMandated({ type: event.target.value })}
                                        invalid={Boolean(form.errors['mandated.type'])}
                                    >
                                        <option value="entreprise">Entreprise de transport</option>
                                        <option value="particulier">Transporteur particulier</option>
                                    </Select>
                                </Field>

                                {form.data.mandated.type === 'entreprise' ? (
                                    <Field id="mandated-company" label="Entreprise mandatée" required error={form.errors['mandated.company']}>
                                        <Input
                                            id="mandated-company"
                                            value={form.data.mandated.company}
                                            onChange={(event) => setMandated({ company: event.target.value })}
                                            invalid={Boolean(form.errors['mandated.company'])}
                                            placeholder="Ex. Trans Sahel"
                                        />
                                    </Field>
                                ) : (
                                    <>
                                        <Field id="mandated-first" label="Prénom" required error={form.errors['mandated.first']}>
                                            <Input
                                                id="mandated-first"
                                                value={form.data.mandated.first}
                                                onChange={(event) => setMandated({ first: event.target.value })}
                                                invalid={Boolean(form.errors['mandated.first'])}
                                            />
                                        </Field>
                                        <Field id="mandated-last" label="Nom" required error={form.errors['mandated.last']}>
                                            <Input
                                                id="mandated-last"
                                                value={form.data.mandated.last}
                                                onChange={(event) => setMandated({ last: event.target.value })}
                                                invalid={Boolean(form.errors['mandated.last'])}
                                            />
                                        </Field>
                                    </>
                                )}

                                <Field
                                    id="mandated-phone"
                                    label="Téléphone du transporteur mandaté"
                                    required
                                    className="sm:col-span-2"
                                    error={form.errors['mandated.phone']}
                                    hint={form.data.mandated.phone_national
                                        ? `Format international : ${formatPhone(toE164(form.data.mandated.phone_cc, form.data.mandated.phone_national))}`
                                        : 'Saisissez le numéro sans l’indicatif pays.'}
                                >
                                    <PhoneInput
                                        id="mandated-phone"
                                        cc={form.data.mandated.phone_cc}
                                        value={form.data.mandated.phone_national}
                                        onCc={(cc) => setMandated({ phone_cc: cc })}
                                        onChange={(value) => setMandated({ phone_national: value })}
                                        error={form.errors['mandated.phone']}
                                    />
                                </Field>
                            </div>
                        </Card>
                    ) : null}
                </div>

                <div className={cn(step === 1 ? 'block' : 'hidden')}>
                    <StepTrucks
                        f={{ mode: truckMode, op: form.data.op, trucks: templateTrucks }}
                        set={setTemplateForm}
                        setTruck={setTemplateTruck}
                        e={truckErrors}
                    />
                </div>
                <div className="hidden">
                    <Card>
                        <SectionTitle
                            icon="truck"
                            aside={(
                                <Button
                                    size="sm"
                                    variant="secondary"
                                    icon="plus"
                                    onClick={addTruck}
                                    disabled={form.data.trucks.length >= MAX_TRUCKS || form.processing}
                                >
                                    Ajouter un camion
                                </Button>
                            )}
                        >
                            Camions ({form.data.trucks.length}/{MAX_TRUCKS})
                        </SectionTitle>

                        <div className="flex flex-col gap-4">
                            {form.data.trucks.map((truck, index) => {
                                const container = parseContainer(truck.container.number);
                                const bl = parseBL(truck.container.bl);
                                const err = (path) => form.errors[path];

                                return (
                                    <div key={index} className="rounded-2xl border border-slate-200 bg-slate-50/40 p-4 sm:p-5">
                                        <div className="mb-4 flex items-center justify-between gap-3">
                                            <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                                                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white">{index + 1}</span>
                                                Camion {index + 1}
                                            </h3>
                                            {form.data.trucks.length > 1 ? (
                                                <IconButton
                                                    icon="trash-2"
                                                    label={`Retirer le camion ${index + 1}`}
                                                    variant="danger"
                                                    onClick={() => removeTruck(index)}
                                                    disabled={form.processing}
                                                />
                                            ) : null}
                                        </div>

                                        <div className="grid gap-5">
                                            <div>
                                                <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Chauffeur</p>
                                                <div className="grid gap-3 sm:grid-cols-2">
                                                    <Field id={`driver-first-${index}`} label="Prénom" required error={err(`trucks.${index}.driver.first`)}>
                                                        <Input
                                                            id={`driver-first-${index}`}
                                                            value={truck.driver.first}
                                                            onChange={(event) => setTruckValue(index, 'driver', 'first', event.target.value)}
                                                            invalid={Boolean(err(`trucks.${index}.driver.first`))}
                                                            autoComplete="given-name"
                                                        />
                                                    </Field>
                                                    <Field id={`driver-last-${index}`} label="Nom" required error={err(`trucks.${index}.driver.last`)}>
                                                        <Input
                                                            id={`driver-last-${index}`}
                                                            value={truck.driver.last}
                                                            onChange={(event) => setTruckValue(index, 'driver', 'last', event.target.value)}
                                                            invalid={Boolean(err(`trucks.${index}.driver.last`))}
                                                            autoComplete="family-name"
                                                        />
                                                    </Field>
                                                    <Field
                                                        id={`driver-phone-${index}`}
                                                        label="Téléphone"
                                                        required
                                                        error={err(`trucks.${index}.driver.phone`)}
                                                        hint={truck.driver.phone_national
                                                            ? `Format international : ${formatPhone(toE164(truck.driver.phone_cc, truck.driver.phone_national))}`
                                                            : 'Saisissez le numéro sans l’indicatif pays.'}
                                                    >
                                                        <PhoneInput
                                                            id={`driver-phone-${index}`}
                                                            cc={truck.driver.phone_cc}
                                                            value={truck.driver.phone_national}
                                                            onCc={(cc) => setTruckValue(index, 'driver', 'phone_cc', cc)}
                                                            onChange={(value) => setTruckValue(index, 'driver', 'phone_national', value)}
                                                            error={err(`trucks.${index}.driver.phone`)}
                                                        />
                                                    </Field>
                                                    <Field id={`driver-license-${index}`} label="N° de permis" required error={err(`trucks.${index}.driver.license`)}>
                                                        <Input
                                                            id={`driver-license-${index}`}
                                                            value={truck.driver.license}
                                                            onChange={(event) => setTruckValue(index, 'driver', 'license', event.target.value.toUpperCase())}
                                                            invalid={Boolean(err(`trucks.${index}.driver.license`))}
                                                            mono
                                                            maxLength={24}
                                                            placeholder="Ex. TG-123456"
                                                        />
                                                    </Field>
                                                </div>
                                            </div>

                                            <div>
                                                <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Véhicule</p>
                                                <div className="grid gap-3 sm:grid-cols-3">
                                                    <Field id={`vehicle-country-${index}`} label="Pays" required error={err(`trucks.${index}.vehicle.country`)}>
                                                        <Select
                                                            id={`vehicle-country-${index}`}
                                                            value={truck.vehicle.country}
                                                            onChange={(event) => setTruckValue(index, 'vehicle', 'country', event.target.value)}
                                                            invalid={Boolean(err(`trucks.${index}.vehicle.country`))}
                                                        >
                                                            {COUNTRIES.map((country) => (
                                                                <option key={country.code} value={country.code}>{country.name} ({country.code})</option>
                                                            ))}
                                                        </Select>
                                                    </Field>
                                                    <Field id={`vehicle-tractor-${index}`} label="Immatriculation tracteur" required error={err(`trucks.${index}.vehicle.tractor`)}>
                                                        <Input
                                                            id={`vehicle-tractor-${index}`}
                                                            value={truck.vehicle.tractor}
                                                            onChange={(event) => setTruckValue(index, 'vehicle', 'tractor', normalizePlate(event.target.value))}
                                                            invalid={Boolean(err(`trucks.${index}.vehicle.tractor`))}
                                                            mono
                                                            maxLength={14}
                                                            placeholder="Ex. TG 1234 AB"
                                                        />
                                                    </Field>
                                                    <Field id={`vehicle-trailer-${index}`} label="Immatriculation remorque" optional error={err(`trucks.${index}.vehicle.trailer`)}>
                                                        <Input
                                                            id={`vehicle-trailer-${index}`}
                                                            value={truck.vehicle.trailer}
                                                            onChange={(event) => setTruckValue(index, 'vehicle', 'trailer', normalizePlate(event.target.value))}
                                                            invalid={Boolean(err(`trucks.${index}.vehicle.trailer`))}
                                                            mono
                                                            maxLength={14}
                                                            placeholder="Ex. TG 5678 CD"
                                                        />
                                                    </Field>
                                                </div>
                                            </div>

                                            <div>
                                                <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Conteneur</p>
                                                <div className="grid gap-3 sm:grid-cols-2">
                                                    <Field
                                                        id={`container-number-${index}`}
                                                        label="N° de conteneur"
                                                        required={form.data.op !== 'MTP'}
                                                        optional={form.data.op === 'MTP'}
                                                        error={err(`trucks.${index}.container.number`)}
                                                        hint={container.raw
                                                            ? container.message
                                                            : form.data.op === 'MTP'
                                                                ? 'Laissez vide pour un retrait de conteneur vide.'
                                                                : 'Format ISO 6346 : 4 lettres + 7 chiffres.'}
                                                        hintTone={container.valid ? 'ok' : undefined}
                                                    >
                                                        <Input
                                                            id={`container-number-${index}`}
                                                            value={truck.container.number}
                                                            onChange={(event) => setTruckValue(index, 'container', 'number', event.target.value.toUpperCase())}
                                                            invalid={Boolean(err(`trucks.${index}.container.number`))}
                                                            mono
                                                            maxLength={11}
                                                            placeholder="MSCU4829130"
                                                        />
                                                    </Field>
                                                    <Field id={`container-iso-${index}`} label="Type ISO" required error={err(`trucks.${index}.container.iso`)}>
                                                        <Select
                                                            id={`container-iso-${index}`}
                                                            value={truck.container.iso}
                                                            onChange={(event) => setTruckValue(index, 'container', 'iso', event.target.value)}
                                                            invalid={Boolean(err(`trucks.${index}.container.iso`))}
                                                        >
                                                            {ISO_TYPES.map((type) => (
                                                                <option key={type.code} value={type.code}>{type.code} · {type.label}</option>
                                                            ))}
                                                        </Select>
                                                    </Field>
                                                    <Field
                                                        id={`container-bl-${index}`}
                                                        label="N° de connaissement (B/L)"
                                                        required={needsBlAndGoods}
                                                        optional={!needsBlAndGoods}
                                                        error={err(`trucks.${index}.container.bl`)}
                                                        hint={bl.raw ? bl.message : '6 à 20 lettres ou chiffres.'}
                                                        hintTone={bl.valid && bl.carrier ? 'ok' : undefined}
                                                    >
                                                        <Input
                                                            id={`container-bl-${index}`}
                                                            value={truck.container.bl}
                                                            onChange={(event) => setTruckValue(index, 'container', 'bl', event.target.value.toUpperCase())}
                                                            invalid={Boolean(err(`trucks.${index}.container.bl`))}
                                                            mono
                                                            maxLength={20}
                                                            placeholder="MEDU123456"
                                                        />
                                                    </Field>
                                                    <Field
                                                        id={`container-goods-${index}`}
                                                        label="Marchandise"
                                                        required={needsBlAndGoods}
                                                        optional={!needsBlAndGoods}
                                                        error={err(`trucks.${index}.container.goods`)}
                                                    >
                                                        <Input
                                                            id={`container-goods-${index}`}
                                                            value={truck.container.goods}
                                                            onChange={(event) => setTruckValue(index, 'container', 'goods', event.target.value)}
                                                            invalid={Boolean(err(`trucks.${index}.container.goods`))}
                                                            maxLength={255}
                                                            placeholder="Ex. riz en sacs"
                                                        />
                                                    </Field>
                                                    <Field
                                                        id={`container-vgm-${index}`}
                                                        label="VGM (poids brut vérifié)"
                                                        optional
                                                        error={err(`trucks.${index}.container.vgm`)}
                                                        hint="En kilogrammes, entre 1 000 et 45 000. Requis pour un export."
                                                    >
                                                        <Input
                                                            id={`container-vgm-${index}`}
                                                            type="number"
                                                            inputMode="numeric"
                                                            min={1000}
                                                            max={45000}
                                                            step={1}
                                                            value={truck.container.vgm}
                                                            onChange={(event) => setTruckValue(index, 'container', 'vgm', event.target.value)}
                                                            invalid={Boolean(err(`trucks.${index}.container.vgm`))}
                                                            placeholder="Ex. 24500"
                                                        />
                                                    </Field>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </Card>
                </div>

                <div className={cn(step === 2 ? 'block' : 'hidden')}>
                    <Card>
                        <SectionTitle
                            icon="file-up"
                            aside={<Badge tone={totalDocs === expectedDocs ? 'ok' : 'neutral'}>{totalDocs}/{expectedDocs}</Badge>}
                        >
                            Documents obligatoires par camion
                        </SectionTitle>
                        <p className="-mt-2 mb-4 text-sm text-slate-500">
                            Sélectionnez un camion pour déposer ses 6 pièces. Formats acceptés : PDF, JPG, PNG ou WebP · 10 Mo maximum par fichier.
                        </p>

                        <div className="mb-5 flex flex-wrap gap-2" role="tablist" aria-label="Camions">
                            {form.data.trucks.map((truck, index) => {
                                const key = String(truck.key);
                                const active = key === selectedTruckKey;
                                const complete = docsComplete(key);

                                return (
                                    <button
                                        key={key}
                                        type="button"
                                        role="tab"
                                        aria-selected={active}
                                        onClick={() => setActiveTruckKey(key)}
                                        className={cn(
                                            'flex items-center gap-2 rounded-xl border px-3 py-2 text-left text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500',
                                            active
                                                ? 'border-brand-500 bg-brand-50 text-brand-800 ring-1 ring-brand-200'
                                                : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50',
                                        )}
                                    >
                                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white">
                                            {index + 1}
                                        </span>
                                        <span className="font-medium">Camion {index + 1}</span>
                                        {truck.vehicle?.tractor ? (
                                            <span className="font-mono text-xs text-slate-500">{truck.vehicle.tractor}</span>
                                        ) : null}
                                        <Badge tone={complete === rdvDocs.length ? 'ok' : 'neutral'}>{complete}/{rdvDocs.length}</Badge>
                                    </button>
                                );
                            })}
                        </div>

                        {selectedTruck ? (
                            <TruckDocuments
                                truck={selectedTruck}
                                index={selectedTruckIndex}
                                truckKey={selectedTruckKey}
                                docs={form.data.docs?.[selectedTruckKey] || {}}
                                uploaded={uploaded}
                                uploading={uploading}
                                uploadErrors={uploadErrors}
                                errors={form.errors}
                                fileInputs={fileInputs}
                                docTypes={rdvDocs}
                                onUpload={(type, file) => upload(selectedTruckKey, type, file)}
                                onRemove={(type) => removeUpload(selectedTruckKey, type)}
                            />
                        ) : null}
                    </Card>
                </div>

                {step === 3 ? (
                    <DemandeReview
                        data={form.data}
                        selectedSlot={selectedSlot}
                        isTransit={isTransit}
                        uploaded={uploaded}
                        docTypes={rdvDocs}
                        onEdit={setStep}
                    />
                ) : null}

                <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4">
                    <p className="text-sm text-slate-500">
                        {uploadingAny
                            ? 'Attendez la fin des téléversements avant d’envoyer.'
                            : `${fmtInt(form.data.trucks.length)} camion${form.data.trucks.length > 1 ? 's' : ''} · ${totalDocs}/${expectedDocs} documents`}
                    </p>
                    <div className="flex flex-wrap items-center gap-2">
                        <Link href={route('transporteur.demandes.index')} className={buttonClass({ variant: 'secondary' })}>
                            Annuler
                        </Link>
                        {step > 0 ? <Button type="button" variant="secondary" icon="arrow-left" onClick={goPrevious}>Précédent</Button> : null}
                        {step < 3 ? (
                            <Button type="button" icon="arrow-right" iconRight onClick={goNext}>Continuer</Button>
                        ) : (
                            <Button type="button" icon={mode === 'edit' ? 'check' : 'send'} loading={form.processing} disabled={uploadingAny} onClick={submit}>
                                {mode === 'edit' ? 'Enregistrer les modifications' : 'Envoyer la demande'}
                            </Button>
                        )}
                    </div>
                </div>
            </div>
        </form>
    );
}
