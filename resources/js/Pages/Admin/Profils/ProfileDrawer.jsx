import { useState } from 'react';
import { router } from '@inertiajs/react';
import { Drawer, Button, Badge, Field, Input, Textarea, Segmented, Alert, Avatar } from '@/Components/ui';
import { PermMatrix } from './PermMatrix';

export function ProfileDrawer({ p, canManage = true, onClose }) {
    const creating = !p;
    const [mode, setMode] = useState(creating ? 'edit' : 'view');
    const [f, setF] = useState(() => ({
        name: p?.name || '',
        description: p?.description || '',
        kind: p?.kind || 'interne',
        perms: p ? [...p.perms] : ['demandes.consulter'],
    }));
    const [err, setErr] = useState('');
    const [busy, setBusy] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState(false);

    const users = p?.users || [];
    const locked = Boolean(p?.is_locked ?? p?.locked);
    const system = Boolean(p?.is_system ?? p?.system);

    const set = (patch) => setF((prev) => ({ ...prev, ...patch }));

    const save = () => {
        if (!f.name.trim()) {
            setErr('Le nom du profil est obligatoire.');
            return;
        }

        setBusy(true);
        setErr('');

        if (creating) {
            router.post(route('admin.profils.store'), f, {
                preserveScroll: true,
                onSuccess: () => {
                    setBusy(false);
                    onClose();
                },
                onError: (errors) => {
                    setBusy(false);
                    setErr(Object.values(errors)[0] || 'Erreur lors de la création du profil.');
                },
            });
        } else {
            router.put(route('admin.profils.update', p.id), f, {
                preserveScroll: true,
                onSuccess: () => {
                    setBusy(false);
                    setMode('view');
                },
                onError: (errors) => {
                    setBusy(false);
                    setErr(Object.values(errors)[0] || 'Erreur lors de la mise à jour du profil.');
                },
            });
        }
    };

    const handleDelete = () => {
        setBusy(true);
        router.delete(route('admin.profils.destroy', p.id), {
            preserveScroll: true,
            onSuccess: () => {
                setBusy(false);
                onClose();
            },
            onError: (errors) => {
                setBusy(false);
                setConfirmDelete(false);
                setErr(Object.values(errors)[0] || 'Erreur lors de la suppression.');
            },
        });
    };

    const footer = !canManage ? null : mode === 'edit' ? (
        <>
            <Button
                variant="ghost"
                onClick={() => {
                    if (creating) {
                        onClose();
                    } else {
                        setMode('view');
                        setErr('');
                    }
                }}
            >
                Annuler
            </Button>
            <Button icon="check" loading={busy} onClick={save}>
                {creating ? 'Créer le profil' : 'Enregistrer'}
            </Button>
        </>
    ) : (
        <>
            {!system && (
                <Button
                    variant="danger-outline"
                    icon="trash-2"
                    disabled={busy}
                    onClick={() => setConfirmDelete(true)}
                >
                    Supprimer
                </Button>
            )}
            {!locked && (
                <Button
                    icon="pencil"
                    onClick={() => {
                        setErr('');
                        setMode('edit');
                    }}
                >
                    Modifier
                </Button>
            )}
        </>
    );

    return (
        <Drawer
            open
            onClose={onClose}
            title={creating ? 'Nouveau profil' : p.name}
            description={creating ? 'Habilitations attribuées aux utilisateurs de ce profil.' : undefined}
            size="lg"
            footer={footer}
        >
            {err ? <Alert tone="bad" className="mb-4">{err}</Alert> : null}

            {confirmDelete ? (
                <Alert
                    tone="bad"
                    title={`Supprimer le profil « ${p.name} » ?`}
                    className="mb-4"
                >
                    <p className="mb-3 text-sm">
                        Cette action est définitive. Les utilisateurs ne pourront plus disposer de ces habilitations.
                    </p>
                    <div className="flex gap-2">
                        <Button
                            variant="danger"
                            size="sm"
                            loading={busy}
                            onClick={handleDelete}
                        >
                            Confirmer la suppression
                        </Button>
                        <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => setConfirmDelete(false)}
                        >
                            Annuler
                        </Button>
                    </div>
                </Alert>
            ) : null}

            {mode === 'edit' ? (
                <div className="flex flex-col gap-5">
                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                        <Field
                            id="pf-name"
                            label="Nom du profil"
                            required
                            hint={system ? 'Nom d’un profil système : non modifiable.' : undefined}
                        >
                            <Input
                                id="pf-name"
                                disabled={system}
                                value={f.name}
                                onChange={(e) => set({ name: e.target.value })}
                            />
                        </Field>

                        <Field id="pf-kind" label="Type de profil">
                            <Segmented
                                label="Type de profil"
                                value={f.kind}
                                onChange={(v) => {
                                    if (creating) {
                                        set({
                                            kind: v,
                                            perms: v === 'externe' ? ['transporteur.espace'] : ['demandes.consulter'],
                                        });
                                    }
                                }}
                                options={[
                                    { value: 'interne', label: 'Interne (administration)', icon: 'shield-user' },
                                    { value: 'externe', label: 'Externe', icon: 'truck' },
                                ]}
                            />
                        </Field>
                    </div>

                    <Field id="pf-desc" label="Description" optional>
                        <Textarea
                            id="pf-desc"
                            rows={3}
                            value={f.description}
                            onChange={(e) => set({ description: e.target.value })}
                            placeholder="Décrivez les responsabilités et attributions de ce profil…"
                        />
                    </Field>

                    <section>
                        <p className="mb-2 text-sm font-semibold text-slate-800">Habilitations</p>
                        <PermMatrix
                            kind={f.kind}
                            value={f.perms}
                            onChange={(perms) => set({ perms })}
                        />
                    </section>
                </div>
            ) : (
                <div className="flex flex-col gap-6">
                    <div className="flex flex-wrap gap-1.5">
                        <Badge tone={p.kind === 'externe' ? 'neutral' : 'info'}>
                            {p.kind === 'externe' ? 'Profil externe' : 'Profil interne'}
                        </Badge>
                        {system ? <Badge icon="lock">Profil système</Badge> : null}
                        {locked ? <Badge tone="warn" icon="key-round">Non modifiable</Badge> : null}
                    </div>

                    {p.description ? (
                        <p className="text-sm text-slate-700">{p.description}</p>
                    ) : null}

                    <section>
                        <p className="mb-2 text-sm font-semibold text-slate-800">Habilitations</p>
                        <PermMatrix
                            kind={p.kind}
                            value={p.perms}
                            disabled
                        />
                    </section>

                    <section>
                        <p className="mb-2 text-sm font-semibold text-slate-800">
                            Utilisateurs affectés · {p.users_count || users.length}
                        </p>
                        {users.length === 0 ? (
                            <p className="text-sm text-slate-500">Aucun utilisateur n'a ce profil.</p>
                        ) : (
                            <div className="flex flex-wrap gap-1.5">
                                {users.slice(0, 16).map((u) => (
                                    <span
                                        key={u.id}
                                        className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white py-1 pl-1 pr-3 text-[13px] text-slate-700"
                                    >
                                        <Avatar name={u.name} size={22} /> {u.name}
                                    </span>
                                ))}
                                {p.users_count > 16 ? (
                                    <span className="self-center text-sm text-slate-500">
                                        + {p.users_count - 16} autre{p.users_count - 16 > 1 ? 's' : ''}
                                    </span>
                                ) : null}
                            </div>
                        )}
                    </section>
                </div>
            )}
        </Drawer>
    );
}

export default ProfileDrawer;

