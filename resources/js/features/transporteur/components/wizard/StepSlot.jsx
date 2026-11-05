// Étape 1 : opération, terminal, transporteur mandaté (transitaire) ou transitaire, date et créneau, instructions.
import { OPS, TERMINALS } from '@/Lib/domain';
import { Field, Input, Textarea, RadioCards, Segmented, PhoneInput, Icon, fieldProps } from '../../../../Components/ui/index.js';
import { SlotPicker } from '../SlotPicker.jsx';
import { WizardSection } from './WizardParts.jsx';

export function StepSlot({ f, set, setM, user, now, e, exceptDemande }) {
  const m = f.mandated;
  return (
    <>
      <WizardSection icon="route" title="Opération">
        <RadioCards label="Type d’opération" columns={2} value={f.op} onChange={v => set({ op: v })}
          options={Object.entries(OPS).map(([k, o]) => ({ value: k, label: o.label, description: o.hint }))} />
        <RadioCards label="Terminal" columns={3} value={f.terminal} onChange={v => set({ terminal: v })}
          options={Object.entries(TERMINALS).map(([k, t]) => ({ value: k, label: t.label, description: 'Port de Lomé · TGLFW' }))} />
      </WizardSection>

      {user.acct === 'transit' ? (
        <WizardSection icon="truck" title="Transporteur mandaté">
          <Segmented label="Type de transporteur" value={m.type} onChange={v => setM({ type: v })}
            options={[{ value: 'entreprise', label: 'Entreprise', icon: 'building-2' }, { value: 'particulier', label: 'Particulier', icon: 'user' }]} />
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {m.type === 'entreprise' ? (
              <Field id="m-company" label="Raison sociale" required error={e.mCompany}>
                <Input {...fieldProps('m-company', e.mCompany)} value={m.company} onChange={ev => setM({ company: ev.target.value })} />
              </Field>
            ) : (
              <>
                <Field id="m-first" label="Prénom" required error={e.mName}><Input {...fieldProps('m-first', e.mName)} value={m.first} onChange={ev => setM({ first: ev.target.value })} /></Field>
                <Field id="m-last" label="Nom" required><Input {...fieldProps('m-last')} value={m.last} onChange={ev => setM({ last: ev.target.value })} /></Field>
              </>
            )}
            <Field id="m-phone" label="Téléphone" required error={e.mPhone}>
              <PhoneInput id="m-phone" cc={m.phoneCc} value={m.phone} onCc={v => setM({ phoneCc: v })} onChange={v => setM({ phone: v })} error={e.mPhone} />
            </Field>
          </div>
        </WizardSection>
      ) : user.acct !== 'particulier' && (
        <WizardSection icon="stamp" title="Transitaire">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field id="t-transit" label="Commissionnaire en douane / transitaire" optional>
              <Input {...fieldProps('t-transit')} value={f.transitaire} onChange={ev => set({ transitaire: ev.target.value })} placeholder="Ex. Atlantique Transit" />
            </Field>
          </div>
        </WizardSection>
      )}

      <WizardSection icon="calendar-clock" title="Date et créneau">
        <SlotPicker date={f.date} setDate={d => set({ date: d, start: null })} value={f.start} onPick={x => set({ date: x.date, start: x.start })}
          need={f.trucks.length} exceptDemande={exceptDemande} now={now} userId={user.id} />
        {e.slot
          ? <p id="slot-err" role="alert" className="flex items-start gap-1.5 text-sm text-rose-700"><Icon name="triangle-alert" size={15} className="mt-0.5" /> {e.slot}</p>
          : <p id="slot-help" className="text-sm text-slate-500">Places restantes en temps réel{f.trucks.length > 1 ? ` · ${f.trucks.length} places nécessaires` : ''}. Tolérance de 15 min à la guérite.</p>}
        <Field id="s-notes" label="Instructions particulières" optional hint="Conteneur frigorifique à brancher, hors gabarit, marchandises dangereuses (classe IMDG)…">
          <Textarea {...fieldProps('s-notes', null, 'x')} value={f.notes} onChange={ev => set({ notes: ev.target.value })} />
        </Field>
      </WizardSection>
    </>
  );
}
