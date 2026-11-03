// Panneau de scan : caméra, photo, image, douchette ou saisie, simulation en démonstration.
import { useEffect, useRef, useState } from 'react';
import { dayStr, statusOf, tamperToken } from '../../../lib/domain.js';
import { decodeQrFromFile } from '../../../lib/qrscan.js';
import { Button, Icon, controlClass } from '../../../components/ui/index.js';
import { cn } from '../../../lib/cn.js';
import { LiveScanner } from './LiveScanner.jsx';

export function ScanPanel({ busy, onInput, rdvs, now, demo, className }) {
  const camRef = useRef(null);
  const imgRef = useRef(null);
  const inputRef = useRef(null);
  const [code, setCode] = useState('');
  const [drag, setDrag] = useState(false);
  const [err, setErr] = useState('');
  const [live, setLive] = useState(false);
  const hasCam = typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia;
  // La douchette (lecteur USB / Bluetooth en mode clavier) écrit dans le champ actif
  useEffect(() => { inputRef.current?.focus({ preventScroll: true }); }, []);

  const readFile = async (file, source) => {
    if (!file) return;
    setErr('');
    try {
      const text = await decodeQrFromFile(file);
      if (!text) { setErr('Aucun QR code détecté. Cadrez le code en entier, sans reflet, puis réessayez.'); return; }
      onInput(text, source);
    } catch {
      setErr('Image illisible : réessayez avec une photo nette.');
    }
  };
  const today = dayStr(now);
  const expected = rdvs
    .filter(r => r.slot.date === today && ['confirme', 'controle', 'bloque', 'au_port'].includes(statusOf(r, now)))
    .sort((a, b) => a.slot.start.localeCompare(b.slot.start))
    .slice(0, 6);
  const tamperSrc = expected.find(r => statusOf(r, now) === 'confirme') || expected[0];

  return (
    <section aria-labelledby="gt-scan-title" className={cn('flex flex-col gap-3 rounded-3xl border border-slate-200 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.05)] sm:p-5', className)}>
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-brand-700">Contrôle d’accès</p>
        <h2 id="gt-scan-title" className="mt-1 text-xl font-bold tracking-tight text-slate-900">Scanner le QR code</h2>
      </div>
      <div onDragOver={e => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)}
        onDrop={e => { e.preventDefault(); setDrag(false); readFile(e.dataTransfer.files?.[0], 'image'); }}
        className={cn('relative flex flex-col items-center justify-center gap-3 overflow-hidden rounded-2xl border-2 border-dashed px-4 py-6 text-center transition-colors',
          drag ? 'border-brand-400 bg-slate-800' : 'border-slate-700 bg-slate-900')}>
        <span className="relative flex h-24 w-24 items-center justify-center rounded-2xl border-2 border-white/70 text-white">
          <Icon name="qr-code" size={54} strokeWidth={1.6} />
          {!busy && <span className="pf-scan-line" aria-hidden="true" />}
        </span>
        <p className="max-w-xs text-sm text-slate-300" aria-live="polite">{busy ? 'Vérification de la signature…' : 'Scannez le QR présenté par le chauffeur, ou déposez une image ici.'}</p>
      </div>
      <input ref={camRef} type="file" accept="image/*" capture="environment" hidden onChange={e => { readFile(e.target.files?.[0], 'photo'); e.target.value = ''; }} />
      <input ref={imgRef} type="file" accept="image/*" hidden onChange={e => { readFile(e.target.files?.[0], 'image'); e.target.value = ''; }} />
      {hasCam && <Button size="xl" icon="scan-line" block disabled={busy} onClick={() => setLive(true)}>Scanner avec la caméra</Button>}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-1">
        <Button size={hasCam ? 'lg' : 'xl'} variant={hasCam ? 'secondary' : 'primary'} icon="camera" block disabled={busy} onClick={() => camRef.current?.click()}>Photographier le QR code</Button>
        <Button size="lg" variant="secondary" icon="image-up" block disabled={busy} onClick={() => imgRef.current?.click()}>Importer une image</Button>
      </div>
      {err && <p role="alert" className="flex items-start gap-1.5 text-sm text-rose-700"><Icon name="triangle-alert" size={15} className="mt-0.5" /> {err}</p>}

      <form className="flex flex-col gap-1.5 border-t border-slate-100 pt-3" onSubmit={e => { e.preventDefault(); onInput(code, 'douchette'); setCode(''); }}>
        <label htmlFor="gt-code" className="text-sm font-medium text-slate-800">Douchette ou saisie manuelle</label>
        <div className="flex gap-2">
          <input id="gt-code" ref={inputRef} autoComplete="off" spellCheck={false} placeholder="PF-XXXXXX ou code du QR" aria-describedby="gt-code-help"
            value={code} onChange={e => setCode(e.target.value)} className={controlClass(false, 'h-12 min-w-0 flex-1 px-3.5 font-mono text-base tracking-wide placeholder:font-sans placeholder:text-sm placeholder:tracking-normal')} />
          <Button type="submit" variant="dark" size="lg" icon="arrow-right" disabled={!code.trim() || busy} aria-label="Vérifier le code">Vérifier</Button>
        </div>
        <p id="gt-code-help" className="text-[13px] text-slate-500">Compatible douchettes USB et Bluetooth en mode clavier : le code est vérifié dès la validation.</p>
      </form>

      {demo && (
        <div className="rounded-2xl border border-dashed border-brand-300 bg-brand-50/50 p-3">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900"><Icon name="sparkles" size={15} className="text-brand-600" /> Simulation · démo</h3>
          {expected.length === 0 && <p className="mt-1 text-[13px] text-slate-500">Aucun camion attendu aujourd’hui dans les données de démonstration.</p>}
          <div className="mt-2 flex flex-wrap gap-2">
            {expected.map(r => (
              <button key={r.id} type="button" onClick={() => onInput(r.token, 'demo')} aria-label={`Simuler le scan du QR ${r.id}`}
                className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm hover:border-brand-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500">
                <Icon name="qr-code" size={16} className="text-slate-500" /><span className="font-mono font-semibold text-slate-900">{r.id}</span><span className="text-slate-500">{r.slot.start}</span>
              </button>
            ))}
            {tamperSrc && (
              <button type="button" onClick={() => onInput(tamperToken(tamperSrc.token), 'demo')}
                className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 text-sm font-medium text-rose-800 hover:border-rose-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500">
                <Icon name="shield-x" size={16} /> QR falsifié
              </button>
            )}
          </div>
        </div>
      )}
      {live && <LiveScanner onClose={() => setLive(false)} onCode={c => { setLive(false); onInput(c, 'camera'); }} />}
    </section>
  );
}
