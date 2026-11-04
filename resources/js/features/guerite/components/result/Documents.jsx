// Documents à la guérite : fichier du dossier comparé à l'empreinte du QR signé, décision du poste,
// contrôle des 6 documents par le superviseur, avancement des autres postes.
import { useState } from 'react';
import { DOCS, fmtSize, fmtDateTime, fmtTime } from '../../../../lib/domain.js';
import { previews } from '../../../../lib/download.js';
import { useApi } from '../../../../providers/PortFlowProvider.jsx';
import { Button, Icon, buttonClass } from '../../../../Components/ui/index.js';
import { cn } from '../../../../lib/cn.js';
import { PostBadge } from '../PostBadge.jsx';

/** Le fichier du dossier correspond-il à l'empreinte scellée dans le QR ? true / false / null (inconnu). */
export function hashMatch(rdv, cur, key) {
  const idx = DOCS.findIndex(d => d.key === key);
  const signed = cur.verif?.claims?.dh?.[idx];
  const meta = rdv.docs?.[key];
  if (!signed || !meta?.sha256) return null;
  return meta.sha256.startsWith(signed);
}

export function FileCard({ meta, match }) {
  const api = useApi();
  if (!meta) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-dashed border-slate-300 px-3 py-3 text-sm text-slate-500">
        <Icon name="file-x" size={20} /> Aucun fichier déposé
      </div>
    );
  }
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white text-slate-600 ring-1 ring-inset ring-slate-200"><Icon name="file-text" size={20} /></span>
      <div className="min-w-0 flex-1">
        <a href={api.fileUrl(meta.sha256)} target="_blank" rel="noopener noreferrer" className="block truncate text-sm font-semibold text-slate-900 hover:text-brand-700 hover:underline">{meta.name}</a>
        <p className="flex flex-wrap gap-x-2 text-[13px] text-slate-500">
          {meta.size > 0 && <span>{fmtSize(meta.size)}</span>}
          {meta.at && <span>déposé le {fmtDateTime(meta.at)}</span>}
          <span className="font-mono">SHA-256 {meta.sha256.slice(0, 16)}…</span>
          {match === true && <span className="font-semibold text-emerald-700">Empreinte conforme au QR signé</span>}
          {match === false && <span className="font-semibold text-rose-700">Empreinte différente du QR</span>}
        </p>
      </div>
      <a href={api.fileUrl(meta.sha256)} target="_blank" rel="noopener noreferrer" className={buttonClass({ variant: 'secondary', size: 'sm' })}>
        <Icon name="external-link" size={16} /><span>Ouvrir</span>
      </a>
    </div>
  );
}

/** Document du poste de l'agent : fichier, aperçu, décision (valider / rejeter, révisable). */
export function MyDoc({ rdv: r, doc: d, cur, onOk, onKo }) {
  const api = useApi();
  const meta = r.docs?.[d.key];
  const check = r.checks?.[d.key];
  const preview = meta?.sha256 ? previews.get(meta.sha256) || (/^image\//.test(meta.type || '') ? api.fileUrl(meta.sha256) : null) : null;
  const [edit, setEdit] = useState(false);
  return (
    <div className="flex flex-col gap-4 rounded-2xl border-2 border-slate-900 bg-white p-4 sm:p-5">
      <div className="flex items-center gap-3">
        <PostBadge post={d.post} size="lg" />
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Votre document</p>
          <h3 className="text-xl font-bold text-slate-900">{d.label}</h3>
        </div>
      </div>
      <FileCard meta={meta} match={hashMatch(r, cur, d.key)} />
      {preview && <img src={preview} alt={`Aperçu : ${d.label}`} className="max-h-72 w-full rounded-xl border border-slate-200 object-contain" />}
      {check && !edit ? (
        <div className={cn('flex flex-wrap items-center justify-between gap-3 rounded-xl px-4 py-3', check.s === 'ok' ? 'bg-emerald-50 text-emerald-900' : 'bg-rose-50 text-rose-900')}>
          <span className="flex items-center gap-3">
            <Icon name={check.s === 'ok' ? 'circle-check' : 'circle-x'} size={24} />
            <span>
              <span className="block text-base font-bold">{check.s === 'ok' ? 'Document validé' : `Rejeté · ${check.reason}`}</span>
              <span className="block text-[13px] opacity-80">{check.by} · {fmtTime(check.at)}</span>
            </span>
          </span>
          <Button size="sm" variant="ghost" icon="rotate-ccw" onClick={() => setEdit(true)}>Revoir la décision</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Button size="xl" variant="ok" icon="check" onClick={() => { onOk(); setEdit(false); }}>Valider le document</Button>
          <Button size="xl" variant="danger-outline" icon="x" onClick={() => { onKo(); setEdit(false); }}>Rejeter</Button>
        </div>
      )}
    </div>
  );
}

const SQ = 'flex h-12 w-12 cursor-pointer items-center justify-center rounded-xl border-2 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2';

/** Superviseur : décision sur chacun des 6 documents. */
export function SupDocs({ rdv: r, cur, onOk, onKo }) {
  return (
    <ul className="flex flex-col divide-y divide-slate-100">
      {DOCS.map(d => {
        const c = r.checks?.[d.key];
        const meta = r.docs?.[d.key];
        const match = hashMatch(r, cur, d.key);
        return (
          <li key={d.key} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
            <PostBadge post={d.post} size="sm" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-slate-900">{d.label}</p>
              <p className={cn('text-[13px]', c?.s === 'ok' ? 'text-emerald-700' : c?.s === 'ko' ? 'text-rose-700' : 'text-slate-500')}>
                {c ? `${c.s === 'ok' ? 'Validé' : `Rejeté · ${c.reason}`} · ${c.by} · ${fmtTime(c.at)}` : meta ? `En attente · SHA-256 ${meta.sha256.slice(0, 10)}…` : 'Non déposé'}
                {match === true && !c ? ' · empreinte conforme' : ''}
              </p>
            </div>
            <span className="flex shrink-0 gap-2">
              <button type="button" aria-pressed={c?.s === 'ok'} aria-label={`Valider : ${d.label}`} onClick={() => onOk(d.key)}
                className={cn(SQ, 'focus-visible:ring-emerald-500', c?.s === 'ok' ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-slate-200 bg-white text-emerald-700 hover:border-emerald-400 hover:bg-emerald-50')}>
                <Icon name="check" size={22} strokeWidth={2.6} />
              </button>
              <button type="button" aria-pressed={c?.s === 'ko'} aria-label={`Rejeter : ${d.label}`} onClick={() => onKo(d.key)}
                className={cn(SQ, 'focus-visible:ring-rose-500', c?.s === 'ko' ? 'border-rose-600 bg-rose-600 text-white' : 'border-slate-200 bg-white text-rose-700 hover:border-rose-400 hover:bg-rose-50')}>
                <Icon name="x" size={22} strokeWidth={2.6} />
              </button>
            </span>
          </li>
        );
      })}
    </ul>
  );
}

/** Avancement des 6 postes (lecture seule) ; `mine` = document du poste de l'agent. */
export function ChecksGrid({ rdv: r, mine }) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {DOCS.map(d => {
        const c = r.checks?.[d.key];
        return (
          <div key={d.key} className={cn('flex items-center gap-2.5 rounded-xl border px-3 py-2.5',
            c?.s === 'ok' ? 'border-emerald-200 bg-emerald-50' : c?.s === 'ko' ? 'border-rose-200 bg-rose-50' : 'border-slate-200 bg-white',
            mine === d.key && 'ring-2 ring-brand-500')}>
            <span className={cn('flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-white',
              c?.s === 'ok' ? 'bg-emerald-600' : c?.s === 'ko' ? 'bg-rose-600' : 'bg-slate-300')}>
              <Icon name={c?.s === 'ok' ? 'check' : c?.s === 'ko' ? 'x' : 'clock'} size={15} strokeWidth={2.6} />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold text-slate-900">{d.post}. {d.short}</span>
              <span className="block truncate text-xs text-slate-500">{c ? (c.s === 'ok' ? `Validé · ${fmtTime(c.at)}` : c.reason) : 'En attente'}</span>
            </span>
          </div>
        );
      })}
    </div>
  );
}
