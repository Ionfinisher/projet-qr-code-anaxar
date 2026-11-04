// Ajout de créneaux en série : période, jours, plage horaire, durée, capacité, avec aperçu avant création.
import { useEffect, useState } from 'react';
import { addDays, hhmm, fmtInt } from '../../../lib/domain.js';
import { notify } from '../../../lib/alerts.js';
import { usePortFlow } from '../../../providers/PortFlowProvider.jsx';
import { Drawer, Button, Field, Input, Select, Alert, fieldProps } from '../../../Components/ui/index.js';
import { useAdminApi } from '../api.js';
import { planSlots, plural } from '../selectors.js';
import { cn } from '../../../lib/cn.js';

const HOURS = Array.from({ length: 25 }, (_, h) => h);
const DAY_LABELS = [['1', 'Lun'], ['2', 'Mar'], ['3', 'Mer'], ['4', 'Jeu'], ['5', 'Ven'], ['6', 'Sam'], ['0', 'Dim']];
const init = last => ({ from: addDays(last, 1), to: addDays(last, 7), days: ['1', '2', '3', '4', '5', '6'], startH: '6', endH: '20', duration: '2', capacity: '40' });

export function AddSlotsDrawer({ open, last, onClose, onDone }) {
  const { data } = usePortFlow();
  const admin = useAdminApi();
  const [f, setF] = useState(() => init(last));
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (open) { setF(init(last)); setErr(''); } }, [open, last]);
  const set = p => setF(x => ({ ...x, ...p }));
  const p = { from: f.from, to: f.to, days: f.days.map(Number), startH: +f.startH, endH: +f.endH, duration: +f.duration, capacity: +f.capacity };
  const span = f.from && f.to ? Math.round((Date.parse(f.to) - Date.parse(f.from)) / 86400000) + 1 : 0;
  const problems = [
    !f.from || !f.to ? 'Indiquez les dates.' : f.to < f.from ? 'La date de fin doit suivre la date de début.' : span > 62 ? 'Deux mois au maximum par opération.' : null,
    !f.days.length ? 'Cochez au moins un jour.' : null,
    p.endH - p.startH < p.duration ? 'La plage horaire est plus courte que la durée d’un créneau.' : null,
    !(p.capacity >= 1 && p.capacity <= 500) ? 'Capacité entre 1 et 500 camions.' : null,
  ].filter(Boolean);
  const plan = problems.length ? { created: [], skipped: 0 } : planSlots(data, p);
  const toggleDay = d => set({ days: f.days.includes(d) ? f.days.filter(x => x !== d) : [...f.days, d] });
  const n = plan.created.length;

  const create = async () => {
    setBusy(true);
    try {
      const r = await admin.addSlots(p);
      if (!r.ok) { setErr(r.error); return; }
      notify(`${r.created} ${plural(r.created, 'créneau', 'créneaux')} ${plural(r.created, 'ajouté')}${r.skipped ? ` · ${r.skipped} déjà ${plural(r.skipped, 'existant')}` : ''}`, 'ok');
      onDone(f.from);
    } finally { setBusy(false); }
  };

  return (
    <Drawer open={open} onClose={onClose} title="Ajouter des créneaux" size="lg"
      footer={<><Button variant="ghost" onClick={onClose}>Annuler</Button><Button icon="calendar-plus" loading={busy} disabled={!!problems.length || !n} onClick={create}>{busy ? 'Création…' : `Créer ${n} ${plural(n, 'créneau', 'créneaux')}`}</Button></>}>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field id="as-from" label="Du" required><Input type="date" className="tabular-nums" {...fieldProps('as-from')} value={f.from} onChange={e => set({ from: e.target.value })} /></Field>
        <Field id="as-to" label="Au" required><Input type="date" className="tabular-nums" {...fieldProps('as-to')} value={f.to} onChange={e => set({ to: e.target.value })} /></Field>
      </div>
      <fieldset>
        <legend className="mb-2 text-sm font-medium text-slate-800">Jours d’ouverture</legend>
        <div className="flex flex-wrap gap-2">
          {DAY_LABELS.map(([v, l]) => {
            const on = f.days.includes(v);
            return (
              <label key={v} className={cn('inline-flex cursor-pointer select-none items-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium transition-colors',
                on ? 'border-brand-500 bg-brand-50 text-brand-800' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300')}>
                <input type="checkbox" checked={on} onChange={() => toggleDay(v)} className="h-4 w-4 accent-brand-600" /> {l}
              </label>
            );
          })}
        </div>
      </fieldset>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Field id="as-sh" label="Première heure"><Select className="tabular-nums" {...fieldProps('as-sh')} value={f.startH} onChange={e => set({ startH: e.target.value })}>{HOURS.slice(0, 24).map(h => <option key={h} value={h}>{hhmm(h)}</option>)}</Select></Field>
        <Field id="as-eh" label="Dernière heure"><Select className="tabular-nums" {...fieldProps('as-eh')} value={f.endH} onChange={e => set({ endH: e.target.value })}>{HOURS.slice(1).map(h => <option key={h} value={h}>{hhmm(h)}</option>)}</Select></Field>
        <Field id="as-du" label="Durée d’un créneau"><Select {...fieldProps('as-du')} value={f.duration} onChange={e => set({ duration: e.target.value })}>{[1, 2, 3, 4].map(h => <option key={h} value={h}>{h} h</option>)}</Select></Field>
        <Field id="as-cap" label="Capacité par créneau"><Input type="number" min="1" max="500" className="tabular-nums" {...fieldProps('as-cap')} value={f.capacity} onChange={e => set({ capacity: e.target.value })} /></Field>
      </div>
      {problems.length > 0 ? (
        <Alert tone="warn" role="status">{problems[0]}</Alert>
      ) : (
        <Alert tone={n ? 'info' : 'warn'} icon="calendar-plus" role="status" title={`${n} ${plural(n, 'créneau', 'créneaux')} à créer · ${fmtInt(n * p.capacity)} places`}>
          {plan.skipped ? `${plan.skipped} ${plural(plan.skipped, 'créneau', 'créneaux')} ${plural(plan.skipped, 'existant')} ou ${plural(plan.skipped, 'chevauchant')} ${plural(plan.skipped, 'ignoré')}.` : 'Aucun doublon avec le plan existant.'}
        </Alert>
      )}
      {err && <Alert tone="bad" role="alert">{err}</Alert>}
    </Drawer>
  );
}
