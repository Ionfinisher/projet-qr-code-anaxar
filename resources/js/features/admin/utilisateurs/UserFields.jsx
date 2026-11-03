import { Field, Input, Select, PhoneInput, fieldProps } from '../../../components/ui/index.js';

/** Champs d'un utilisateur. internal : compte de l'administration (identité, fonction, profil). */
export function UserFields({ f, set, e, profiles, internal, actorIsSuper }) {
  const choices = profiles.filter(p => p.kind === 'interne' && (actorIsSuper || !p.perms.includes('*')));
  return (
    <>
      {internal && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field id="uf-first" label="Prénom" required error={e.first}><Input autoComplete="off" {...fieldProps('uf-first', e.first)} value={f.first} onChange={ev => set({ first: ev.target.value })} /></Field>
          <Field id="uf-last" label="Nom" required error={e.last}><Input autoComplete="off" {...fieldProps('uf-last', e.last)} value={f.last} onChange={ev => set({ last: ev.target.value })} /></Field>
        </div>
      )}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field id="uf-email" label="E-mail" required error={e.email} hint="Identifiant de connexion.">
          <Input type="email" autoComplete="off" {...fieldProps('uf-email', e.email, 'x')} value={f.email} onChange={ev => set({ email: ev.target.value })} />
        </Field>
        <Field id="uf-phone" label="Téléphone" optional={internal} required={!internal} error={e.phone}>
          <PhoneInput id="uf-phone" cc={f.phoneCc} value={f.phone} onCc={v => set({ phoneCc: v })} onChange={v => set({ phone: v })} error={e.phone} />
        </Field>
      </div>
      {internal && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field id="uf-title" label="Fonction" optional><Input {...fieldProps('uf-title')} value={f.title} onChange={ev => set({ title: ev.target.value })} /></Field>
          <Field id="uf-profile" label="Profil" required hint={profiles.find(p => p.id === f.profileId)?.description}>
            <Select {...fieldProps('uf-profile', null, 'x')} value={f.profileId} onChange={ev => set({ profileId: ev.target.value })}>
              {choices.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </Select>
          </Field>
        </div>
      )}
    </>
  );
}
