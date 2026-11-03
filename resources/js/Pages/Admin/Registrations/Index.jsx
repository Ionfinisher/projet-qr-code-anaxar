import { useMemo, useState } from 'react';
import { Head, Link } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { PageHeader, SearchInput } from '@/Components/ui/Navigation';
import { Segmented } from '@/Components/ui/Choice';
import { Badge } from '@/Components/ui/Badge';
import { Button, buttonClass } from '@/Components/ui/Button';
import { EmptyState } from '@/Components/ui/Feedback';
import { Icon } from '@/Components/ui/Icon';
import { cn } from '@/Lib/cn';

const FILTERS = [
    { value: 'all', label: 'Toutes', test: () => true },
    { value: 'pending', label: 'À traiter', test: (i) => i.status === 'pending' },
    { value: 'approved', label: 'Validées', test: (i) => i.status === 'approved' },
    { value: 'rejected', label: 'À corriger', test: (i) => i.status === 'rejected' },
];

const STATUS_MAP = {
    pending: { label: 'À traiter', tone: 'warn', icon: 'clock' },
    approved: { label: 'Validée', tone: 'ok', icon: 'check' },
    rejected: { label: 'À corriger', tone: 'bad', icon: 'triangle-alert' },
};

export default function Index({ auth, registrations }) {
    const [filter, setFilter] = useState('all');
    const [search, setSearch] = useState('');

    const items = registrations?.data || [];

    const counts = useMemo(() => {
        return Object.fromEntries(
            FILTERS.map((f) => [f.value, items.filter(f.test).length])
        );
    }, [items]);

    const filteredItems = useMemo(() => {
        const activeFilter = FILTERS.find((f) => f.value === filter) || FILTERS[0];
        const q = search.trim().toLowerCase();

        return items.filter((item) => {
            const matchesFilter = activeFilter.test(item);
            if (!matchesFilter) return false;
            if (!q) return true;

            return (
                (item.numero_dossier && item.numero_dossier.toLowerCase().includes(q)) ||
                (item.name && item.name.toLowerCase().includes(q)) ||
                (item.email && item.email.toLowerCase().includes(q))
            );
        });
    }, [items, filter, search]);

    return (
        <AuthenticatedLayout user={auth.user}>
            <Head title="Demandes d’inscription" />

            <div className="flex flex-col gap-6">
                <PageHeader
                    title="Demandes d’inscription"
                    subtitle="Vérifiez les pièces justificatives avant d’ouvrir un compte transporteur."
                    className="mb-0"
                />

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <Segmented
                        label="Filtrer par statut"
                        value={filter}
                        onChange={setFilter}
                        options={FILTERS.map((f) => ({
                            value: f.value,
                            label: f.label,
                            count: counts[f.value],
                        }))}
                    />

                    <SearchInput
                        value={search}
                        onChange={setSearch}
                        placeholder="Référence, nom, e-mail…"
                        className="w-full sm:w-72"
                    />
                </div>

                {filteredItems.length === 0 ? (
                    <EmptyState
                        icon="user-check"
                        title="Aucun dossier dans cette vue"
                    >
                        {search
                            ? 'Aucun dossier ne correspond à votre recherche.'
                            : 'Toutes les demandes de cette catégorie ont été traitées.'}
                    </EmptyState>
                ) : (
                    <div className="flex flex-col gap-2">
                        {filteredItems.map((item) => {
                            const statusConfig = STATUS_MAP[item.status] || {
                                label: item.status,
                                tone: 'neutral',
                                icon: 'file-text',
                            };

                            return (
                                <div
                                    key={item.id}
                                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-colors hover:border-slate-300"
                                >
                                    <div className="flex items-start sm:items-center gap-3 min-w-0">
                                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                                            <Icon name="truck" size={20} />
                                        </div>
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-2">
                                                <span className="font-semibold text-slate-900 truncate">
                                                    {item.name || 'Demandeur sans nom'}
                                                </span>
                                            </div>
                                            <div className="flex flex-wrap items-center gap-x-2 text-xs text-slate-500">
                                                <span className="font-mono font-medium text-slate-700">
                                                    {item.numero_dossier}
                                                </span>
                                                <span>·</span>
                                                <span className="truncate">{item.email}</span>
                                            </div>
                                            {item.rejection_reason && item.status === 'rejected' && (
                                                <p className="mt-1 text-xs text-rose-700 line-clamp-1">
                                                    Motif : {item.rejection_reason}
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                                        <Badge tone={statusConfig.tone} icon={statusConfig.icon}>
                                            {statusConfig.label}
                                        </Badge>

                                        <Link
                                            href={route('admin.registrations.show', item.id)}
                                            className={buttonClass({ variant: 'secondary', size: 'sm' })}
                                        >
                                            Consulter
                                        </Link>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Pagination */}
                {registrations?.links && registrations.links.length > 3 && (
                    <nav className="flex items-center justify-center gap-1 pt-4" aria-label="Pagination">
                        {registrations.links.map((link, idx) => (
                            <Link
                                key={idx}
                                href={link.url || '#'}
                                dangerouslySetInnerHTML={{ __html: link.label }}
                                className={cn(
                                    'inline-flex h-9 min-w-[36px] items-center justify-center rounded-lg px-3 text-xs font-semibold transition-colors',
                                    link.active
                                        ? 'bg-brand-600 text-white'
                                        : link.url
                                        ? 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                                        : 'text-slate-400 opacity-50 cursor-not-allowed'
                                )}
                            />
                        ))}
                    </nav>
                )}
            </div>
        </AuthenticatedLayout>
    );
}
