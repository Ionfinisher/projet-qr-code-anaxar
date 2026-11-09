import { useState } from 'react';
import { router } from '@inertiajs/react';
import { Drawer, Button, Badge, Avatar, KeyValue, Alert } from '@/Components/ui';
import { fmtDateTime } from '@/Lib/domain';
import { UserFields } from './UserFields';
import { SecretField } from './SecretField';

export function UserDrawer({ u, canManage = true, onClose, profiles = [], initialTempPassword = null }) {
    const isInternal = u.kind === 'interne';
    const [mode, setMode] = useState('view');
    const [f, setF] = useState(() => ({
        prenom: u.prenom || '',
        nom: u.nom || '',
        email: u.email || '',
        telephone: u.phone || '',
        fonction: u.fonction || '',
        role_id: u.profileId || '',
    }));
    const [busy, setBusy] = useState(false);
    const [errors, setErrors] = useState({});
    const [confirmDelete, setConfirmDelete] = useState(false);
    const [confirmReset, setConfirmReset] = useState(false);
    const [tempPassword, setTempPassword] = useState(initialTempPassword);

    const set = (patch) => setF((prev) => ({ ...prev, ...patch }));

    const handleSave = () => {
        setBusy(true);
        setErrors({});

        router.put(route('admin.utilisateurs.update', u.id), f, {
            preserveScroll: true,
            onSuccess: () => {
                setBusy(false);
                setMode('view');
            },
            onError: (errs) => {
                setBusy(false);
                setErrors(errs);
            },
        });
    };

    const handleToggle = () => {
        setBusy(true);
        router.patch(route('admin.utilisateurs.toggle', u.id), {}, {
            preserveScroll: true,
            onSuccess: () => setBusy(false),
            onError: () => setBusy(false),
        });
    };

    const handleResetPassword = () => {
        setBusy(true);
        router.post(route('admin.utilisateurs.reset-password', u.id), {}, {
            preserveScroll: true,
            onSuccess: (page) => {
                setBusy(false);
                setConfirmReset(false);
                if (page.props.tempPassword) {
                    setTempPassword(page.props.tempPassword);
                }
            },
            onError: () => {
                setBusy(false);
                setConfirmReset(false);
            },
        });
    };

    const handleDelete = () => {
        setBusy(true);
        router.delete(route('admin.utilisateurs.destroy', u.id), {
            preserveScroll: true,
            onSuccess: () => {
                setBusy(false);
                onClose();
            },
            onError: (errs) => {
                setBusy(false);
                setConfirmDelete(false);
                setErrors(errs);
            },
        });
    };

    const footer = !canManage ? null : mode === 'edit' ? (
        <>
            <Button
                variant="ghost"
                onClick={() => {
                    setMode('view');
                    setErrors({});
                }}
            >
                Annuler
            </Button>
            <Button icon="check" loading={busy} onClick={handleSave}>
                Enregistrer
            </Button>
        </>
    ) : (
        <>
            <Button
                variant="danger-outline"
                icon="trash-2"
                disabled={busy}
                onClick={() => setConfirmDelete(true)}
            >
                Supprimer
            </Button>
            <Button
                variant="secondary"
                icon="key-round"
                disabled={busy}
                onClick={() => setConfirmReset(true)}
            >
                Mot de passe
            </Button>
            <Button
                variant="secondary"
                icon={u.active ? 'power' : 'check'}
                disabled={busy}
                onClick={handleToggle}
            >
                {u.active ? 'Désactiver' : 'Activer'}
            </Button>
            <Button
                icon="pencil"
                onClick={() => {
                    setErrors({});
                    setMode('edit');
                }}
            >
                Modifier
            </Button>
        </>
    );

    return (
        <Drawer
            open
            onClose={onClose}
            title={u.name}
            description={isInternal ? 'Compte de l’administration du port' : `Compte externe · ${u.acct || 'Transporteur'}`}
            size="lg"
            footer={footer}
        >
            <div className="flex items-center gap-3 border-b border-slate-100 pb-5">
                <Avatar name={u.name} size={48} />
                <div className="min-w-0">
                    <p className="truncate text-base font-semibold text-slate-900">{u.name}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5">
                        {u.active ? (
                            <Badge tone="ok" icon="check">Actif</Badge>
                        ) : (
                            <Badge icon="power">Désactivé</Badge>
                        )}
                        <Badge tone={isInternal ? 'info' : 'neutral'} icon={isInternal ? 'shield-user' : 'truck'}>
                            {u.profile}
                        </Badge>
                    </div>
                </div>
            </div>

            {Object.keys(errors).length > 0 ? (
                <Alert tone="bad" className="mt-4">
                    {Object.values(errors)[0]}
                </Alert>
            ) : null}

            {confirmDelete ? (
                <Alert tone="bad" title={`Supprimer l'utilisateur ${u.name} ?`} className="mt-4">
                    <p className="mb-3 text-sm">
                        Cette action est définitive. Les données historiques liées à cet utilisateur seront archivées.
                    </p>
                    <div className="flex gap-2">
                        <Button variant="danger" size="sm" loading={busy} onClick={handleDelete}>
                            Confirmer la suppression
                        </Button>
                        <Button variant="secondary" size="sm" onClick={() => setConfirmDelete(false)}>
                            Annuler
                        </Button>
                    </div>
                </Alert>
            ) : null}

            {confirmReset ? (
                <Alert tone="neutral" title={`Réinitialiser le mot de passe de ${u.name} ?`} className="mt-4">
                    <p className="mb-3 text-sm">
                        Un nouveau mot de passe provisoire sera généré et devra être remplacé à la prochaine connexion.
                    </p>
                    <div className="flex gap-2">
                        <Button variant="primary" size="sm" loading={busy} onClick={handleResetPassword}>
                            Générer le mot de passe
                        </Button>
                        <Button variant="secondary" size="sm" onClick={() => setConfirmReset(false)}>
                            Annuler
                        </Button>
                    </div>
                </Alert>
            ) : null}

            {tempPassword ? (
                <div className="mt-4">
                    <Alert tone="ok" title="Nouveau mot de passe provisoire généré">
                        Transmettez ce mot de passe de manière confidentielle.
                    </Alert>
                    <div className="mt-2">
                        <SecretField
                            id="reset-temp-pass"
                            label="Mot de passe provisoire"
                            value={tempPassword}
                        />
                    </div>
                </div>
            ) : null}

            <div className="mt-6">
                {mode === 'edit' ? (
                    <div className="flex flex-col gap-4">
                        {!isInternal ? (
                            <p className="text-xs text-slate-500">
                                Compte transporteur : l’identité légale provient du dossier d’inscription validé. Seuls
                                les contacts et le profil assigné sont modifiables.
                            </p>
                        ) : null}
                        <UserFields
                            f={f}
                            set={set}
                            e={errors}
                            profiles={profiles}
                            internal={isInternal}
                        />
                    </div>
                ) : (
                    <div className="flex flex-col gap-4">
                        <KeyValue
                            items={[
                                ['Type de compte', isInternal ? 'Administration (interne)' : `Externe (${u.acct || 'Transporteur'})`],
                                ['Profil / Habilitations', u.profile || 'Aucun'],
                                ['Adresse e-mail', u.email],
                                ['Numéro de téléphone', u.phone || 'Non renseigné'],
                                isInternal && u.fonction ? ['Fonction / Poste', u.fonction] : null,
                                ['Statut du compte', u.active ? 'Actif (peut se connecter)' : 'Désactivé'],
                                ['Créé le', fmtDateTime(u.createdAt)],
                                ['Dernière connexion', u.lastLoginAt ? fmtDateTime(u.lastLoginAt) : 'Jamais'],
                            ]}
                        />
                    </div>
                )}
            </div>
        </Drawer>
    );
}

export default UserDrawer;

