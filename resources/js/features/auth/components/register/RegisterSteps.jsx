                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    // Étapes de l'assistant d'inscription : identité, contact et accès, pièces, vérification.
import { ACCOUNT_KINDS, INS_DOCS, COUNTRIES, COUNTRY, formatPhone, toE164 } from '../../../../lib/domain.js';
import {
  Field, Input, Select, RadioCards, PhoneInput, PasswordInput, PasswordRules, Checkbox, KeyValue, Alert, Badge, Button, Icon, fieldProps,
} from '../../../../Components/ui/index.js';
import { DocumentUpload } from '../../../../Components/domain/index.js';
import { cn } from '../../../../lib/cn.js';

export function FormSection({ icon, title, children, className }) {
  return (
    <section className={cn('flex flex-col gap-4', className)}>
      <h3 className="flex items-center gap-2 text-base font-semibold text-slate-900"><Icon name={icon} size={18} className="text-slate-500" /> {title}</h3>
      {children}
    </section>
  );
}
const Grid = ({ cols = 3, children }) => <div className={cn('grid grid-cols-1 gap-4', cols === 3 ? 'md:grid-cols-3' : 'md:grid-cols-2')}>{children}</div>;

export function StepIdentity({ f, set, setRep, e, editing }) {
  return (
    <>
      <FormSection icon="user-check" title="Vous êtes">
        <RadioCards label="Type de compte" columns={3} value={f.kind} onChange={k => set({ kind: k })}
          options={Object.entries(ACCOUNT_KINDS).map(([k, a]) => ({ value: k, label: a.label, description: a.hint, icon: a.icon, disabled: !!editing && editing.kind !== k }))} />
      </FormSection>
      <FormSection icon={ACCOUNT_KINDS[f.kind].icon} title="Identité">
        {f.kind === 'particulier' ? (
          <Grid>
            <Field id="r-first" label="Prénom" required error={e.first}><Input autoComplete="given-name" {...fieldProps('r-first', e.first)} value={f.first} onChange={ev => set({ first: ev.target.value })} /></Field>
            <Field id="r-last" label="Nom" required error={e.last}><Input autoComplete="family-name" {...fieldProps('r-last', e.last)} value={f.last} onChange={ev => set({ last: ev.target.value })} /></Field>
            <Field id="r-idn" label="N° de pièce d’identité" required error={e.idNumber} hint="CNI ou passeport."><Input mono {...fieldProps('r-idn', e.idNumber, 'x')} value={f.idNumber} onChange={ev => set({ idNumber: ev.target.value.toUpperCase() })} /></Field>
          </Grid>
        ) : (
          <>
            <Grid>
              <Field id="r-company" label="Raison sociale" required error={e.company}><Input autoComplete="organization" {...fieldProps('r-company', e.company)} value={f.company} onChange={ev => set({ company: ev.target.value })} /></Field>
              <Field id="r-nif" label="NIF" required error={e.nif} hint="Numéro d’identification fiscale."><Input mono {...fieldProps('r-nif', e.nif, 'x')} value={f.nif} onChange={ev => set({ nif: ev.target.value.toUpperCase() })} /></Field>
              <Field id="r-rccm" label="N° RCCM" required error={e.rccm} hint="Ex. TG-LOM 2019 B 1234."><Input mono {...fieldProps('r-rccm', e.rccm, 'x')} value={f.rccm} onChange={ev => set({ rccm: ev.target.value.toUpperCase() })} /></Field>
            </Grid>
            <Field id="r-address" label="Adresse du siège" required error={e.address}><Input autoComplete="street-address" {...fieldProps('r-address', e.address)} value={f.address} onChange={ev => set({ address: ev.target.value })} /></Field>
            <p className="text-sm font-semibold text-slate-700">Représentant légal</p>
            <Grid>
              <Field id="r-rfirst" label="Prénom" required error={e.repFirst}><Input {...fieldProps('r-rfirst', e.repFirst)} value={f.rep.first} onChange={ev => setRep({ first: ev.target.value })} /></Field>
              <Field id="r-rlast" label="Nom" required error={e.repLast}><Input {...fieldProps('r-rlast', e.repLast)} value={f.rep.last} onChange={ev => setRep({ last: ev.target.value })} /></Field>
              <Field id="r-rrole" label="Fonction" required error={e.repRole}><Input autoComplete="organization-title" {...fieldProps('r-rrole', e.repRole)} value={f.rep.role} onChange={ev => setRep({ role: ev.target.value })} /></Field>
            </Grid>
          </>
        )}
        <Grid>
          <Field id="r-city" label="Ville" required error={e.city}><Input autoComplete="address-level2" {...fieldProps('r-city', e.city)} value={f.city} onChange={ev => set({ city: ev.target.value })} /></Field>
          <Field id="r-country" label="Pays" hint="ISO 3166-1.">
            <Select {...fieldProps('r-country', null, 'x')} value={f.country} onChange={ev => set({ country: ev.target.value })}>
              {COUNTRIES.map(c => <option key={c.code} value={c.code}>{c.code} · {c.name}</option>)}
            </Select>
          </Field>
          {f.kind !== 'transit' && (
            <Field id="r-fleet" label="Nombre de camions" optional error={e.fleet}><Input inputMode="numeric" className="tabular-nums" {...fieldProps('r-fleet', e.fleet)} value={f.fleet} onChange={ev => set({ fleet: ev.target.value.replace(/\D/g, '').slice(0, 4) })} /></Field>
          )}
        </Grid>
      </FormSection>
    </>
  );
}

export function StepContact({ f, set, e, editing }) {
  return (
    <>
      <FormSection icon="at-sign" title="Contact">
        <Grid cols={2}>
          <Field id="r-email" label={f.kind === 'particulier' ? 'E-mail' : 'E-mail de l’entreprise'} required={f.kind !== 'particulier'} optional={f.kind === 'particulier'} error={e.email} hint="Identifiant de connexion et réception des notifications.">
            <Input type="email" autoComplete="email" inputMode="email" {...fieldProps('r-email', e.email, 'x')} value={f.email} onChange={ev => set({ email: ev.target.value })} />
          </Field>
          <Field id="r-phone" label="Téléphone mobile" required error={e.phone} hint="Reçoit les SMS. Sert d’identifiant si aucun e-mail.">
            <PhoneInput id="r-phone" cc={f.phoneCc} value={f.phone} onCc={v => set({ phoneCc: v })} onChange={v => set({ phone: v })} error={e.phone} hint="x" autoComplete="tel" />
          </Field>
        </Grid>
      </FormSection>
      <FormSection icon="lock-keyhole" title={editing ? 'Nouveau mot de passe' : 'Mot de passe'}>
        {editing && <p className="text-sm text-slate-500">Laissez vide pour conserver le mot de passe choisi à l’inscription.</p>}
        <Grid cols={2}>
          <Field id="r-pwd" label="Mot de passe" required={!editing} optional={!!editing} error={e.password}>
            <PasswordInput id="r-pwd" value={f.password} onChange={v => set({ password: v })} autoComplete="new-password" error={e.password} />
          </Field>
          <Field id="r-pwd2" label="Confirmation" required={!editing} optional={!!editing} error={e.password2}>
            <PasswordInput id="r-pwd2" value={f.password2} onChange={v => set({ password2: v })} autoComplete="new-password" error={e.password2} />
          </Field>
        </Grid>
        <PasswordRules value={f.password} />
      </FormSection>
    </>
  );
}

export function StepDocuments({ f, set, e, demo, onSamples }) {
  const defs = INS_DOCS[f.kind];
  const done = defs.filter(d => f.docs[d.key]).length;
  return (
    <FormSection icon="file-check" title="Pièces justificatives">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex gap-1" aria-hidden="true">{defs.map(d => <i key={d.key} className={cn('block h-2 w-6 rounded-full', f.docs[d.key] ? 'bg-emerald-500' : 'bg-slate-200')} />)}</span>
          <span className="text-sm tabular-nums text-slate-600">{done}/{defs.length} pièces déposées</span>
        </div>
        {demo && <Button variant="ghost" size="sm" icon="sparkles" onClick={onSamples}>Compléter avec des fichiers d’exemple</Button>}
      </div>
      <p className="text-sm text-slate-500">PDF, JPG, PNG ou WebP · 10 Mo maximum. Chaque fichier est transmis de façon sécurisée et identifié par son empreinte SHA-256.</p>
      {e.docs && <Alert tone="bad" role="alert" title="Dossier incomplet">{e.docs}</Alert>}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {defs.map(d => (
          <DocumentUpload key={d.key} id={`ins-doc-${d.key}`} label={d.label} hint={d.hint} icon={d.icon} meta={f.docs[d.key]}
            onFile={meta => set(x => ({ docs: { ...x.docs, [d.key]: meta } }))}
            onRemove={() => set(x => { const docs = { ...x.docs }; delete docs[d.key]; return { docs }; })} />
        ))}
      </div>
    </FormSection>
  );
}

function ReviewCard({ icon, title, onEdit, children }) {
  return (
    <div className="rounded-2xl border border-slate-200 p-4">
      <header className="mb-3 flex items-center justify-between gap-3">
        <h4 className="flex items-center gap-2 text-sm font-semibold text-slate-900"><Icon name={icon} size={16} className="text-slate-500" /> {title}</h4>
        <Button size="sm" variant="ghost" icon="pencil" onClick={onEdit}>Modifier</Button>
      </header>
      {children}
    </div>
  );
}

export function StepReview({ f, set, e, editing, goTo, pwdAlgo, error }) {
  const defs = INS_DOCS[f.kind];
  const phone = formatPhone(toE164(f.phoneCc, f.phone));
  return (
    <div className="flex flex-col gap-4">
      <ReviewCard icon={ACCOUNT_KINDS[f.kind].icon} title={ACCOUNT_KINDS[f.kind].label} onEdit={() => goTo(0)}>
        <KeyValue dense items={f.kind === 'particulier'
          ? [['Nom', `${f.first} ${f.last.toUpperCase()}`], ['Pièce d’identité', f.idNumber], ['Ville', `${f.city} · ${COUNTRY[f.country].name}`]]
          : [['Raison sociale', f.company], ['NIF', f.nif], ['RCCM', f.rccm], ['Adresse', `${f.address}, ${f.city} · ${COUNTRY[f.country].name}`], ['Représentant', `${f.rep.first} ${f.rep.last.toUpperCase()} · ${f.rep.role}`]]} />
      </ReviewCard>
      <ReviewCard icon="at-sign" title="Contact et accès" onEdit={() => goTo(1)}>
        <KeyValue dense items={[f.email ? ['E-mail', f.email] : null, ['Téléphone', phone], ['Identifiant', f.email || phone],
          ['Mot de passe', editing && !f.password ? 'Inchangé' : `Défini · haché sur le serveur (${pwdAlgo || 'Argon2id'})`]]} />
      </ReviewCard>
      <ReviewCard icon="file-check" title={`Pièces · ${defs.filter(d => f.docs[d.key]).length}/${defs.length}`} onEdit={() => goTo(2)}>
        <div className="flex flex-wrap gap-1.5">{defs.map(d => <Badge key={d.key} tone={f.docs[d.key] ? 'ok' : 'warn'} icon={f.docs[d.key] ? 'check' : 'triangle-alert'}>{d.label}</Badge>)}</div>
      </ReviewCard>
      <div className="flex flex-col gap-3 rounded-2xl bg-slate-50 p-4">
        <Checkbox id="r-cgu" checked={f.cgu} onChange={v => set({ cgu: v })} label="J’accepte les conditions d’utilisation de la plateforme PortFlow." />
        {e.cgu && <p className="flex items-center gap-1.5 text-sm text-rose-700"><Icon name="triangle-alert" size={15} /> {e.cgu}</p>}
        <Checkbox id="r-rgpd" checked={f.rgpd} onChange={v => set({ rgpd: v })} label="J’accepte le traitement de mes données pour l’examen de ma demande et la gestion de mon compte."
          description="Loi n° 2019-014 du 29 octobre 2019 relative à la protection des données à caractère personnel." />
        {e.rgpd && <p className="flex items-center gap-1.5 text-sm text-rose-700"><Icon name="triangle-alert" size={15} /> {e.rgpd}</p>}
      </div>
      {error && <Alert tone="bad" role="alert">{error}</Alert>}
    </div>
  );
}
