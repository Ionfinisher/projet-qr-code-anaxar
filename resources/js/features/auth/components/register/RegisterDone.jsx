import { useRef } from 'react';
import { copyText } from '../../../../lib/download.js';
import { AppLink } from '../../../../lib/navigation.jsx';
import { Button, Icon, buttonClass } from '../../../../components/ui/index.js';
import { SentMessages } from '../../../../components/domain/index.js';

/** Confirmation d'envoi (création ou mise à jour) : référence à conserver et messages envoyés. */
export function RegisterDone({ res, updated }) {
  const refEl = useRef(null);
  const ins = res.ins;
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div className="flex flex-col items-center gap-3 text-center">
        <span className="flex h-16 w-16 items-center justify-center rounded-3xl bg-sky-50 text-sky-700 ring-1 ring-sky-200"><Icon name="send" size={30} /></span>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">{updated ? 'Demande mise à jour' : 'Demande d’inscription envoyée'}</h1>
        <p className="max-w-xl text-[15px] text-slate-600">L’administration examine vos pièces. Vous recevrez la décision par e-mail. Conservez votre référence pour suivre ou compléter la demande.</p>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4">
        <div className="min-w-0">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Référence</span>
          <input ref={refEl} readOnly value={ins.id} aria-label="Référence de la demande" onFocus={ev => ev.target.select()}
            className="block w-full bg-transparent font-mono text-2xl font-semibold text-slate-900 focus:outline-none" />
        </div>
        <Button variant="secondary" size="sm" icon="copy" onClick={() => copyText(ins.id, refEl.current)}>Copier</Button>
      </div>
      <SentMessages messages={res.msgs} title={updated ? 'Messages envoyés pour la mise à jour' : 'Messages envoyés'} />
      <div className="flex flex-wrap justify-center gap-2">
        <AppLink to="track" query={{ ref: ins.id, contact: ins.email || ins.phone }} className={buttonClass()}><Icon name="file-search" size={18} /> Suivre ma demande</AppLink>
        <AppLink to="login" className={buttonClass({ variant: 'secondary' })}><Icon name="log-in" size={18} /> Retour à la connexion</AppLink>
      </div>
    </div>
  );
}
