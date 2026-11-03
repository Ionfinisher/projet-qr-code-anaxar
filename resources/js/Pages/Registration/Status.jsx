import { useState } from 'react';
import { Head, Link, useForm } from '@inertiajs/react';
import PublicLayout from '@/Layouts/PublicLayout';
import { PageHeader } from '@/Components/ui/Navigation';
import { Card } from '@/Components/ui/Card';
import { Field, Input } from '@/Components/ui/Field';
import { Button, buttonClass } from '@/Components/ui/Button';
import { Badge } from '@/Components/ui/Badge';
import { Alert, EmptyState } from '@/Components/ui/Feedback';
import { Icon } from '@/Components/ui/Icon';

const STATUS_BADGES = {
    pending: { label: 'En cours de validation', tone: 'warn', icon: 'clock' },
    approved: { label: 'Dossier validé', tone: 'ok', icon: 'check' },
    rejected: { label: 'À compléter / Corriger', tone: 'bad', icon: 'triangle-alert' },
};

export default function Status({
    registration = null,
    lookup = { email: '', numero_dossier: '' },
}) {
    const [hasSearched, setHasSearched] = useState(registration !== null);
    const { data, setData, get, processing, errors } = useForm(lookup);

    const submit = (e) => {
        e.preventDefault();
        get(route('registration.status.search'), {
            preserveState: true,
            preserveScroll: true,
            onSuccess: () => setHasSearched(true),
            onError: () => setHasSearched(false),
        });
    };

    const statusConfig = registration
        ? STATUS_BADGES[registration.status] || { label: registration.status_label || registration.status, tone: 'neutral', icon: 'file-text' }
        : null;

    return (
        <PublicLayout wide={false}>
            <Head title="Suivre ma demande d’inscription" />

            <div className="flex flex-col gap-6">
                <PageHeader
                    eyebrow="Espace public"
                    title="Suivre ma demande d’inscription"
                    subtitle="Consultez l’état de votre demande et complétez-la si l’administration vous le demande."
                    className="mb-0"
                />

                <Card as="form" onSubmit={submit} className="flex flex-col gap-4">
                    <div className="grid grid-cols-1 items-end gap-4 sm:grid-cols-[1fr_1.3fr_auto]">
                        <Field id="t-ref" label="Référence de dossier" error={errors.numero_dossier}>
                            <Input
                                id="t-ref"
                                mono
                                placeholder="INS-XXXXXX"
                                value={data.numero_dossier}
                                onChange={(e) => {
                                    setData('numero_dossier', e.target.value.toUpperCase());
                                    setHasSearched(false);
                                }}
                                required
                            />
                        </Field>

                        <Field id="t-contact" label="E-mail de la demande" error={errors.email}>
                            <Input
                                id="t-contact"
                                type="email"
                                autoComplete="username"
                                placeholder="contact@societe.tg"
                                value={data.email}
                                onChange={(e) => {
                                    setData('email', e.target.value);
                                    setHasSearched(false);
                                }}
                                required
                            />
                        </Field>

                        <Button type="submit" icon="search" loading={processing} className="h-10">
                            {processing ? 'Recherche…' : 'Consulter'}
                        </Button>
                    </div>
                </Card>

                {hasSearched && registration && (
                    <div className="flex flex-col gap-5 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
                            <div>
                                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                                    Numéro de dossier
                                </span>
                                <h2 className="font-mono text-xl font-bold tracking-tight text-slate-900">
                                    {registration.numero_dossier}
                                </h2>
                            </div>
                            <Badge tone={statusConfig.tone} icon={statusConfig.icon} size="lg">
                                {statusConfig.label}
                            </Badge>
                        </div>

                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 text-sm">
                            <div>
                                <span className="block text-xs text-slate-500">Adresse e-mail</span>
                                <span className="font-medium text-slate-900 font-mono">{registration.email || data.email}</span>
                            </div>
                            <div>
                                <span className="block text-xs text-slate-500">Statut du traitement</span>
                                <span className="font-medium text-slate-900">{registration.status_label}</span>
                            </div>
                        </div>

                        {registration.rejection_reason && (
                            <Alert tone="bad" icon="file-up" title="Compléments demandés par l’administration">
                                {registration.rejection_reason}
                            </Alert>
                        )}

                        <div className="flex flex-wrap items-center gap-3 border-t border-slate-100 pt-4">
                            {registration.can_edit && registration.edit_url && (
                                <Link
                                    href={registration.edit_url}
                                    className={buttonClass({ variant: 'primary' })}
                                >
                                    <Icon name="pencil" size={18} /> Modifier / Compléter mon dossier
                                </Link>
                            )}

                            {registration.status === 'approved' && typeof route === 'function' && route().has('login') && (
                                <Link
                                    href={route('login')}
                                    className={buttonClass({ variant: 'primary' })}
                                >
                                    <Icon name="log-in" size={18} /> Se connecter à mon compte
                                </Link>
                            )}

                            <Link
                                href={route('login')}
                                className={buttonClass({ variant: 'ghost' })}
                            >
                                Retour à la connexion
                            </Link>
                        </div>
                    </div>
                )}

                {hasSearched && registration === null && (
                    <EmptyState
                        icon="file-search"
                        title="Dossier introuvable"
                    >
                        Aucun dossier ne correspond à ces informations. Vérifiez le numéro de dossier et l’adresse e-mail renseignés.
                    </EmptyState>
                )}
            </div>
        </PublicLayout>
    );
}
