// Messages du service de messagerie (e-mail, SMS, WhatsApp) : liste, statut, détail.
import { useState } from 'react';
import { CHANNELS, MSG_STATUS } from '../../Lib/messages.js';
import { formatPhone, fmtDateTime, fmtAgo } from '../../Lib/domain.js';
import { Icon } from '../ui/Icon.jsx';
import { Badge } from '../ui/Badge.jsx';
import { KeyValue } from '../ui/Data.jsx';
import { Drawer } from '../ui/Overlay.jsx';
import { cn } from '../../Lib/cn.js';

const CH_TONE = { email: 'bg-sky-50 text-sky-700', sms: 'bg-violet-50 text-violet-700', whatsapp: 'bg-emerald-50 text-emerald-700' };

export function ChannelIcon({ channel, size = 18, className }) {
  const c = CHANNELS[channel] || CHANNELS.email;
  return (
    <span title={c.label} className={cn('flex shrink-0 items-center justify-center rounded-xl', CH_TONE[channel] || CH_TONE.email, className)} style={{ width: size + 18, height: size + 18 }}>
      <Icon name={c.icon} size={size} />
    </span>
  );
}

export function MessageStatus({ message: m }) {
  const st = MSG_STATUS[m.status] || MSG_STATUS.simule;
  return <Badge tone={st.tone} icon={st.icon}>{st.label}</Badge>;
}

const statusSuffix = m => (m.status === 'echec' ? ' · échec de l’envoi' : m.status === 'en_file' ? ' · en file d’envoi' : m.status === 'desactive' ? ' · non envoyé' : '');
const recipient = m => (m.channel === 'email' ? m.to : formatPhone(m.to));

/** Ligne de message cliquable. */
export function MessageRow({ message: m, unread, onClick, showTo = true }) {
  const c = CHANNELS[m.channel] || CHANNELS.email;
  return (
    <button type="button" onClick={onClick}
      className={cn('flex w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500', unread && 'bg-brand-50/60')}>
      <ChannelIcon channel={m.channel} />
      <span className="min-w-0 flex-1">
        <span className={cn('block truncate text-sm text-slate-900', unread ? 'font-semibold' : 'font-medium')}>{m.subject || m.body.split('\n')[0]}</span>
        <span className="block truncate text-[13px] text-slate-500">{c.label}{statusSuffix(m)}{showTo ? ` · ${m.toName} · ${recipient(m)}` : ''}</span>
      </span>
      <span className="shrink-0 text-xs text-slate-400" title={fmtDateTime(m.at)}>{fmtAgo(m.at)}</span>
    </button>
  );
}

/** Détail d'un message (panneau latéral). */
export function MessageDetail({ message: m, onClose }) {
  const c = m ? CHANNELS[m.channel] || CHANNELS.email : null;
  return (
    <Drawer open={!!m} onClose={onClose} title={m ? `${c.label} · ${m.ref || ''}` : ''}>
      {m && (
        <>
          <KeyValue items={[
            ['Canal', <span className="inline-flex items-center gap-2"><ChannelIcon channel={m.channel} size={14} /> {c.label}</span>],
            ['Destinataire', <>{m.toName}<span className="text-slate-500"> · {recipient(m)}</span></>],
            ['Envoyé le', fmtDateTime(m.at)],
            m.subject && ['Objet', m.subject],
            ['Statut', <MessageStatus message={m} />],
            m.sentAt && ['Remis au serveur d’envoi', fmtDateTime(m.sentAt)],
            m.error && ['Erreur', <span className="font-mono text-xs">{m.error}</span>],
          ]} />
          <pre className={cn('whitespace-pre-wrap break-words rounded-2xl p-4 font-sans text-sm leading-relaxed text-slate-800',
            m.channel === 'whatsapp' ? 'bg-[#e7fbe6]' : m.channel === 'sms' ? 'bg-violet-50' : 'border border-slate-200 bg-slate-50')}>{m.body}</pre>
          {m.channel === 'sms' && <p className="text-sm text-slate-500">{m.body.length} caractères · {Math.ceil(m.body.length / 70)} SMS (encodage Unicode)</p>}
        </>
      )}
    </Drawer>
  );
}

/** Messages envoyés par le service de messagerie à propos d'un dossier. */
export function SentMessages({ messages, title = 'Messages envoyés', className }) {
  const [open, setOpen] = useState(null);
  if (!messages?.length) return null;
  const simulated = messages.every(m => m.status === 'simule');
  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <p className="flex items-center gap-2 text-sm font-semibold text-slate-800"><Icon name="mail-check" size={16} className="text-slate-500" /> {title}
        {simulated && <span className="font-normal text-slate-500">· démonstration : messages simulés</span>}</p>
      <div className="flex flex-col">{messages.map(m => <MessageRow key={m.id} message={m} onClick={() => setOpen(m)} />)}</div>
      <MessageDetail message={open} onClose={() => setOpen(null)} />
    </div>
  );
}
