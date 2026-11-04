import { useEffect, useRef, useState } from 'react';
import { INS_STATUS } from '../../../lib/domain.js';
import { notify } from '../../../lib/alerts.js';
import { useNav, AppLink, hrefOf } from '../../../lib/navigation.jsx';
import { HOME_OF_SPACE } from '../../../routes/routes.js';
import { usePortFlow, useCurrentUser } from '../../../providers/PortFlowProvider.jsx';
import { Field, Input, PasswordInput, Button, Alert, buttonClass, Icon } from '../../../Components/ui/index.js';
import { DemoAccounts } from '../components/DemoAccounts.jsx';
import { useAuthApi } from '../api.js';

/** Redirection après connexion : ?next=… (chemin interne uniquement) ou accueil de l'espace. */
function safeNext(next) {
  return next && next.startsWith('/') && !next.startsWith('//') && !next.includes('://') ? next : null;
}

export function LoginPage() {
  const { config } = usePortFlow();
  const { user, space } = useCurrentUser();
  const nav = useNav();
  const auth = useAuthApi();
  const [ident, setIdent] = useState(nav.query.get('login') || '');
  const [pwd, setPwd] = useState('');
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState(null);
  const [lockUntil, setLockUntil] = useState(0);
  const [, tick] = useState(0);
  const idRef = useRef(null);
  const wait = Math.max(0, lockUntil - Date.now());
  const demoLogins = (config?.demoLogins || []).filter(d => d.app === 'plateforme');

  useEffect(() => { idRef.current?.focus({ preventScroll: true }); }, []);
  useEffect(() => {
    if (wait <= 0) return undefined;
    const t = setInterval(() => tick(x => x + 1), 500);
    return () => clearInterval(t);
  }, [wait > 0]); // eslint-disable-line react-hooks/exhaustive-deps

  // Déjà connecté (ou connexion réussie) : direction l'espace de l'utilisateur
  useEffect(() => {
    if (!user) return;
    const next = safeNext(nav.query.get('next'));
    if (next) nav.go(next, undefined, { replace: true });
    else if (HOME_OF_SPACE[space]) nav.go(HOME_OF_SPACE[space], undefined, { replace: true });
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const submit = async (i = ident, p = pwd) => {
    if (!i.trim() || !p) { setRes({ ok: false, reason: 'empty' }); return; }
    setBusy(true);
    try {
      const r = await auth.login(i, p);
      setRes(r);
      if (r.reason === 'locked') setLockUntil(Date.now() + (r.wait || 60000));
      if (r.ok) notify('Connexion réussie', 'ok');
    } finally { setBusy(false); }
  };
  const demo = d => { setIdent(d.id); setPwd(config.demoPassword); submit(d.id, config.demoPassword); };

  let alert = null;
  if (res && !res.ok) {
    const map = {
      empty: ['Renseignez votre identifiant et votre mot de passe.', 'bad'],
      invalid: [`Identifiant ou mot de passe incorrect. ${res.left} essai${res.left > 1 ? 's' : ''} avant un blocage temporaire.`, 'bad'],
      locked: [`Trop d’essais : connexion bloquée pendant ${Math.ceil(wait / 1000)} s.`, 'bad'],
      inactive: ['Ce compte est désactivé. Contactez l’administration du port.', 'bad'],
      gate: ['Ce compte est réservé à l’application Guérite.', 'warn'],
      error: [res.error || 'Connexion impossible.', 'bad'],
      pending: [res.ins ? `Votre demande d’inscription ${res.ins.id} est ${INS_STATUS[res.ins.status].short.toLowerCase()}. Vous pourrez vous connecter dès sa validation.` : '', 'warn'],
    };
    const [text, tone] = map[res.reason] || ['Connexion impossible.', 'bad'];
    alert = (
      <Alert tone={tone} role="alert"
        action={res.reason === 'pending' ? (
          <AppLink to="track" query={{ ref: res.ins.id, contact: ident }} className={buttonClass({ variant: 'secondary', size: 'sm' })}><Icon name="file-search" size={16} /> Suivre</AppLink>
        ) : res.reason === 'gate' ? (
          <AppLink to="gate.controle" className={buttonClass({ variant: 'secondary', size: 'sm' })}><Icon name="scan-line" size={16} /> Guérite</AppLink>
        ) : null}>
        {res.reason === 'locked' && wait <= 0 ? 'Vous pouvez réessayer.' : text}
      </Alert>
    );
  }

  return (
    <div className="flex flex-col gap-7">
      <div>
        <h1 className="text-[28px] font-bold tracking-tight text-slate-900">Se connecter</h1>
        <p className="mt-1 text-[15px] text-slate-500">Transporteurs, transitaires et administration du port.</p>
      </div>
      <form className="flex flex-col gap-4" onSubmit={e => { e.preventDefault(); submit(); }} noValidate>
        <Field id="login-id" label="E-mail ou téléphone">
          <Input ref={idRef} id="login-id" autoComplete="username" inputMode="email" placeholder="exploitation@societe.tg ou 90 11 44 77"
            value={ident} onChange={e => setIdent(e.target.value)} />
        </Field>
        <Field id="login-pwd" label="Mot de passe" labelAside={
          <AppLink to="forgot" query={{ login: ident || undefined }} className="text-sm font-medium text-brand-700 hover:underline">Mot de passe oublié ?</AppLink>
        }>
          <PasswordInput id="login-pwd" value={pwd} onChange={setPwd} autoComplete="current-password" />
        </Field>
        {alert}
        <Button type="submit" size="lg" block icon="log-in" loading={busy} disabled={wait > 0}>{busy ? 'Vérification…' : 'Se connecter'}</Button>
      </form>
      <div className="flex flex-col gap-2 border-t border-slate-100 pt-6">
        <AppLink to="register" className={buttonClass({ variant: 'secondary', block: true })}><Icon name="user-plus" size={18} /> Créer un compte transporteur</AppLink>
        <AppLink to="track" className={buttonClass({ variant: 'ghost', block: true })}><Icon name="file-search" size={18} /> Suivre ma demande d’inscription</AppLink>
      </div>
      {config?.demo && (
        <DemoAccounts accounts={demoLogins} password={config.demoPassword} disabled={busy} onPick={demo} gateHref={hrefOf('gate.controle')} />
      )}
    </div>
  );
}
