// Créneaux : grille de la semaine, modification d'un créneau, ajout en série.
import { useState } from 'react';
import { slotUsage, dayStr, addDays, fmtDayLong, fmtInt } from '../../../lib/domain.js';
import { usePortFlow, useCurrentUser } from '../../../providers/PortFlowProvider.jsx';
import { useNow } from '../../../hooks/useNow.js';
import { PageHeader, Button, IconButton, EmptyState } from '../../../components/ui/index.js';
import { RequirePerm } from '../components/Parts.jsx';
import { mondayOf } from '../selectors.js';
import { WeekGrid, weekLabel } from './WeekGrid.jsx';
import { SlotDrawer } from './SlotDrawer.jsx';
import { AddSlotsDrawer } from './AddSlotsDrawer.jsx';

function Creneaux() {
  const { data } = usePortFlow();
  const { can } = useCurrentUser();
  const canManage = can('creneaux.gerer');
  const now = useNow(60000);
  const today = dayStr(now);
  const [week, setWeek] = useState(() => mondayOf(today));
  const [openId, setOpenId] = useState(null);
  const [adding, setAdding] = useState(false);
  const days = Array.from({ length: 7 }, (_, i) => addDays(week, i));
  const weekSlots = data.slots.filter(x => x.date >= days[0] && x.date <= days[6]);
  const usages = new Map(weekSlots.map(x => [x.id, slotUsage(x, data.rdvs)]));
  const capW = weekSlots.filter(x => x.open).reduce((a, x) => a + x.capacity, 0);
  const usedW = weekSlots.filter(x => x.open).reduce((a, x) => a + usages.get(x.id).used, 0);
  const last = data.slots.reduce((m, x) => (x.date > m ? x.date : m), today);
  const sel = openId ? data.slots.find(x => x.id === openId) : null;
  const addButton = canManage && <Button icon="calendar-plus" onClick={() => setAdding(true)}>Ajouter des créneaux</Button>;

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="Créneaux" subtitle={`Porte principale · plan ouvert jusqu’au ${fmtDayLong(last + 'T12:00:00Z')}`} actions={addButton} className="mb-0" />
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-3 sm:flex-row sm:items-center sm:justify-between sm:p-4">
        <div className="flex flex-wrap items-center gap-1.5">
          <IconButton icon="chevron-left" label="Semaine précédente" onClick={() => setWeek(addDays(week, -7))} />
          <b className="px-1 text-sm font-semibold text-slate-900 sm:text-base">{weekLabel(days)}</b>
          <IconButton icon="chevron-right" label="Semaine suivante" onClick={() => setWeek(addDays(week, 7))} />
          {week !== mondayOf(today) && <Button variant="ghost" size="sm" onClick={() => setWeek(mondayOf(today))}>Cette semaine</Button>}
        </div>
        <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-slate-600">
          <span><b className="tabular-nums text-slate-900">{weekSlots.length}</b> créneaux</span>
          <span><b className="tabular-nums text-slate-900">{fmtInt(capW)}</b> places</span>
          <span><b className="tabular-nums text-slate-900">{capW ? Math.round((usedW / capW) * 100) : 0} %</b> réservées</span>
        </div>
      </div>
      {weekSlots.length === 0 ? (
        <EmptyState icon="calendar-x" title="Aucun créneau cette semaine" action={addButton}>Ajoutez des créneaux pour ouvrir les réservations aux transporteurs.</EmptyState>
      ) : (
        <WeekGrid days={days} slots={weekSlots} usages={usages} today={today} now={now} onOpen={setOpenId} />
      )}
      <SlotDrawer key={sel?.id || 'none'} slot={sel} canManage={canManage} onClose={() => setOpenId(null)} />
      <AddSlotsDrawer open={adding} last={last} onClose={() => setAdding(false)} onDone={from => { setAdding(false); setWeek(mondayOf(from)); }} />
    </div>
  );
}

export function CreneauxAdminPage() {
  return <RequirePerm perm="creneaux.consulter"><Creneaux /></RequirePerm>;
}
