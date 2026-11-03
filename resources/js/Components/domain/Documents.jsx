// Pièces justificatives : dépôt sécurisé (empreinte SHA-256 calculée par le serveur) et consultation.
import { useRef, useState } from 'react';
import { fmtSize } from '../../Lib/domain.js';
import { previews } from '../../Lib/download.js';
import { useApi } from '../../providers/PortFlowProvider.jsx';
import { Icon } from '../ui/Icon.jsx';
import { Button, buttonClass } from '../ui/Button.jsx';
import { Badge } from '../ui/Badge.jsx';
import { cn } from '../../Lib/cn.js';

/** Contrôle côté navigateur (le serveur revérifie le type réel et la taille). */
export function fileError(file, maxMb = 10) {
  const okType = /pdf|png|jpe?g|webp/i.test(file.type) || /\.(pdf|png|jpe?g|webp)$/i.test(file.name);
  if (!okType) return 'Format non accepté : PDF, JPG, PNG ou WebP.';
  if (file.size > maxMb * 1024 * 1024) return `Fichier trop lourd : ${maxMb} Mo maximum.`;
  return null;
}

/** Dépose un fichier ; renvoie ses métadonnées { name, size, type, sha256, at }. */
export async function uploadFile(api, file) {
  const r = await api.upload(file);
  if (!r.ok) throw new Error(r.error || 'Dépôt du fichier impossible.');
  if (/^image\//.test(file.type)) { try { previews.set(r.meta.sha256, URL.createObjectURL(file)); } catch { /* aperçu facultatif */ } }
  return r.meta;
}

/** Document d'exemple généré par le serveur (mode démonstration uniquement). */
export async function sampleMeta(api, label, context = '') {
  const r = await api.post('upload.sample', { label, context });
  if (!r.ok) throw new Error(r.error || 'Fichier d’exemple indisponible.');
  return r.meta;
}

/** Tuile de dépôt d'une pièce (glisser-déposer ou bouton). */
export function DocumentUpload({ id, label, hint, icon = 'file-text', meta, onFile, onRemove, error, className }) {
  const api = useApi();
  const input = useRef(null);
  const [drag, setDrag] = useState(false);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const handle = async file => {
    if (!file) return;
    const e = fileError(file);
    if (e) { setErr(e); return; }
    setErr(''); setBusy(true);
    try { onFile(await uploadFile(api, file)); } catch (er) { setErr(er.message); } finally { setBusy(false); }
  };
  const msg = err || error;
  return (
    <div onDragOver={ev => { ev.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)}
      onDrop={ev => { ev.preventDefault(); setDrag(false); handle(ev.dataTransfer.files?.[0]); }}
      className={cn('flex flex-col gap-3 rounded-2xl border bg-white p-4 transition-colors',
        drag ? 'border-brand-500 bg-brand-50' : msg ? 'border-rose-300' : meta ? 'border-emerald-200 bg-emerald-50/40' : 'border-dashed border-slate-300', className)}>
      <div className="flex items-start gap-3">
        <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', meta ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500')}>
          <Icon name={meta ? 'file-check' : icon} size={20} />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-900">{label}</p>
          {hint && <p className="mt-0.5 text-[13px] text-slate-500">{hint}</p>}
        </div>
      </div>
      {meta && (
        <div className="flex flex-col gap-0.5 rounded-xl bg-white px-3 py-2 text-[13px] ring-1 ring-inset ring-slate-200">
          <a href={api.fileUrl(meta.sha256)} target="_blank" rel="noopener noreferrer" title={meta.name} className="truncate font-medium text-slate-900 hover:text-brand-700 hover:underline">{meta.name}</a>
          <span className="text-slate-500">{fmtSize(meta.size)}{meta.sample ? ' · fichier d’exemple' : ''}</span>
          <span className="font-mono text-[12px] text-slate-500">SHA-256 {meta.sha256.slice(0, 16)}…</span>
        </div>
      )}
      {msg && <p role="alert" className="flex items-start gap-1.5 text-sm text-rose-700"><Icon name="triangle-alert" size={15} className="mt-0.5" /> {msg}</p>}
      <input id={id} ref={input} type="file" accept=".pdf,image/png,image/jpeg,image/webp" hidden onChange={ev => { handle(ev.target.files?.[0]); ev.target.value = ''; }} />
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant={meta ? 'ghost' : 'secondary'} icon={meta ? 'refresh-cw' : 'upload'} loading={busy} onClick={() => input.current?.click()}>
          {busy ? 'Envoi sécurisé…' : meta ? 'Remplacer' : 'Déposer un fichier'}
        </Button>
        {meta && onRemove && <Button size="sm" variant="ghost" icon="trash-2" onClick={onRemove}>Retirer</Button>}
      </div>
    </div>
  );
}

/** Liste des pièces déposées (lecture seule) : defs [{ key, label }], docs { key: meta }. */
export function DocumentList({ defs, docs, className }) {
  const api = useApi();
  return (
    <ul className={cn('flex flex-col divide-y divide-slate-100', className)}>
      {defs.map(d => {
        const meta = docs?.[d.key];
        const prev = meta && (previews.get(meta.sha256) || (/^image\//.test(meta.type || '') ? api.fileUrl(meta.sha256) : null));
        return (
          <li key={d.key} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
            <span className={cn('mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg', meta ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700')}>
              <Icon name={meta ? 'file-check' : 'file-x'} size={18} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-slate-900">{d.label}</p>
              <p className="mt-0.5 flex flex-wrap gap-x-2 text-[13px] text-slate-500">
                {meta ? <><span className="truncate">{meta.name}</span>{meta.size > 0 && <span>{fmtSize(meta.size)}</span>}<span className="font-mono">SHA-256 {meta.sha256.slice(0, 12)}…</span></> : <span>Non fournie</span>}
              </p>
              {prev && <img src={prev} alt={`Aperçu : ${d.label}`} className="mt-2 max-h-40 rounded-lg border border-slate-200 object-contain" />}
            </div>
            {meta ? (
              <a href={api.fileUrl(meta.sha256)} target="_blank" rel="noopener noreferrer" aria-label={`Ouvrir : ${d.label}`} className={buttonClass({ variant: 'ghost', size: 'sm' })}>
                <Icon name="external-link" size={16} /><span>Ouvrir</span>
              </a>
            ) : <Badge tone="warn" icon="triangle-alert">Manquante</Badge>}
          </li>
        );
      })}
    </ul>
  );
}
