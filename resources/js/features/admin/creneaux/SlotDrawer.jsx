// Détail et modification d'un créneau : capacité, ouverture / fermeture motivée, horaires.
import { useState } from 'react';
import { DEM_STATUS, slotUsage, hhmm, fmtDayLong, fmtDateTime, accountName } from '../../../lib/domain.js';
import { notify } from '../../../lib/alerts.js';
import { usePortFlow } from '../../../providers/PortFlowProvider.jsx';
import { Drawer, Button, Field, Input, Select, Segmented, Meter, KeyValue, Alert, Icon, fieldProps } from '../../../Components/ui/index.js';
import { StatusTag } from '../../../Components/domain/index.js';
import { useAdminApi } from '../api.js';
import { cap, ownerOf, plural } from '../selectors.js';

const HOURS = Array.from({ length: 25 }, (_, h) => h);

function Stat({ value, label }) {
  return (
    <span className="flex flex-col rounded-xl bg-slate-50 px-3 py-2.5">
      <b className="text-xl font-bold tabular-nums text-slate-900">{value}</b>
      <small className="text-xs text-slate-500">{label}</small>
    </span>
  );
}

export function SlotDrawer({ slot, canManage, onClose }) {
  const { data } = usePortFlow();
  const admin = useAdminApi();
  const [capacity, setCapacity] = useState(String(slot?.capacity ?? ''));
  const [isOpen, setIsOpen] = useState(!!slot?.open);
  const [reason, setReason] = useState(slot?.closeReason || '');
  const [start, setStart] = useState(slot?.start || '');
  const [end, setEnd] = useState(slot?.end || '');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  if (!slot) return null;
  const u = slotUsage(slot, data.rdvs);
  const own = u.pending + u.approved;
  const dems = data.demandes.filter(d => d.slotId === slot.id && ['en_attente', 'validee'].includes(d.status));

  const save = async () => {
    setBusy(true);
    try {
      const r = await admin.updateSlot(slot.id, { capacity: Number(capacity), open: isOpen, closeReason: reason, start, end });
      if (!r.ok) { setErr(r.error); return; }
      notify('Créneau modifié', 'ok');
      onClose();
    } finally { setBusy(false); }
  };

  return (
    <Drawer open onClose={onClose} title={`Créneau · ${cap(fmtDayLong(slot.date + 'T12:00:00Z'))}, ${slot.start}–${slot.end}`}
      footer={canManage ? <><Button variant="ghost" onClick={onClose}>Fermer</Button><Button icon="check" loading={busy} onClick={save}>{busy ? 'Enregistrement…' : 'Enregistrer'}</Button></> : null}>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat value={u.approved} label="validées" />
        <Stat value={u.pending} label="en attente" />
        <Stat value={u.other} label="autres transporteurs" />
        <Stat value={u.remaining} label="places restantes" />
      </div>
      <Meter rate={u.rate} closed={!slot.open} segments={20} label={`${u.used} sur ${slot.capacity} places`} />
      {canManage ? (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field id="sl-cap" label="Capacité (camions)" required hint={`Au moins ${u.used} : réservations existantes.`}>
              <Input type="number" min={Math.max(1, u.used)} max={500} className="tabular-nums" {...fieldProps('sl-cap', null, 'x')} value={capacity} onChange={e => setCapacity(e.target.value)} />
            </Field>
            <Field id="sl-status" label="Statut">
              <Segmented label="Statut du créneau" value={isOpen ? 'open' : 'closed'} onChange={v => setIsOpen(v === 'open')}
                options={[{ value: 'open', label: 'Ouvert', icon: 'lock-open' }, { value: 'closed', label: 'Fermé', icon: 'lock' }]} />
            </Field>
          </div>
          {!isOpen && (
            <Field id="sl-reason" label="Motif de fermeture" required hint={own ? `Les ${own} camions déjà réservés restent attendus.` : 'Affiché aux transporteurs.'}>
              <Input {...fieldProps('sl-reason', null, 'x')} value={reason} onChange={e => setReason(e.target.value)} placeholder="Ex. Maintenance du portique" />
            </Field>
          )}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field id="sl-start" label="Début" hint={own ? 'Horaire figé : des camions sont réservés.' : undefined}>
              <Select disabled={own > 0} className="tabular-nums" {...fieldProps('sl-start', null, own ? 'x' : null)} value={start} onChange={e => setStart(e.target.value)}>
                {HOURS.slice(0, 24).map(h => <option key={h} value={hhmm(h)}>{hhmm(h)}</option>)}
              </Select>
            </Field>
            <Field id="sl-end" label="Fin">
              <Select disabled={own > 0} className="tabular-nums" {...fieldProps('sl-end')} value={end} onChange={e => setEnd(e.target.value)}>
                {HOURS.slice(1).map(h => <option key={h} value={hhmm(h)}>{hhmm(h)}</option>)}
              </Select>
            </Field>
          </div>
          {err && <Alert tone="bad" role="alert">{err}</Alert>}
        </>
      ) : (
        <KeyValue items={[['Capacité', `${slot.capacity} camions`], ['Statut', slot.open ? 'Ouvert' : `Fermé · ${slot.closeReason}`]]} />
      )}
      {dems.length > 0 && (
        <section>
          <p className="mb-2 text-sm font-semibold text-slate-800">Demandes sur ce créneau</p>
          <ul className="flex flex-col divide-y divide-slate-100 rounded-2xl border border-slate-200">
            {dems.map(d => (
              <li key={d.id} className="flex items-center gap-3 px-3.5 py-2.5">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600"><Icon name="truck" size={18} /></span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-slate-900">{accountName(ownerOf(data, d.ownerId))}</span>
                  <span className="block text-[13px] text-slate-500"><span className="font-mono">{d.id}</span> · {d.rdvIds.length} {plural(d.rdvIds.length, 'camion')}</span>
                </span>
                <StatusTag map={DEM_STATUS} status={d.status} short />
              </li>
            ))}
          </ul>
        </section>
      )}
      <p className="text-xs text-slate-500">Créé le {fmtDateTime(slot.createdAt)} · modifié le {fmtDateTime(slot.updatedAt)}</p>
    </Drawer>
  );
}
