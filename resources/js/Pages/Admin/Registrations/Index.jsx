import { useEffect, useMemo, useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { PageHeader, SearchInput } from '@/Components/ui/Navigation';
import { Segmented } from '@/Components/ui/Choice';
import { Badge } from '@/Components/ui/Badge';
import { Button, buttonClass } from '@/Components/ui/Button';
import { EmptyState, Alert } from '@/Components/ui/Feedback';
import { Drawer, Modal } from '@/Components/ui/index.js';
import { KeyValue } from '@/Components/ui/Data.jsx';
import { Card, SectionTitle } from '@/Components/ui/Card.jsx';
import { formatPhone, fmtDateTime, fmtAgo } from '@/Lib/domain.js';
import { rejectWithMotif, requestComplements, introHtml, kvHtml } from '../components/dialogs.js';

import { Icon } from '@/Components/ui/Icon';
import { cn } from '@/Lib/cn';
import { confirmAction } from '@/Lib/alerts';


const mono = v => <span className="font-mono">{v}</span>;

/** Identité du demandeur sous forme [libellé, valeur]. */
function insIdentity(registration) {
    if (registration.entity.type === 'particulier') {
        return [
            ['Type de compte', registration.entity.type],
            ['Nom', `${registration.entity.name}`],
            ['Adresse', `${registration.entity.address}`],
            registration.entity.trucks ? ['Camions', String(registration.entity.trucks)] : null,
        ];
    }
    return [
        ['Type de compte', registration.entity.type],
        ['Raison sociale', registration.entity.name],
        ['NIF', mono(registration.entity.nif)],
        ['RCCM', mono(registration.entity.rccm)],
        ['Adresse', `${registration.entity.address}`],
        registration.entity.representative ? ['Représentant légal', `${registration.entity.representative}`] : null,
        registration.entity.type === 'transport' && registration.entity.trucks ? ['Camions', String(registration.entity.trucks)] : null,
    ];
}

const FILTERS = [
    { value: 'all', label: 'Toutes', test: () => true },
    { value: 'pending', label: 'À traiter', test: (i) => i.status === 'pending' },
    { value: 'complements_requested', label: 'À Complémenter', test: (i) => i.status === 'complements_requested' },
    { value: 'approved', label: 'Validées', test: (i) => i.status === 'approved' },
    { value: 'rejected', label: 'Rejetées', test: (i) => i.status === 'rejected' },
];

const STATUS_MAP = {
    pending: { label: 'À traiter', tone: 'warn', icon: 'clock' },
    complements_requested: { label: 'Compléments demandés', tone: 'warn', icon: 'file-up' },
    approved: { label: 'Validée', tone: 'ok', icon: 'check' },
    rejected: { label: 'Rejetée', tone: 'bad', icon: 'triangle-alert' },
};

const COMPLEMENT_REASONS = [
    'Pièce illisible : merci de la déposer à nouveau.',
    'Extrait RCCM de moins de 3 mois.',
    'Agrément ou autorisation en cours de validité.',
    'Pièce d’identité du représentant légal.',
];

const REJECT_REASONS = [
    'Pièces justificatives non conformes.',
    'Informations non concordantes (NIF, RCCM).',
    'Autorisation ou agrément abdent ou expiré.',
    'Doublon : un compte existe déjà.',
    'Attestation d’assurance ou licence de transport manquante.',
    'Autre motif.',
];


function RegistrationDetail({ registration }) {
    const [busy, setBusy] = useState(false);
    const [actionNotice, setActionNotice] = useState(null);
    const [preview, setPreview] = useState(null);
    const config = STATUS_MAP[registration.status] || { label: registration.status, tone: 'neutral', icon: 'file-text' };
    const canAct = ['pending', 'complements_requested'].includes(registration.status);
    const entity = registration.entity || {};

    const postDecision = (url, data, message) => {
        setBusy(true);
        setActionNotice(null);
        router.post(url, data, {
            preserveScroll: true,
            onSuccess: () => setActionNotice({ tone: 'ok', title: 'Action effectuée', message }),
            onError: (errors) => {
                console.error('Registration decision failed', { url, data, errors });
                const details = Object.values(errors || {}).flat().filter(Boolean).join(' ');
                setActionNotice({
                    tone: 'bad',
                    title: 'Action impossible',
                    message: details || 'Impossible de traiter ce dossier.',
                });
            },
            onFinish: () => setBusy(false),
        });
    };

    const validate = async () => {
        const ok = await confirmAction({
            title: `Valider ${registration.numero_dossier}`,
            html: introHtml(`Le compte de **${entity.name || 'ce demandeur'}** sera créé et activé.`) + kvHtml([
                ['Profil', entity.type === 'transitaire' ? 'Transitaire' : 'Transporteur'],
                ['Identifiant', entity.email || formatPhone(entity.phone)],
                ['Mot de passe', 'Celui choisi à l’inscription (déjà haché)'],
                ['Notifications', [entity.email && 'e-mail'].filter(Boolean).join(' + ')],
            ]),
            confirmText: 'Valider et notifier', tone: 'ok',
        });
        if (ok) {
            postDecision(route('admin.registrations.approve', registration.id), {}, 'Dossier validé et demandeur notifié.');
        };
    };
    const complete = async () => {
        const result = await requestComplements({ title: `Compléments · ${registration.numero_dossier}`, suggestions: COMPLEMENT_REASONS });
        if (result) {
            postDecision(
                route('admin.registrations.complements', registration.id),
                { raison: result },
                'Demande de compléments envoyée.',
            );
        }

    };
    const reject = async () => {
        const result = await rejectWithMotif({ title: `Rejeter ${registration.numero_dossier}`, motifs: REJECT_REASONS });
        if (result) {
            postDecision(
                route('admin.registrations.reject', registration.id),
                { raison: `${result.motif}${result.comment ? ` ${result.comment}` : ''}` },
                'Demande rejetée.',
            );
        }

    };

    // const approve = async () => {
    //     if (await confirmAction({
    //         title: `Valider ${registration.numero_dossier}`,
    //         text: `Le compte de ${entity.name || 'ce demandeur'} sera créé et activé.`,
    //         confirmText: 'Valider et notifier',
    //         tone: 'ok',
    //     })) {
    //         postDecision(route('admin.registrations.approve', registration.id), {}, 'Dossier validé et demandeur notifié.');
    //     }
    // };

    // const requestComplements = async () => {
    //     const result = await chooseReason({
    //         title: `Compléments · ${registration.numero_dossier}`,
    //         reasons: COMPLEMENT_REASONS,
    //         otherLabel: 'Autre complément',
    //         confirmText: 'Demander les compléments',
    //         tone: 'primary',
    //         comment: { label: 'Précisions demandées', placeholder: 'Indiquez les éléments à corriger.', required: true },
    //     });
    //     if (result) postDecision(route('admin.registrations.complements', registration.id), { raison: `${result.reason}${result.comment ? ` ${result.comment}` : ''}` }, 'Demande de compléments envoyée.');
    // };

    // const reject = async () => {
    //     const result = await chooseReason({
    //         title: `Rejeter ${registration.numero_dossier}`,
    //         reasons: COMPLEMENT_REASONS,
    //         otherLabel: 'Autre motif',
    //         confirmText: 'Rejeter la demande',
    //         tone: 'danger',
    //         comment: { label: 'Motif détaillé', placeholder: 'Expliquez pourquoi une nouvelle demande est nécessaire.', required: true },
    //     });
    //     if (result) postDecision(route('admin.registrations.reject', registration.id), { raison: `${result.reason}${result.comment ? ` ${result.comment}` : ''}` }, 'Demande rejetée.');
    // };

    return (
        <div className="flex flex-col gap-5">
            <div>
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-brand-700">Demande d’inscription</p>
                <h2 className="mt-1 font-mono text-2xl font-semibold text-slate-900">{registration.numero_dossier}</h2>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                    <Badge tone={config.tone} icon={config.icon} size="lg">{config.label}</Badge>
                    <span className="text-[13px] text-slate-500">{entity.name || 'Demandeur sans nom'} · {registration.email} · déposée {fmtAgo(registration.submitted_at)}</span>
                </div>
            </div>

            {/* {actionNotice && <Alert tone={actionNotice.tone} icon={actionNotice.tone === 'ok' ? 'check' : 'triangle-alert'} title={actionNotice.title}>{actionNotice.message}</Alert>}
            {registration.status === 'complements_requested' && <Alert tone="warn" icon="file-up" title="Compléments déjà demandés">{registration.rejection_reason}</Alert>}
            {registration.status === 'rejected' && <Alert tone="bad" icon="triangle-alert" title="Demande rejetée">Le demandeur doit créer une nouvelle demande. Motif : {registration.rejection_reason}</Alert>}
            {registration.status === 'approved' && <Alert tone="ok" icon="check" title="Dossier validé">Le compte transporteur associé est actif.</Alert>} */}

            {canAct && (
                <div className="flex flex-wrap gap-2">
                    <Button variant="ok" icon="user-check" loading={busy} onClick={validate}>Valider et créer le compte</Button>
                    <Button variant="secondary" icon="file-up" disabled={busy} onClick={complete}>Demander des compléments</Button>
                    <Button variant="danger-outline" icon="x" disabled={busy} onClick={reject}>Rejeter</Button>
                </div>
            )}

            <Card>
                <SectionTitle icon="user">Identité</SectionTitle>
                <KeyValue items={insIdentity(registration)} />
            </Card>
            <Card>
                <SectionTitle icon="at-sign">Contact et identifiant de connexion</SectionTitle>
                <KeyValue items={[
                    registration.email ? ['E-mail', registration.email] : null,
                    ['Téléphone', <span className="tabular-nums">{formatPhone(registration.phone)}</span>],
                    ['Identifiant', registration.email || formatPhone(registration.phone)],
                ]} />
            </Card>
            <Card>
                <SectionTitle icon="file-check" aside={<span className="text-[13px] tabular-nums text-slate-500">{registration.documents?.length}</span>}>Pièces justificatives</SectionTitle>
                {registration.documents?.length ? (
                    <ul className="flex flex-col divide-y divide-slate-100 rounded-2xl border border-slate-200">
                        {registration.documents.map((document) => (
                            <li key={document.id} className="flex items-center gap-3 p-3">
                                <Icon name="file-check" size={18} className="text-emerald-600" />
                                <span className="min-w-0 flex-1 text-sm text-slate-900">{document.label}<span className="ml-2 text-xs text-slate-500">{document.filename}</span></span>
                                {document.preview_url && ['application/pdf', 'image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(document.mime_type) && <Button variant="ghost" size="sm" icon="eye" onClick={() => setPreview(document)}>Voir</Button>}
                                {document.download_url && <a href={document.download_url} className={buttonClass({ variant: 'ghost', size: 'sm' })}>Télécharger</a>}
                            </li>
                        ))}
                    </ul>
                ) : <p className="text-sm text-slate-500">Aucun document joint à ce dossier.</p>}
            </Card>
            {/* <Card>
                <SectionTitle icon="history">Historique</SectionTitle>
                <HistoryTimeline items={ins.history || []} />
              </Card> */}
            <Modal open={!!preview} onClose={() => setPreview(null)} title={preview?.label || 'Aperçu du document'} description={preview?.filename} size="xl" bodyClassName="bg-slate-100">
                {preview?.mime_type === 'application/pdf' ? (
                    <iframe title={preview.filename} src={preview.preview_url} className="h-[70vh] w-full rounded-xl border border-slate-200 bg-white" />
                ) : (
                    <img src={preview?.preview_url} alt={preview?.label || preview?.filename} className="mx-auto max-h-[70vh] max-w-full rounded-xl object-contain shadow-sm" />
                )}
            </Modal>
        </div>
    );
}

export default function Index({ auth, registrations }) {
    const [filter, setFilter] = useState('all');
    const [search, setSearch] = useState('');
    const [selectedId, setSelectedId] = useState(null);
    const items = registrations?.data || [];

    const counts = useMemo(() => Object.fromEntries(FILTERS.map((f) => [f.value, items.filter(f.test).length])), [items]);
    const filteredItems = useMemo(() => {
        const activeFilter = FILTERS.find((f) => f.value === filter) || FILTERS[0];
        const q = search.trim().toLowerCase();
        return items.filter((item) => {
            if (!activeFilter.test(item)) return false;
            return !q || [item.numero_dossier, item.name, item.email].filter(Boolean).join(' ').toLowerCase().includes(q);
        });
    }, [items, filter, search]);

    useEffect(() => {
        if (!filteredItems.some((item) => item.id === selectedId)) setSelectedId(filteredItems[0]?.id || null);
    }, [filteredItems, selectedId]);

    const selected = filteredItems.find((item) => item.id === selectedId) || null;

    return (
        <AuthenticatedLayout user={auth.user}>
            <Head title="Demandes d’inscription" />
            <div className="flex flex-col gap-6">
                <PageHeader title="Demandes d’inscription" subtitle="Vérifiez les pièces justificatives avant d’ouvrir un compte transporteur." className="mb-0" />
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <Segmented label="Filtrer par statut" value={filter} onChange={setFilter} options={FILTERS.map((f) => ({ value: f.value, label: f.label, count: counts[f.value] }))} />
                    <SearchInput value={search} onChange={setSearch} placeholder="Référence, nom, e-mail…" className="w-full sm:w-72" />
                </div>

                {filteredItems.length === 0 ? <EmptyState icon="user-check" title="Aucun dossier dans cette vue">Aucun dossier ne correspond à votre recherche.</EmptyState> : (
                    <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(19rem,0.8fr)_minmax(0,1.5fr)]">
                        <div className="flex flex-col gap-2">
                            {filteredItems.map((item) => {
                                const config = STATUS_MAP[item.status] || { label: item.status, tone: 'neutral', icon: 'file-text' };
                                return <button type="button" key={item.id} onClick={() => setSelectedId(item.id)} className={cn('w-full rounded-2xl border p-4 text-left transition-colors', item.id === selectedId ? 'border-brand-500 bg-brand-50 ring-2 ring-brand-500/10' : 'border-slate-200 bg-white hover:border-slate-300')}>
                                    <div className="flex items-start gap-3">
                                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600"><Icon name="truck" size={20} /></span>
                                        <span className="min-w-0 flex-1">
                                            <span className="block truncate font-semibold text-slate-900">{item.name || 'Demandeur sans nom'}</span>
                                            <span className="mt-1 block truncate font-mono text-xs text-slate-500">{item.numero_dossier}</span>
                                        </span>
                                        <Badge tone={config.tone} icon={config.icon}>{config.label}</Badge>
                                    </div>
                                </button>;
                            })}
                        </div>
                        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm lg:sticky lg:top-6">
                            {selected ? <RegistrationDetail registration={selected} /> : <EmptyState icon="file-search" title="Sélectionnez un dossier" />}
                        </div>
                    </div>
                )}

                {registrations?.links && registrations.links.length > 3 && <nav className="flex items-center justify-center gap-1 pt-2" aria-label="Pagination">
                    {registrations.links.map((link, index) => <Link key={index} href={link.url || '#'} dangerouslySetInnerHTML={{ __html: link.label }} className={cn('inline-flex h-9 min-w-[36px] items-center justify-center rounded-lg border px-3 text-xs font-semibold', link.active ? 'border-brand-600 bg-brand-600 text-white' : link.url ? 'border-slate-200 bg-white text-slate-700' : 'cursor-not-allowed text-slate-400')} />)}
                </nav>}
            </div>
        </AuthenticatedLayout>
    );
}
