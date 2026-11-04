// Actions sur un gate pass : envoyer au chauffeur (WhatsApp, SMS, image), télécharger le PNG, copier le code.
import { useRef, useState } from 'react';
import { driverName, formatPhone, relDay, TERMINALS } from '../../../lib/domain.js';
import { passPng } from '../../../lib/passImage.js';
import { saveFile, copyText } from '../../../lib/download.js';
import { notify } from '../../../lib/alerts.js';
import { useServerConfig } from '../../../providers/PortFlowProvider.jsx';
import { Button, Modal, Field, Input, Icon } from '../../../Components/ui/index.js';
import { QrCode } from '../../../Components/domain/index.js';
import { cn } from '../../../lib/cn.js';
import { useTransporteurApi } from '../api.js';
import { passLink, waLink, waText } from '../passLinks.js';

/** Boutons sous le pass ; `compact` : petite taille, sans le bloc « code du QR ». */
export function PassActions({ rdv: r, compact = false }) {
  const taRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [send, setSend] = useState(false);
  const size = compact ? 'sm' : 'md';
  const download = async () => {
    setBusy(true);
    try { await saveFile(`${r.id}-gate-pass.png`, await passPng(r)); } finally { setBusy(false); }
  };
  return (
    <>
      <div className="flex flex-wrap gap-2">
        {r.driver.phone && <Button size={size} icon="send" onClick={() => setSend(true)}>Envoyer au chauffeur</Button>}
        <Button variant="secondary" size={size} icon="download" loading={busy} onClick={download}>Télécharger (PNG)</Button>
        <Button variant="secondary" size={size} icon="copy" onClick={() => copyText(r.token, taRef.current)}>Copier le code</Button>
      </div>
      {!compact ? (
        <details className="group rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-3 text-sm">
          <summary className="cursor-pointer select-none font-medium text-slate-700 marker:text-slate-400">Code du QR (JWS compact, {r.token.length} caractères)</summary>
          <label className="sr-only" htmlFor={`tok-${r.id}`}>Code du QR</label>
          <textarea id={`tok-${r.id}`} ref={taRef} readOnly value={r.token} onFocus={e => e.target.select()} rows={4}
            className="mt-3 block w-full resize-y break-all rounded-lg border border-slate-200 bg-white p-2.5 font-mono text-[11.5px] leading-relaxed text-slate-700 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/25" />
        </details>
      ) : <textarea ref={taRef} readOnly value={r.token} className="sr-only" tabIndex={-1} aria-hidden="true" />}
      <SendModal rdv={r} open={send} onClose={() => setSend(false)} />
    </>
  );
}

function SendOption({ as: As = 'button', icon, title, text, main = false, aside = 'chevron-right', ...rest }) {
  return (
    <As {...(As === 'button' ? { type: 'button' } : {})} {...rest}
      className={cn('flex w-full cursor-pointer items-center gap-3.5 rounded-2xl border px-4 py-3.5 text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 disabled:cursor-not-allowed disabled:opacity-60',
        main ? 'border-emerald-300 bg-emerald-50/70 hover:border-emerald-400 hover:bg-emerald-50' : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50')}>
      <span className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-xl', main ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-700')}>
        <Icon name={icon} size={22} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-slate-900">{title}</span>
        <span className="mt-0.5 block text-[13px] leading-snug text-slate-500">{text}</span>
      </span>
      <Icon name={aside} size={18} className="text-slate-400" />
    </As>
  );
}

/** Envoi du QR code au chauffeur. */
export function SendModal({ rdv: r, open, onClose }) {
  const config = useServerConfig();
  const tapi = useTransporteurApi();
  const linkRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [smsBusy, setSmsBusy] = useState(false);
  const canCopyImage = typeof window !== 'undefined' && typeof window.ClipboardItem === 'function' && !!navigator.clipboard?.write;
  const smsOn = !!config.demo || (config.channels?.sms && config.channels.sms !== 'log');
  const link = passLink(config, r);
  const text = waText(config, r);
  const wa = waLink(config, r);

  const shareImage = async () => {
    setBusy(true);
    try {
      const blob = await passPng(r);
      const file = typeof File === 'function' ? new File([blob], `${r.id}-gate-pass.png`, { type: 'image/png' }) : null;
      if (file && navigator.canShare?.({ files: [file] })) {
        try {
          await navigator.share({ files: [file], title: `Gate pass ${r.id}`, text });
          tapi.logWhatsApp(r.id, text);
          return;
        } catch (e) { if (e?.name === 'AbortError') return; }
      }
      await saveFile(`${r.id}-gate-pass.png`, blob);
    } finally { setBusy(false); }
  };
  const sendSms = async () => {
    setSmsBusy(true);
    try {
      const res = await tapi.sendPassSms(r.id);
      if (!res.ok) { notify(res.error, 'bad'); return; }
      notify(config.demo ? 'SMS enregistré (démonstration : non envoyé)' : `SMS envoyé au ${formatPhone(r.driver.phone)}`, 'ok');
    } finally { setSmsBusy(false); }
  };
  const copyImage = async () => {
    try {
      await navigator.clipboard.write([new window.ClipboardItem({ 'image/png': passPng(r) })]);
      notify('Image du QR copiée : collez-la dans la conversation WhatsApp', 'ok');
    } catch {
      notify('Copie d’image refusée dans cette vue : utilisez le lien ou le partage', 'warn');
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Envoyer le QR code" description={`${r.id} · ${driverName(r.driver)}`} size="lg">
      <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-slate-50/70 p-3.5">
        <div className="w-24 shrink-0 rounded-xl border border-slate-200 bg-white p-1.5 sm:w-28">
          <QrCode text={r.token} label={`QR code signé du rendez-vous ${r.id}`} />
        </div>
        <div className="flex min-w-0 flex-col gap-1.5 text-sm">
          <p className="truncate text-base font-semibold text-slate-900">{driverName(r.driver)}</p>
          <p className="flex flex-wrap gap-x-3 gap-y-1 text-slate-600">
            {r.driver.phone && <span className="inline-flex items-center gap-1.5 tabular-nums"><Icon name="phone" size={14} /> {formatPhone(r.driver.phone)}</span>}
            <span className="inline-flex items-center gap-1.5 font-mono text-[13px]"><Icon name="id-card" size={14} /> {r.driver.license ? `Permis ${r.driver.license}` : 'Permis non renseigné'}</span>
          </p>
          <p className="flex flex-wrap gap-x-3 gap-y-1 text-slate-500">
            <span className="font-mono text-[13px]">{r.id}</span>
            <span className="inline-flex items-center gap-1.5"><Icon name="calendar-clock" size={14} /> {relDay(r.slot.date)} · {r.slot.start}–{r.slot.end}</span>
            <span>{TERMINALS[r.terminal]?.short}</span>
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-2.5">
        <p className="text-sm font-semibold text-slate-800">Choisissez le mode d’envoi</p>
        {wa && (
          <SendOption as="a" href={wa} target="_blank" rel="noopener noreferrer" main icon="message-circle" aside="arrow-up-right"
            title="WhatsApp avec le lien du QR" onClick={() => tapi.logWhatsApp(r.id, text)}
            text="Le chauffeur touche le lien : son pass s’ouvre avec le QR en plein écran, prêt à scanner à la guérite." />
        )}
        {smsOn && (
          <SendOption icon="message-square" disabled={smsBusy} onClick={sendSms}
            title={smsBusy ? 'Envoi du SMS…' : 'SMS avec le lien du pass'}
            text={`Envoyé par PortFlow au ${formatPhone(r.driver.phone)} : utile si le chauffeur n’a pas WhatsApp.`} />
        )}
        <SendOption icon="image-up" disabled={busy} onClick={shareImage}
          title={busy ? 'Préparation de l’image…' : 'Partager l’image du QR'}
          text="Sur téléphone : menu de partage, puis WhatsApp. Sur ordinateur : l’image est téléchargée, joignez-la au message." />
        {canCopyImage && (
          <SendOption icon="copy" onClick={copyImage} title="Copier l’image du QR" text="Puis collez-la (Ctrl+V) dans WhatsApp Web ou WhatsApp Desktop." />
        )}
      </div>

      <Field id={`link-${r.id}`} label="Lien du pass chauffeur" hint="Le lien affiche toujours le QR en vigueur ; il est désactivé si la demande est modifiée ou annulée.">
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input ref={linkRef} id={`link-${r.id}`} readOnly value={link} mono aria-describedby={`link-${r.id}-msg`} onFocus={e => e.target.select()} className="text-[12.5px]" />
          <Button variant="secondary" icon="link" className="h-11 shrink-0" onClick={() => copyText(link, linkRef.current)}>Copier</Button>
        </div>
      </Field>
    </Modal>
  );
}
