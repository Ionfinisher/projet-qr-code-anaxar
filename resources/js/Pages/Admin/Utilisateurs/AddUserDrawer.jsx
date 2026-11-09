import { useEffect, useState } from 'react';
import { router } from '@inertiajs/react';
import { Drawer, Button, Alert } from '@/Components/ui';
import { UserFields } from './UserFields';
import { SecretField } from './SecretField';

function generatePassword() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%&*';
    let result = '';
    for (let i = 0; i < 12; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

export function AddUserDrawer({ open, onClose, profiles = [] }) {
    const defaultProfile = profiles.find((p) => p.name === 'bureau')?.id || profiles[0]?.id || '';

    const [f, setF] = useState({
        prenom: '',
        nom: '',
        email: '',
        telephone: '',
        fonction: '',
        role_id: defaultProfile,
    });
    const [temp, setTemp] = useState('');
    const [busy, setBusy] = useState(false);
    const [errors, setErrors] = useState({});
    const [createdResult, setCreatedResult] = useState(null);

    useEffect(() => {
        if (open) {
            setF({
                prenom: '',
                nom: '',
                email: '',
                telephone: '',
                fonction: '',
                role_id: defaultProfile,
            });
            setTemp(generatePassword());
            setErrors({});
            setCreatedResult(null);
        }
    }, [open, defaultProfile]);

    const set = (patch) => setF((prev) => ({ ...prev, ...patch }));

    const handleCreate = (e) => {
        if (e) e.preventDefault();
        setBusy(true);
        setErrors({});

        router.post(
            route('admin.utilisateurs.store'),
            {
                ...f,
                temp_password: temp,
            },
            {
                preserveScroll: true,
                onSuccess: (page) => {
                    setBusy(false);
                    const generatedTemp = page.props.tempPassword || temp;
                    setCreatedResult({
                        name: `${f.prenom} ${f.nom}`.trim(),
                        email: f.email,
                        tempPassword: generatedTemp,
                    });
                },
                onError: (errs) => {
                    setBusy(false);
                    setErrors(errs);
                },
            }
        );
    };

    const footer = createdResult ? (
        <Button onClick={onClose}>Terminer</Button>
    ) : (
        <>
            <Button variant="ghost" onClick={onClose} disabled={busy}>
                Annuler
            </Button>
            <Button icon="user-plus" loading={busy} onClick={handleCreate}>
                Créer le compte
            </Button>
        </>
    );

    return (
        <Drawer
            open={open}
            onClose={onClose}
            title={createdResult ? 'Compte créé' : 'Ajouter un utilisateur'}
            size="lg"
            footer={footer}
        >
            {createdResult ? (
                <div className="flex flex-col gap-5">
                    <Alert tone="ok" title={`Compte créé pour ${createdResult.name}`}>
                        Le compte administrateur/interne a été créé pour <strong>{createdResult.email}</strong>. Transmettez
                        ce mot de passe provisoire par un canal sécurisé. L'utilisateur devra obligatoirement le modifier à
                        sa première connexion.
                    </Alert>

                    <SecretField
                        id="temp-created-done"
                        label="Mot de passe provisoire"
                        hint="Affiché une seule fois · copier maintenant"
                        value={createdResult.tempPassword}
                    />
                </div>
            ) : (
                <form onSubmit={handleCreate} className="flex flex-col gap-5" noValidate>
                    <p className="text-sm text-slate-500">
                        Création d'un compte interne de l'administration du port (Bureau des rendez-vous, agents de
                        guérite, superviseurs). Les comptes transporteurs sont créés via les demandes d'inscription.
                    </p>

                    {Object.keys(errors).length > 0 ? (
                        <Alert tone="bad">
                            {Object.values(errors)[0] || 'Veuillez corriger les erreurs ci-dessous.'}
                        </Alert>
                    ) : null}

                    <UserFields
                        f={f}
                        set={set}
                        e={errors}
                        profiles={profiles}
                        internal={true}
                    />

                    <SecretField
                        id="uf-temp-new"
                        label="Mot de passe provisoire"
                        hint="Généré automatiquement · haché sur le serveur · à changer à la première connexion."
                        value={temp}
                        action={(
                            <Button
                                type="button"
                                variant="secondary"
                                icon="refresh-cw"
                                onClick={() => setTemp(generatePassword())}
                            >
                                Régénérer
                            </Button>
                        )}
                    />
                </form>
            )}
        </Drawer>
    );
}

export default AddUserDrawer;

