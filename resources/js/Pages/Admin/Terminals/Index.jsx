import { useState } from 'react';
import { Head, router } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { PageHeader } from '@/Components/ui/Navigation';
import { Button } from '@/Components/ui/Button';
import { Badge } from '@/Components/ui/Badge';
import { EmptyState } from '@/Components/ui/Feedback';
import { Icon } from '@/Components/ui/Icon';
import Swal from 'sweetalert2';
import { TerminalDrawer } from './TerminalDrawer';

export default function Index({ auth, terminals = [] }) {
    const [editingTerminal, setEditingTerminal] = useState(null);
    const [drawerOpen, setDrawerOpen] = useState(false);

    const openCreate = () => {
        setEditingTerminal(null);
        setDrawerOpen(true);
    };

    const openEdit = (terminal) => {
        setEditingTerminal(terminal);
        setDrawerOpen(true);
    };

    const deleteTerminal = async (terminal) => {
        if (terminal.creneaux_count > 0) {
            Swal.fire({
                title: 'Suppression impossible',
                text: `Ce terminal possède ${terminal.creneaux_count} créneau(x) rattaché(s). Supprimez d'abord ces créneaux.`,
                icon: 'error',
                confirmButtonText: 'Compris',
            });
            return;
        }

        const result = await Swal.fire({
            title: `Supprimer le terminal ${terminal.code} ?`,
            text: `Voulez-vous vraiment supprimer "${terminal.label}" ?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Supprimer',
            cancelButtonText: 'Annuler',
            confirmButtonColor: '#e11d48',
        });

        if (result.isConfirmed) {
            router.delete(route('admin.terminals.destroy', terminal.id));
        }
    };

    const addAction = (
        <Button icon="plus" onClick={openCreate}>
            Ajouter un terminal
        </Button>
    );

    return (
        <AuthenticatedLayout user={auth.user}>
            <Head title="Gestion des terminaux" />

            <div className="flex flex-col gap-5">
                <PageHeader
                    title="Terminaux portuaires"
                    subtitle="Gestion des quais et terminaux de passage pour les rendez-vous"
                    actions={addAction}
                    className="mb-0"
                />

                {terminals.length === 0 ? (
                    <EmptyState
                        icon="anchor"
                        title="Aucun terminal configuré"
                        action={addAction}
                    >
                        Ajoutez votre premier terminal pour commencer à associer des créneaux.
                    </EmptyState>
                ) : (
                    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                        <table className="w-full text-left text-sm text-slate-600">
                            <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500">
                                <tr>
                                    <th className="px-5 py-3.5">Code</th>
                                    <th className="px-5 py-3.5">Nom du terminal</th>
                                    <th className="px-5 py-3.5">Nom abrégé</th>
                                    <th className="px-5 py-3.5">Créneaux rattachés</th>
                                    <th className="px-5 py-3.5">Statut</th>
                                    <th className="px-5 py-3.5 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {terminals.map((t) => (
                                    <tr key={t.id} className="hover:bg-slate-50/70 transition-colors">
                                        <td className="px-5 py-4 font-mono font-bold text-slate-900">
                                            {t.code}
                                        </td>
                                        <td className="px-5 py-4 font-semibold text-slate-900">
                                            {t.label}
                                        </td>
                                        <td className="px-5 py-4 text-slate-600">
                                            {t.short}
                                        </td>
                                        <td className="px-5 py-4">
                                            <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                                                <Icon name="calendar-days" size={13} className="text-slate-400" />
                                                {t.creneaux_count} créneau{t.creneaux_count > 1 ? 'x' : ''}
                                            </span>
                                        </td>
                                        <td className="px-5 py-4">
                                            {t.statut === 'active' ? (
                                                <Badge tone="ok">Actif</Badge>
                                            ) : (
                                                <Badge tone="neutral">Inactif</Badge>
                                            )}
                                        </td>
                                        <td className="px-5 py-4 text-right">
                                            <div className="flex items-center justify-end gap-1.5">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    icon="pencil"
                                                    onClick={() => openEdit(t)}
                                                >
                                                    Modifier
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    icon="trash-2"
                                                    className="text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                                                    onClick={() => deleteTerminal(t)}
                                                >
                                                    Supprimer
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                <TerminalDrawer
                    open={drawerOpen}
                    terminal={editingTerminal}
                    onClose={() => setDrawerOpen(false)}
                />
            </div>
        </AuthenticatedLayout>
    );
}

