import { useRef, useState } from 'react';
import { INS_DOCS, INS_STATUS } from '../../../lib/domain.js';
import { notify } from '../../../lib/alerts.js';
import { useNav } from '../../../lib/navigation.jsx';
import { usePortFlow, useApi } from '../../../providers/PortFlowProvider.jsx';
import { Alert, Button, EmptyState, Icon } from '../../../Components/ui/index.js';
import { sampleMeta } from '../../../Components/domain/index.js';
import { cn } from '../../../lib/cn.js';
import { useAuthApi } from '../api.js';
import { REG_STEPS, emptyReg, regFromIns, regErrors, regPayload, sampleReg } from '../registerForm.js';
import { StepIdentity, StepContact, StepDocuments, StepReview } from '../components/register/RegisterSteps.jsx';
import { RegisterDone } from '../components/register/RegisterDone.jsx';

/** Créer un compte transporteur (/inscription) ou mettre à jour sa demande (/inscription/:id/modifier). */
export function RegisterPage() {
  const { config, data } = usePortFlow();
  const api = useApi();
  const auth = useAuthApi();
  const nav = useNav();
  const editId = nav.params.id || null;
  const editing = editId ? data.inscriptions.find(i => i.id === editId) : null;
  const demo = !!config?.demo;
  const [f, setF] = useState(() => (editing ? regFromIns(editing) : emptyReg()));
  const [step, setStep] = useState(0);
  const [tried, setTried] = useState({});
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [done, setDone] = useState(null);
  const panel = useRef(null);
  const set = p => setF(x => ({ ...x, ...(typeof p === 'function' ? p(x) : p) }));
  const setRep = p => setF(x => ({ ...x, rep: { ...x.rep, ...p } }));
  const errors = regErrors(f, !!editing);
  const valid = i => !Object.keys(errors[i]).length;
  const firstInvalid = [0, 1, 2, 3].find(i => !valid(i));
  const e = tried[step] ? errors[step] : {};

  if (done) return <RegisterDone res={done} updated={!!editing} />;
  if (editId && !editing) {
    return (
      <EmptyState icon="file-search" title="Demande introuvable" action={<Button variant="secondary" icon="file-search" onClick={() => nav.go('track')}>Suivre ma demande</Button>}>
        Retrouvez d’abord votre demande avec sa référence et son contact.
      </EmptyState>
    );
  }
  if (editing && !['en_attente', 'a_completer'].includes(editing.status)) {
    return <Alert tone="info" title="Cette demande ne peut plus être modifiée">Statut : {INS_STATUS[editing.status].label}.</Alert>;
  }

  const goTo = i => {
    setStep(i);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setTimeout(() => panel.current?.querySelector('h1')?.focus(), 30);
  };
  const next = () => {
    if (!valid(step)) {
      setTried(t => ({ ...t, [step]: true }));
      setTimeout(() => panel.current?.querySelector('[aria-invalid="true"], [role="alert"]')?.scrollIntoView?.({ block: 'center', behavior: 'smooth' }), 30);
      return;
    }
    goTo(step + 1);
  };
  const samples = async (fill = false) => {
    try {
      const docs = { ...f.docs };
      for (const d of INS_DOCS[f.kind]) if (!docs[d.key]) docs[d.key] = await sampleMeta(api, d.label, 'Demande d’inscription');
      if (fill) { set(x => ({ ...sampleReg(x.kind), docs, cgu: true, rgpd: true })); notify('Formulaire rempli avec un exemple fictif', 'neutral'); }
      else set({ docs });
    } catch (er) { notify(er.message, 'bad'); }
  };
  const submit = async () => {
    if (firstInvalid !== undefined) { setTried(t => ({ ...t, [firstInvalid]: true })); goTo(firstInvalid); return; }
    setBusy(true); setErr('');
    try {
      const r = editing ? await auth.updateInscription(editing.id, regPayload(f)) : await auth.submitInscription(regPayload(f));
      if (!r.ok) { setErr(r.error); return; }
      if (editing) notify(`Demande ${r.ins.id} mise à jour`, 'ok');
      setDone(r);
      window.scrollTo({ top: 0 });
    } finally { setBusy(false); }
  };
  const cancel = () => (editing ? nav.go('track', undefined, { query: { ref: editing.id, contact: editing.email || editing.phone } }) : nav.go('login'));

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[260px_minmax(0,1fr)] lg:gap-10">
      <aside>
        <div className="hidden lg:sticky lg:top-24 lg:block">
          <p className="mb-3 px-2 text-xs font-semibold uppercase tracking-[0.08em] text-brand-700">{editing ? `Mise à jour · ${editing.id}` : 'Demande d’inscription'}</p>
          <ol className="flex flex-col gap-1">
            {REG_STEPS.map((x, i) => {
              const reachable = i <= step || firstInvalid === undefined || i <= firstInvalid;
              const ok = i < step && valid(i);
              return (
                <li key={x.label}>
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
          {!editing && demo && <Button className="mt-4" variant="ghost" size="sm" icon="sparkles" onClick={() => samples(true)}>Remplir avec un exemple</Button>}
        </div>
        <div className="flex flex-col gap-2 lg:hidden">
          <div className="flex items-center justify-between gap-2 text-sm text-slate-600">
            <span>Étape {step + 1} sur 4 · <strong className="text-slate-900">{REG_STEPS[step].label}</strong></span>
            {!editing && demo && <Button variant="ghost" size="sm" onClick={() => samples(true)}>Exemple</Button>}
          </div>
          <div role="progressbar" aria-valuemin={1} aria-valuemax={4} aria-valuenow={step + 1} aria-label="Progression de la demande" className="h-1.5 overflow-hidden rounded-full bg-slate-200">
            <span className="block h-full rounded-full bg-brand-600 transition-all" style={{ width: `${((step + 1) / 4) * 100}%` }} />
          </div>
        </div>
      </aside>

      <div ref={panel} className="flex min-w-0 flex-col gap-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.05)] sm:p-8">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-brand-700">{editing ? 'Mettre à jour ma demande' : 'Créer un compte transporteur'} · étape {step + 1}</p>
          <h1 tabIndex={-1} className="mt-1.5 text-2xl font-bold tracking-tight text-slate-900 focus:outline-none">{REG_STEPS[step].label}</h1>
        </div>
        {editing?.status === 'a_completer' && step === 0 && (
          <Alert tone="warn" icon="file-up" title="Compléments demandés par l’administration">{editing.request?.comment}</Alert>
        )}

        {step === 0 && <StepIdentity f={f} set={set} setRep={setRep} e={e} editing={editing} />}
        {step === 1 && <StepContact f={f} set={set} e={e} editing={editing} />}
        {step === 2 && <StepDocuments f={f} set={set} e={e} demo={demo} onSamples={() => samples(false)} />}
        {step === 3 && <StepReview f={f} set={set} e={e} editing={editing} goTo={goTo} pwdAlgo={config?.pwdAlgo} error={err} />}

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-5">
          <Button variant="secondary" icon="arrow-left" onClick={() => (step === 0 ? cancel() : goTo(step - 1))}>{step === 0 ? 'Annuler' : 'Retour'}</Button>
          {tried[step] && !valid(step) && <p role="alert" className="order-last w-full text-sm text-rose-700 sm:order-none sm:w-auto">Corrigez les champs signalés pour continuer.</p>}
          {step < 3
            ? <Button iconRight="arrow-right" onClick={next}>Continuer</Button>
            : <Button size="lg" icon="send" loading={busy} onClick={() => { if (!valid(3)) { setTried(t => ({ ...t, 3: true })); return; } submit(); }}>{busy ? 'Envoi…' : editing ? 'Envoyer la mise à jour' : 'Envoyer ma demande'}</Button>}
        </div>
      </div>
    </div>
  );
}
