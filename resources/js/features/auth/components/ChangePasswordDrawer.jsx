import { useEffect, useState } from 'react';
import { passwordOk } from '../../../lib/domain.js';
import { notify } from '../../../lib/alerts.js';
import { Drawer, Field, PasswordInput, PasswordRules, Button, Alert } from '../../../Components/ui/index.js';
import { useAuthApi } from '../api.js';

/** Changer son mot de passe (compte connecté). */
export function ChangePasswordDrawer({ open, onClose }) {
  const auth = useAuthApi();
  const [cur, setCur] = useState('');
  const [p1, setP1] = useState('');
  const [p2, setP2] = useState('');
  const [tried, setTried] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  useEffect(() => { if (open) { setCur(''); setP1(''); setP2(''); setTried(false); setErr(''); } }, [open]);
  const e1 = tried && !passwordOk(p1) ? 'Le mot de passe ne respecte pas les règles.' : null;
  const e2 = tried && p2 !== p1 ? 'Les deux mots de passe ne correspondent pas.' : null;
  const submit = async () => {
    setTried(true);
    if (!cur) { setErr('Indiquez votre mot de passe actuel.'); return; }
    if (!passwordOk(p1) || p1 !== p2) return;
    setBusy(true); setErr('');
    try {
      const r = await auth.changePassword(p1, cur);
      if (!r.ok) { setErr(r.error); return; }
      notify('Mot de passe modifié', 'ok');
      onClose();
    } finally { setBusy(false); }
  };
  return (
    <Drawer open={open} onClose={onClose} title="Changer mon mot de passe" size="sm"
      footer={<><Button variant="ghost" onClick={onClose}>Annuler</Button><Button icon="lock-keyhole" loading={busy} onClick={submit}>{busy ? 'Enregistrement…' : 'Enregistrer'}</Button></>}>
      <form className="flex flex-col gap-4" onSubmit={ev => { ev.preventDefault(); submit(); }} noValidate>
        <Field id="cpw-cur" label="Mot de passe actuel" required><PasswordInput id="cpw-cur" value={cur} onChange={setCur} autoComplete="current-password" /></Field>
        <Field id="cpw-1" label="Nouveau mot de passe" required error={e1}><PasswordInput id="cpw-1" value={p1} onChange={setP1} autoComplete="new-password" error={e1} /></Field>
        <Field id="cpw-2" label="Confirmation" required error={e2}><PasswordInput id="cpw-2" value={p2} onChange={setP2} autoComplete="new-password" error={e2} /></Field>
        <PasswordRules value={p1} />
        {err && <Alert tone="bad" role="alert">{err}</Alert>}
        <button type="submit" hidden />
      </form>
    </Drawer>
  );
}
