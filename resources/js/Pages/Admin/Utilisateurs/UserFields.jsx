import { Field, Input, Select } from '@/Components/ui';

/** Champs d'un utilisateur. internal : compte de l'administration (identité, fonction, profil). */
export function UserFields({ f, set, e = {}, profiles = [], internal = true }) {
    const internalProfiles = profiles.filter((p) => p.kind === 'interne');
    const availableProfiles = internal ? internalProfiles : profiles;

    return (
        <div className="flex flex-col gap-4">
            {internal ? (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Field id="uf-prenom" label="Prénom" required error={e.prenom}>
                        <Input
                            id="uf-prenom"
                            autoComplete="off"
                            value={f.prenom || ''}
                            onChange={(ev) => set({ prenom: ev.target.value })}
                        />
                    </Field>
                    <Field id="uf-nom" label="Nom" required error={e.nom}>
                        <Input
                            id="uf-nom"
                            autoComplete="off"
                            value={f.nom || ''}
                            onChange={(ev) => set({ nom: ev.target.value })}
                        />
                    </Field>
                </div>
            ) : null}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field id="uf-email" label="Adresse e-mail" required error={e.email} hint="Identifiant de connexion">
                    <Input
                        id="uf-email"
                        type="email"
                        autoComplete="off"
                        value={f.email || ''}
                        onChange={(ev) => set({ email: ev.target.value })}
                    />
                </Field>
                <Field id="uf-phone" label="Téléphone" error={e.telephone} optional={internal}>
                    <Input
                        id="uf-phone"
                        type="tel"
                        placeholder="+228 90 00 00 00"
                        value={f.telephone || ''}
                        onChange={(ev) => set({ telephone: ev.target.value })}
                    />
                </Field>
            </div>

            {internal ? (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Field id="uf-fonction" label="Fonction / Titre" optional error={e.fonction}>
                        <Input
                            id="uf-fonction"
                            placeholder="ex. Chef de bureau, Agent de guérite…"
                            value={f.fonction || ''}
                            onChange={(ev) => set({ fonction: ev.target.value })}
                        />
                    </Field>
                    <Field
                        id="uf-role"
                        label="Profil"
                        required
                        error={e.role_id}
                        hint={profiles.find((p) => String(p.id) === String(f.role_id))?.description}
                    >
                        <Select
                            id="uf-role"
                            value={f.role_id || ''}
                            onChange={(ev) => set({ role_id: ev.target.value })}
                        >
                            <option value="">Sélectionner un profil…</option>
                            {availableProfiles.map((p) => (
                                <option key={p.id} value={p.id}>
                                    {p.name}
                                </option>
                            ))}
                        </Select>
                    </Field>
                </div>
            ) : (
                <Field
                    id="uf-role"
                    label="Profil affecté"
                    error={e.role_id}
                    hint={profiles.find((p) => String(p.id) === String(f.role_id))?.description}
                >
                    <Select
                        id="uf-role"
                        value={f.role_id || ''}
                        onChange={(ev) => set({ role_id: ev.target.value })}
                    >
                        <option value="">Sélectionner un profil…</option>
                        {availableProfiles.map((p) => (
                            <option key={p.id} value={p.id}>
                                {p.name}
                            </option>
                        ))}
                    </Select>
                </Field>
            )}
        </div>
    );
}

export default UserFields;

