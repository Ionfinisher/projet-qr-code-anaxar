// Mot de passe oublié, réinitialisation par lien, et changement imposé à la première connexion.
import { useState } from 'react';
import { passwordOk } from '../../../lib/domain.js';
import { notify } from '../../../lib/alerts.js';
import { useNav, AppLink } from '../../../lib/navigation.jsx';
import { useCurrentUser } from '../../../providers/PortFlowProvider.jsx';
import { Card, Field, Input, PasswordInput, PasswordRules, Button, Alert, Icon, buttonClass } from '../../../Components/ui/index.js';
import { Logo } from '../../../Components/domain/index.js';
import { TopBar, Spacer } from '../../../layouts/parts.jsx';
import { useAuthApi } from '../api.js';

function PasswordForm({ submitLabel, busyLabel, busy, error, onSubmit, idPrefix }) {
  const [p1, setP1] = useState('');
  const [p2, setP2] = useState('');
  const [tried, setTried] = useState(false);
  const e1 = tried && !passwordOk(p1) ? 'Le mot de passe ne respecte pas les règles.' : null;
  const e2 = tried && p2 !== p1 ? 'Les deux mots de passe ne correspondent pas.' : null;
  const submit = ev => {
    ev.preventDefault();
    setTried(true);
    if (passwordOk(p1) && p1 === p2) onSubmit(p1);
  };
  return (
    <form className="flex flex-col gap-4" onSubmit={submit} noValidate>
      <Field id={`${idPrefix}-1`} label="Nouveau mot de passe" required error={e1}><PasswordInput id={`${idPrefix}-1`} value={p1} onChange={setP1} autoComplete="new-password" error={e1} /></Field>
      <Field id={`${idPrefix}-2`} label="Confirmation" required error={e2}><PasswordInput id={`${idPrefix}-2`} value={p2} onChange={setP2} autoComplete="new-password" error={e2} /></Field>
      <PasswordRules value={p1} />
      {error && <Alert tone="bad" role="alert">{error}</Alert>}
      <Button type="submit" size="lg" block icon="lock-keyhole" loading={busy}>{busy ? busyLabel : submitLabel}</Button>
    </form>
  );
}

/** /mot-de-passe/oublie?login=… */
export function ForgotPasswordPage() {
  const nav = useNav();
  const auth = useAuthApi();
  const [ident, setIdent] = useState(nav.query.get('login') || '');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState('');
  const submit = async ev => {
    ev.preventDefault();
    if (!ident.trim()) { setErr('Indiquez votre e-mail ou votre téléphone.'); return; }
    setBusy(true); setErr('');
    try {
      const r = await auth.forgotPassword(ident.trim());
      if (!r.ok) { setErr(r.error); return; }
      setSent(true);
    } finally { setBusy(false); }
  };
  return (
    <Card className="mx-auto flex w-full max-w-md flex-col gap-5">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-brand-700">Espace public</p>
        <h1 className="mt-1.5 text-2xl font-bold tracking-tight text-slate-900">Mot de passe oublié</h1>
        <p className="mt-1 text-sm text-slate-500">Recevez un lien pour choisir un nouveau mot de passe (valable 1 heure), par e-mail, ou par SMS si votre compte n’a pas d’e-mail.</p>
      </div>
      {sent ? (
        <Alert tone="ok" icon="mail-check" role="status" title="Demande enregistrée">
          Si un compte actif correspond à « {ident} », un lien de réinitialisation vient d’être envoyé. Pensez à vérifier les courriers indésirables.
        </Alert>
      ) : (
        <form className="flex flex-col gap-4" onSubmit={submit} noValidate>
          <Field id="fg-id" label="E-mail ou téléphone" error={err}>
            <Input id="fg-id" autoComplete="username" aria-invalid={err ? 'true' : undefined} aria-describedby={err ? 'fg-id-msg' : undefined} value={ident} onChange={e => setIdent(e.target.value)} />
          </Field>
          <Button type="submit" size="lg" block icon="send" loading={busy}>{busy ? 'Envoi…' : 'Recevoir le lien'}</Button>
        </form>
      )}
      <AppLink to="login" query={{ login: ident || undefined }} className={buttonClass({ variant: 'ghost', block: true })}><Icon name="arrow-left" size={18} /> Retour à la connexion</AppLink>
    </Card>
  );
}

/** /mot-de-passe/nouveau?token=… (lien reçu par e-mail ou SMS) */
export function ResetPasswordPage() {
  const nav = useNav();
  const auth = useAuthApi();
  const token = nav.query.get('token') || '';
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [done, setDone] = useState(null);
  const submit = async next => {
    setBusy(true); setErr('');
    try {
      const r = await auth.resetPassword(token, next);
      if (!r.ok) { setErr(r.error); return; }
      setDone(r.login || '');
      // Retire le jeton de la barre d'adresse (sans recharger la page)
      try { window.history.replaceState(window.history.state, '', window.location.pathname); } catch { /* sans effet */ }
    } finally { setBusy(false); }
  };
  return (
    <Card className="mx-auto flex w-full max-w-md flex-col gap-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Nouveau mot de passe</h1>
        <p className="mt-1 text-sm text-slate-500">Choisissez le mot de passe de votre compte PortFlow.</p>
      </div>
      {done !== null ? (
        <>
          <Alert tone="ok" role="status" title="Mot de passe enregistré">Connectez-vous avec votre nouveau mot de passe.</Alert>
          <AppLink to="login" query={{ login: done || undefined }} className={buttonClass({ size: 'lg', block: true })}><Icon name="log-in" size={20} /> Se connecter</AppLink>
        </>
      ) : !token ? (
        <Alert tone="warn" title="Lien incomplet">Ouvrez le lien reçu par e-mail ou SMS, ou demandez-en un nouveau.</Alert>
      ) : (
        <PasswordForm idPrefix="rs" submitLabel="Enregistrer" busyLabel="Enregistrement…" busy={busy} error={err} onSubmit={submit} />
      )}
    </Card>
  );
}

/** Première connexion avec un mot de passe provisoire : changement obligatoire. */
export function ForcePasswordChangePage({ dark = false }) {
  const { user } = useCurrentUser();
  const auth = useAuthApi();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const submit = async next => {
    setBusy(true); setErr('');
    try {
      const r = await auth.changePassword(next);
      if (!r.ok) { setErr(r.error); return; }
      notify('Mot de passe enregistré', 'ok');
    } finally { setBusy(false); }
  };
  return (
    <div lang="fr" className="min-h-screen bg-slate-50">
      <TopBar dark={dark}>
        <Logo sub="Première connexion" dark={dark} />
        <Spacer />
        <Button variant={dark ? 'dark' : 'ghost'} size="sm" icon="log-out" onClick={() => auth.logout()}>Se déconnecter</Button>
      </TopBar>
      <main id="pf-main" className="px-4 py-10">
        <Card className="mx-auto flex w-full max-w-md flex-col gap-5">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Choisissez votre mot de passe</h1>
            <p className="mt-1 text-sm text-slate-500">Bonjour {user?.first}, votre compte a été créé avec un mot de passe provisoire. Remplacez-le pour continuer.</p>
          </div>
          <PasswordForm idPrefix="cp" submitLabel="Enregistrer et continuer" busyLabel="Sécurisation…" busy={busy} error={err} onSubmit={submit} />
        </Card>
      </main>
    </div>
  );
}
