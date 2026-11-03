// Assistant « Faire / modifier une demande de rendez-vous » : mode, créneau, camions, documents, vérification.
import { useRef, useState } from 'react';
import { notify } from '../../../../lib/alerts.js';
import { usePortFlow, useCurrentUser } from '../../../../providers/PortFlowProvider.jsx';
import { Alert, Button, EmptyState, Icon } from '../../../../components/ui/index.js';
import { cn } from '../../../../lib/cn.js';
import { useTransporteurApi } from '../../api.js';
import { canModifyDemande } from '../../selectors.js';
import { STEP_DEFS, initialForm, formFromDemande, newTruck, wizardErrors, stepValid, demandePayload } from '../../demandeForm.js';
import { ModePick } from './ModePick.jsx';
import { StepSlot } from './StepSlot.jsx';
import { StepTrucks } from './StepTrucks.jsx';
import { StepDocs } from './StepDocs.jsx';
import { StepReview } from './StepReview.jsx';

/**
 * editId : demande modifiée (sinon nouvelle demande) ; initialSlot : { date, start } présélectionné ;
 * onCancel() ; onDone(résultat { demande, msgs }).
 */
export function DemandeWizard({ now, editId = null, initialSlot = null, onCancel, onDone }) {
  const { data } = usePortFlow();
  const { user } = useCurrentUser();
  const tapi = useTransporteurApi();
  const editing = editId ? data.demandes.find(d => d.id === editId) : null;
  const [f, setF] = useState(() => (editing ? formFromDemande(data, editing) : initialForm(user, now, initialSlot)));
  const [step, setStep] = useState(0);
  const [tried, setTried] = useState({});
  const [err, setErr] = useState('');
  const [sending, setSending] = useState(false);
  const panel = useRef(null);
  const set = p => setF(x => ({ ...x, ...(typeof p === 'function' ? p(x) : p) }));
  const setM = patch => setF(x => ({ ...x, mandated: { ...x.mandated, ...patch } }));
  const setTruck = (k, patch) => setF(x => ({ ...x, trucks: x.trucks.map(t => (t.k === k ? { ...t, ...patch } : t)) }));
  const errors = wizardErrors(data, f, user, now, editId);
  const valid = i => stepValid(errors, i);
  const firstInvalid = [0, 1, 2, 3].find(i => !valid(i));
  const steps = STEP_DEFS(f.mode);

  if (editId && (!editing || !canModifyDemande(data, editing, now))) {
    return (
      <EmptyState icon="lock" title="Cette demande ne peut plus être modifiée" action={<Button onClick={onCancel}>Retour aux demandes</Button>}>
        Elle a été traitée, annulée, ou son créneau est trop proche.
      </EmptyState>
    );
  }

  const goTo = i => {
    setStep(i);
    setTimeout(() => panel.current?.querySelector('h2')?.focus(), 20);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const next = () => {
    if (!valid(step)) {
      setTried(t => ({ ...t, [step]: true }));
      setTimeout(() => {
        const el = panel.current?.querySelector('[aria-invalid="true"]') || panel.current?.querySelector('[role="alert"]');
        el?.focus?.();
        el?.scrollIntoView?.({ block: 'center', behavior: 'smooth' });
      }, 30);
      return;
    }
    goTo(step + 1);
  };
  const submit = async () => {
    if (sending) return;
    if (firstInvalid !== undefined) { setTried(t => ({ ...t, [firstInvalid]: true })); goTo(firstInvalid); return; }
    setSending(true);
    let r;
    try {
      r = editing ? await tapi.modifyDemande(editing.id, demandePayload(f)) : await tapi.submitDemande(demandePayload(f));
    } finally { setSending(false); }
    if (!r.ok) { setErr(r.error); notify(r.error, 'bad'); if (/créneau/i.test(r.error)) goTo(0); return; }
    notify(editing ? `Demande ${r.demande.id} modifiée` : `Demande ${r.demande.id} envoyée`, 'ok');
    onDone(r);
  };

  if (!f.mode) {
    return <ModePick initialSlot={initialSlot} onCancel={onCancel}
      onPick={mode => set(x => ({ mode, trucks: mode === 'lot' ? [newTruck(null), newTruck(null)] : x.trucks.slice(0, 1) }))} />;
  }

  const show = !!tried[step];
  return (
    <div className="grid gap-6 lg:grid-cols-[250px_minmax(0,1fr)] lg:gap-8">
      <aside>
        <div className="hidden lg:sticky lg:top-24 lg:block">
          <p className="mb-3 px-2 text-xs font-semibold uppercase tracking-[0.08em] text-brand-700">
            {editing ? `Modification · ${editing.id}` : f.mode === 'lot' ? `Plusieurs camions · ${f.trucks.length}` : 'Un camion'}
          </p>
          <ol className="flex flex-col gap-1">
            {steps.map((x, i) => {
              const reachable = i <= step || firstInvalid === undefined || i <= firstInvalid;
              const ok = i < step && valid(i);
              return (
                <li key={x.key}>
                  <button type="button" disabled={!reachable} aria-current={i === step ? 'step' : undefined} onClick={() => reachable && goTo(i)}
                    className={cn('flex w-full cursor-pointer items-start gap-3 rounded-xl px-2 py-2.5 text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 disabled:cursor-not-allowed disabled:opacity-50',
                      i === step ? 'bg-white shadow-[0_1px_2px_rgba(15,23,42,0.08)] ring-1 ring-slate-200' : 'hover:bg-white/70')}>
                    <span className={cn('flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold', ok ? 'bg-emerald-600 text-white' : i === step ? 'bg-brand-600 text-white' : 'bg-slate-200 text-slate-600')}>
                      {ok ? <Icon name="check" size={15} strokeWidth={3} /> : i + 1}
                    </span>
                    <span><span className="block text-sm font-semibold text-slate-900">{x.label}</span><span className="block text-xs text-slate-500">{x.sub}</span></span>
                  </button>
                </li>
              );
            })}
          </ol>
          <Button className="mt-4" variant="ghost" size="sm" icon="x" onClick={onCancel}>{editing ? 'Abandonner les modifications' : 'Abandonner la demande'}</Button>
        </div>
        <div className="flex flex-col gap-2 lg:hidden">
          <div className="flex items-center justify-between gap-2 text-sm text-slate-600">
            <span>Étape {step + 1} sur 4 · <strong className="text-slate-900">{steps[step].label}</strong></span>
            <Button variant="ghost" size="sm" onClick={onCancel}>Abandonner</Button>
          </div>
          <div role="progressbar" aria-valuemin={1} aria-valuemax={4} aria-valuenow={step + 1} aria-label="Progression de la demande" className="h-1.5 overflow-hidden rounded-full bg-slate-200">
            <span className="block h-full rounded-full bg-brand-600 transition-all" style={{ width: `${((step + 1) / 4) * 100}%` }} />
          </div>
        </div>
      </aside>

      <div ref={panel} className="flex min-w-0 flex-col gap-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.05)] sm:p-8">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-brand-700">{editing ? `Modifier la demande ${editing.id}` : 'Nouvelle demande de rendez-vous'} · étape {step + 1}</p>
          <h2 tabIndex={-1} className="mt-1.5 text-2xl font-bold tracking-tight text-slate-900 focus:outline-none">{steps[step].label}</h2>
        </div>
        {editing?.status === 'validee' && step === 0 && (
          <Alert tone="warn" title="Demande déjà validée">Après modification, elle repasse en validation et ses QR codes actuels ne sont plus acceptés à la guérite.</Alert>
        )}
        {err && step === 0 && <Alert tone="bad" role="alert">{err}</Alert>}

        {step === 0 && <StepSlot f={f} set={set} setM={setM} user={user} now={now} e={show ? errors[0] : {}} exceptDemande={editId || null} />}
        {step === 1 && <StepTrucks f={f} set={set} setTruck={setTruck} e={show ? errors[1] : f.trucks.map(() => ({}))} />}
        {step === 2 && <StepDocs f={f} set={set} show={show} />}
        {step === 3 && <StepReview f={f} goTo={goTo} set={set} e={show ? errors[3] : {}} user={user} slot={data.slots.find(x => x.date === f.date && x.start === f.start)} />}

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-5">
          <Button variant="secondary" icon="arrow-left" onClick={() => (step === 0 ? (editing ? onCancel() : set({ mode: null })) : goTo(step - 1))}>
            {step === 0 ? (editing ? 'Annuler' : 'Changer de mode') : 'Retour'}
          </Button>
          {show && !valid(step) && <p role="alert" className="order-last w-full text-sm text-rose-700 sm:order-none sm:w-auto">Corrigez les champs signalés pour continuer.</p>}
          {step < 3
            ? <Button iconRight="arrow-right" onClick={next}>Continuer</Button>
            : (
              <Button size="lg" icon="send" loading={sending} onClick={() => { if (!valid(3)) { setTried(t => ({ ...t, 3: true })); return; } submit(); }}>
                {sending ? 'Envoi…' : editing ? 'Enregistrer et renvoyer en validation' : f.trucks.length > 1 ? `Envoyer la demande · ${f.trucks.length} camions` : 'Envoyer la demande'}
              </Button>
            )}
        </div>
      </div>
    </div>
  );
}
