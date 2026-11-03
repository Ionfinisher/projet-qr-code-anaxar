import { useState } from 'react';
import { dayStr, fmtDayLong } from '../../../lib/domain.js';
import { useNav } from '../../../lib/navigation.jsx';
import { usePortFlow, useCurrentUser } from '../../../providers/PortFlowProvider.jsx';
import { useNow } from '../../../hooks/useNow.js';
import { PageHeader, Card, Button } from '../../../components/ui/index.js';
import { SlotPicker, SlotLegend } from '../components/SlotPicker.jsx';
import { slotUsageFor, cap } from '../selectors.js';

/** Créneaux disponibles de la porte principale, places restantes en temps réel (/transporteur/creneaux). */
export function CreneauxPage() {
  const { data } = usePortFlow();
  const { user } = useCurrentUser();
  const nav = useNav();
  const now = useNow(30000);
  const [date, setDate] = useState(dayStr(now));
  const [sel, setSel] = useState(null);
  const cur = sel && data.slots.find(x => x.id === sel.id);
  const u = cur ? slotUsageFor(cur, data.rdvs) : null;
  return (
    <>
      <PageHeader title="Créneaux disponibles" subtitle="Porte principale · créneaux ouverts par l’administration du port · places restantes en temps réel"
        actions={<SlotLegend />} />
      <Card>
        <SlotPicker date={date} setDate={d => { setDate(d); setSel(null); }} value={sel?.start} onPick={setSel} now={now} userId={user.id} />
      </Card>
      {cur && (
        <div role="region" aria-label="Créneau choisi"
          className="sticky bottom-20 z-30 mt-4 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-[0_12px_32px_rgba(15,23,42,0.14)] backdrop-blur-[6px] sm:flex-row sm:items-center sm:justify-between md:bottom-4">
          <span className="min-w-0">
            <b className="block text-[15px] text-slate-900">{cap(fmtDayLong(cur.date + 'T12:00:00Z'))} · {cur.start}–{cur.end}</b>
            <small className="text-sm text-slate-500">{u.remaining} place{u.remaining > 1 ? 's' : ''} restante{u.remaining > 1 ? 's' : ''} sur {cur.capacity}</small>
          </span>
          <Button iconRight="arrow-right" onClick={() => nav.go('transporteur.demandes.new', undefined, { query: { date: cur.date, start: cur.start } })}>Demander ce créneau</Button>
        </div>
      )}
    </>
  );
}
