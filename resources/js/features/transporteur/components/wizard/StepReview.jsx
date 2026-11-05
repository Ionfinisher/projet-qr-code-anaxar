// Étape 4 : récapitulatif (demandeur, créneau, camions, documents) et déclaration sur l'honneur.
import { DOCS, OPS, TERMINALS, ACCOUNT_KINDS, slotRange, fmtDayLong, formatPhone, parseContainer, parseBL, accountName } from '@/Lib/domain';
import { Badge, Button, Checkbox, KeyValue, Icon } from '../../../../Components/ui/index.js';
import { ContainerNumber, Plate } from '../../../../Components/domain/index.js';
import { cap } from '../../selectors.js';
import { TruckNo } from './WizardParts.jsx';

function ReviewCard({ icon, title, onEdit, children }) {
  return (
    <div className="rounded-2xl border border-slate-200 p-4">
      <header className="mb-3 flex items-center justify-between gap-3">
        <h4 className="flex items-center gap-2 text-sm font-semibold text-slate-900"><Icon name={icon} size={16} className="text-slate-500" /> {title}</h4>
        {onEdit && <Button size="sm" variant="ghost" icon="pencil" onClick={onEdit}>Modifier</Button>}
      </header>
      {children}
    </div>
  );
}

export function StepReview({ f, goTo, set, e, user, slot }) {
  const m = f.mandated;
  return (
    <div className="flex flex-col gap-4">
      <ReviewCard icon="building-2" title="Demandeur">
        <KeyValue dense items={[
          ['Compte', `${accountName(user)} · ${ACCOUNT_KINDS[user.acct]?.short}`],
          user.acct === 'transit' && ['Transporteur mandaté', m.type === 'entreprise' ? m.company : `${m.first} ${m.last.toUpperCase()}`],
          user.acct !== 'transit' && f.transitaire && ['Transitaire', f.transitaire],
          ['Notifications', [user.email, formatPhone(user.phone)].filter(Boolean).join(' · ')],
        ]} />
      </ReviewCard>
      <ReviewCard icon="calendar-clock" title="Opération et créneau" onEdit={() => goTo(0)}>
        <KeyValue dense items={[
          ['Opération', OPS[f.op].label],
          ['Terminal', TERMINALS[f.terminal].label],
          slot && ['Créneau', `${cap(fmtDayLong(slotRange(slot).start))} · ${slot.start}–${slot.end}`],
          f.notes && ['Instructions', f.notes],
        ]} />
      </ReviewCard>
      <ReviewCard icon="container" title={f.trucks.length > 1 ? `${f.trucks.length} camions` : 'Camion et conteneur'} onEdit={() => goTo(1)}>
        <ul className="flex flex-col divide-y divide-slate-100">
          {f.trucks.map((k, i) => (
            <li key={k.k} className="flex flex-wrap items-center gap-x-3 gap-y-1.5 py-2.5 first:pt-0 last:pb-0 text-sm">
              {f.trucks.length > 1 && <TruckNo n={i + 1} />}
              <ContainerNumber value={parseContainer(k.container).raw} size="sm" placeholder="Vide à attribuer" />
              <span className="rounded-[4px] bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] text-slate-600">{k.iso}</span>
              <Plate country={k.country} value={k.tractor} size="sm" />
              <span className="text-slate-800">{k.first} {k.last.toUpperCase()}</span>
              <span className="font-mono text-[12.5px] text-slate-500">Permis {k.license.trim().toUpperCase()}</span>
              {k.bl && <span className="font-mono text-[12.5px] text-slate-500">{parseBL(k.bl).raw}</span>}
            </li>
          ))}
        </ul>
      </ReviewCard>
      <ReviewCard icon="file-check" title="Documents · 6/6" onEdit={() => goTo(2)}>
        <div className="flex flex-wrap gap-1.5">{DOCS.map(d => <Badge key={d.key} tone="ok" icon="check">{d.label}</Badge>)}</div>
      </ReviewCard>
      <div className="flex flex-col gap-2 rounded-2xl bg-slate-50 p-4">
        <Checkbox id="certify" checked={f.certify} onChange={v => set({ certify: v })}
          label="Je certifie l’exactitude des informations et l’authenticité des documents déposés."
          description="La demande est examinée par l’administration du port. Les QR codes, signés (JWS ES256), ne sont émis qu’après validation." />
        {e.certify && <p id="certify-msg" className="flex items-center gap-1.5 text-sm text-rose-700"><Icon name="triangle-alert" size={15} /> {e.certify}</p>}
      </div>
    </div>
  );
}
