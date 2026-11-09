import { useState } from 'react';
import { Head, Link, useForm } from '@inertiajs/react';
import PublicLayout from '@/Layouts/PublicLayout';
import { PageHeader } from '@/Components/ui/Navigation';
import { Card, SectionTitle } from '@/Components/ui/Card';
import { Field, Input } from '@/Components/ui/Field';
import { Button, buttonClass } from '@/Components/ui/Button';
import { Badge } from '@/Components/ui/Badge';
import { Alert, EmptyState } from '@/Components/ui/Feedback';
import { Icon } from '@/Components/ui/Icon';

const STATUS = {
    pending: { label: 'En attente de traitement', tone: 'warn', icon: 'clock' },
    approved: { label: 'Demande validée', tone: 'ok', icon: 'check' },
    rejected: { label: 'À compléter / Corriger', tone: 'bad', icon: 'triangle-alert' },
};

const size = (bytes) => {
    if (!bytes) return '—';
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} Ko`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
};

const date = (value) => value ? new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : '';

function KeyValues({ items }) {
    return (
        <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
            {items.filter((item) => item.value !== null && item.value !== undefined && item.value !== '').map((item) => (
                <div key={item.label}>
                    <dt className="text-xs text-slate-500">{item.label}</dt>
                    <dd className="mt-1 text-sm font-medium text-slate-900">{item.value}</dd>
                </div>
            ))}
        </dl>
    );
}

function RegistrationDetails({ registration }) {
    const config = STATUS[registration.status] || { label: registration.status_label, tone: 'neutral', icon: 'file-text' };
    const docs = Object.values(registration.documents || {});

    return (
        <div className="flex flex-col gap-5">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 pb-4">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-brand-700">Demande d’inscription</p>
                        <h2 className="mt-1 font-mono text-2xl font-bold tracking-tight text-slate-900">{registration.numero_dossier}</h2>
                        <p className="mt-2 text-sm text-slate-500">
                            {registration.identity?.find((item) => item.label === 'Raison sociale' || item.label === 'Nom')?.value}
                            {registration.submitted_at ? ` · déposée le ${date(registration.submitted_at)}` : ''}
                        </p>
                    </div>
                    <Badge tone={config.tone} icon={config.icon} size="lg">{config.label}</Badge>
                </div>
                <div className="mt-5">
                    {registration.status === 'pending' && <Alert tone="info" icon="hourglass" title="En cours d’examen">L’administration vérifie les pièces. La décision est envoyée par e-mail et SMS.</Alert>}
                    {registration.status === 'approved' && <Alert tone="ok" icon="check" title="Dossier validé">Votre demande a été validée par l’administration.</Alert>}
                    {registration.status === 'rejected' && <Alert tone="warn" icon="file-up" title="Compléments demandés par l’administration">{registration.rejection_reason}</Alert>}
                </div>
            </div>

            {registration.can_edit && registration.edit_url && (
                <div className="flex">
                    <Link href={registration.edit_url} className={buttonClass()}><Icon name="pencil" size={18} /> Compléter ma demande</Link>
                </div>
            )}

            <Card>
                <SectionTitle icon="building-2">Identité</SectionTitle>
                <KeyValues items={registration.identity || []} />
            </Card>

            <Card>
                <SectionTitle icon="at-sign">Contact et identifiant de connexion</SectionTitle>
                <KeyValues items={[
                    { label: 'E-mail', value: registration.email },
                    { label: 'Téléphone', value: registration.phone },
                    { label: 'Identifiant', value: registration.email || registration.phone },
                ]} />
            </Card>

            <Card>
                <SectionTitle icon="file-check" aside={<span className="text-[13px] tabular-nums text-slate-500">{docs.length}/{docs.length} documents</span>}>Pièces justificatives</SectionTitle>
                <ul className="flex flex-col divide-y divide-slate-100">
                    {docs.map((document) => (
                        <li key={`${document.label}-${document.name}`} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
                            <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700"><Icon name="file-check" size={18} /></span>
                            <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium text-slate-900">{document.label}</p>
                                <p className="mt-0.5 flex flex-wrap gap-x-2 text-[13px] text-slate-500">
                                    <span className="truncate">{document.name}</span><span>{size(document.size)}</span>
                                    {document.sha256 && <span className="font-mono">SHA-256 {document.sha256.slice(0, 12)}…</span>}
                                </p>
                            </div>
                            <Badge tone="ok" icon="check">Déposée</Badge>
                        </li>
                    ))}
                </ul>
            </Card>

            <Card>
                <SectionTitle icon="history">Historique</SectionTitle>
                <ol className="flex flex-col gap-4">
                    {(registration.history || []).map((item, index) => (
                        <li key={`${item.title}-${item.at}-${index}`} className="flex gap-3">
                            <span className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-700"><Icon name={index === 0 ? 'send' : 'file-up'} size={14} /></span>
                            <div><p className="text-sm font-semibold text-slate-900">{item.title}</p><p className="text-sm text-slate-600">{item.description}</p><p className="mt-1 text-xs text-slate-400">{date(item.at)}</p></div>
                        </li>
                    ))}
                </ol>
            </Card>

        </div>
    );
}

export default function Status({ registration = null, lookup = { email: '', contact: '', numero_dossier: '' } }) {
    const [hasSearched, setHasSearched] = useState(registration !== null);
    const { data, setData, get, processing, errors } = useForm({ ...lookup, contact: lookup.contact || lookup.email });
    const submit = (event) => {
        event.preventDefault();
        get(route('registration.status.search'), { preserveState: true, preserveScroll: true, onSuccess: () => setHasSearched(true), onError: () => setHasSearched(false) });
    };

    return (
        <PublicLayout wide>
            <Head title="Suivre ma demande d’inscription" />
            <div className="flex flex-col gap-6">
                <PageHeader eyebrow="Espace public" title="Suivre ma demande d’inscription" subtitle="Consultez l’état de votre demande et complétez-la si l’administration vous le demande." className="mb-0" />
                <Card as="form" onSubmit={submit} className="flex flex-col gap-4">
                    <div className="grid grid-cols-1 items-end gap-4 md:grid-cols-[1fr_1.4fr_auto]">
                        <Field id="t-ref" label="Référence" error={errors.numero_dossier}><Input id="t-ref" mono placeholder="INS-XXXXXX" value={data.numero_dossier} onChange={(event) => { setData('numero_dossier', event.target.value.toUpperCase()); setHasSearched(false); }} required /></Field>
                        <Field id="t-contact" label="E-mail ou téléphone de la demande" error={errors.contact || errors.email}><Input id="t-contact" autoComplete="username" placeholder="contact@societe.tg ou +228 90 00 00 00" value={data.contact} onChange={(event) => { setData('contact', event.target.value); setHasSearched(false); }} required /></Field>
                        <Button type="submit" icon="search" loading={processing} className="h-10">{processing ? 'Recherche…' : 'Consulter'}</Button>
                    </div>
                    {errors.contact || errors.email ? <p role="alert" className="text-sm text-rose-700">{errors.contact || errors.email}</p> : null}
                </Card>
                {hasSearched && registration ? <RegistrationDetails registration={registration} /> : null}
                {hasSearched && !registration ? <EmptyState icon="file-search" title="Dossier introuvable">Aucun dossier ne correspond à ces informations. Vérifiez la référence et l’e-mail ou le téléphone renseigné.</EmptyState> : null}
            </div>
        </PublicLayout>
    );
}
