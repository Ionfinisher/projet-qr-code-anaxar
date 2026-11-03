// Nouvelle demande (/transporteur/demandes/nouvelle?date=&start=) et modification (/transporteur/demandes/:id/modifier).
import { useState } from 'react';
import { useNav } from '../../../lib/navigation.jsx';
import { useNow } from '../../../hooks/useNow.js';
import { DemandeWizard } from '../components/wizard/DemandeWizard.jsx';
import { DemandeSent } from '../components/DemandeDetail.jsx';

/** Créneau présélectionné depuis l'adresse (page Créneaux, nouvelle demande après un rejet). */
function slotFromQuery(query) {
  const date = query.get('date');
  const start = query.get('start');
  return date && start && /^\d{4}-\d{2}-\d{2}$/.test(date) && /^\d{2}:\d{2}$/.test(start) ? { date, start } : null;
}

export function NouvelleDemandePage() {
  const nav = useNav();
  const now = useNow(30000);
  const [res, setRes] = useState(null);
  const [round, setRound] = useState(0);
  const initialSlot = slotFromQuery(nav.query);
  if (res) {
    return <DemandeSent res={res} onNew={() => { setRes(null); setRound(n => n + 1); nav.go('transporteur.demandes.new', undefined, { replace: true }); }} />;
  }
  return (
    <DemandeWizard key={`${round}-${initialSlot?.date || ''}-${initialSlot?.start || ''}`} now={now} initialSlot={initialSlot}
      onCancel={() => nav.go('transporteur.demandes')} onDone={r => { setRes(r); window.scrollTo({ top: 0 }); }} />
  );
}

export function ModifierDemandePage() {
  const nav = useNav();
  const now = useNow(30000);
  const id = nav.params.id;
  const [res, setRes] = useState(null);
  if (res) return <DemandeSent res={res} onNew={() => nav.go('transporteur.demandes.new')} />;
  return (
    <DemandeWizard key={id} now={now} editId={id}
      onCancel={() => nav.go('transporteur.demandes.detail', { id })} onDone={r => { setRes(r); window.scrollTo({ top: 0 }); }} />
  );
}
