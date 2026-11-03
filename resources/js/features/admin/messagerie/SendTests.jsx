// Tests du service de messagerie : un e-mail et un SMS réels (mode exploitation uniquement).
import { useState } from 'react';
import { emailValid, phoneValid, toE164 } from '../../../lib/domain.js';
import { Card, SectionTitle, Input, PhoneInput, Button } from '../../../components/ui/index.js';
import { useAdminApi } from '../api.js';
import { cn } from '../../../lib/cn.js';

export const DRIVER_LABEL = { smtp: 'SMTP', mail: 'mail() du serveur', log: 'journal seulement', twilio: 'Twilio', http: 'passerelle HTTP', 'wa.me': 'lien WhatsApp (wa.me)' };

export function SendTests() {
  const admin = useAdminApi();
  const [to, setTo] = useState('');
  const [cc, setCc] = useState('TG');
  const [tel, setTel] = useState('');
  const [busy, setBusy] = useState('');
  const [res, setRes] = useState(null);
  const run = async (kind, fn) => {
    setBusy(kind); setRes(null);
    try { setRes({ kind, ...(await fn()) }); } finally { setBusy(''); }
  };
  const msg = r => (r.ok
    ? (r.kind === 'mail'
      ? `E-mail envoyé (${DRIVER_LABEL[r.driver] || r.driver}). Vérifiez la boîte de réception et les courriers indésirables.`
      : `SMS remis à la passerelle (${DRIVER_LABEL[r.driver] || r.driver}).`)
    : r.error);
  return (
    <Card>
      <SectionTitle icon="send">Tester les envois</SectionTitle>
      <div className="flex flex-col gap-3">
        <form className="flex flex-col gap-2 sm:flex-row" onSubmit={e => { e.preventDefault(); if (emailValid(to)) run('mail', () => admin.testMail(to.trim())); }}>
          <label className="sr-only" htmlFor="mt-to">Adresse e-mail de test</label>
          <Input id="mt-to" type="email" placeholder="votre@adresse.tg" value={to} onChange={e => setTo(e.target.value)} className="sm:flex-1" />
          <Button type="submit" variant="secondary" icon="mail" loading={busy === 'mail'} disabled={!!busy || !emailValid(to)}>{busy === 'mail' ? 'Envoi…' : 'Envoyer un e-mail'}</Button>
        </form>
        <form className="flex flex-col gap-2 sm:flex-row" onSubmit={e => { e.preventDefault(); if (phoneValid(cc, tel)) run('sms', () => admin.testSms(toE164(cc, tel))); }}>
          <label className="sr-only" htmlFor="mt-tel">Numéro de test</label>
          <PhoneInput id="mt-tel" cc={cc} value={tel} onCc={setCc} onChange={setTel} className="sm:flex-1" />
          <Button type="submit" variant="secondary" icon="message-square" loading={busy === 'sms'} disabled={!!busy || !phoneValid(cc, tel)}>{busy === 'sms' ? 'Envoi…' : 'Envoyer un SMS'}</Button>
        </form>
        {res && <p role="status" className={cn('text-sm', res.ok ? 'text-emerald-700' : 'text-rose-700')}>{msg(res)}</p>}
      </div>
    </Card>
  );
}
