import { useEffect, useRef, useState } from 'react';
import { usePortFlow } from '../../../providers/PortFlowProvider.jsx';
import { notify } from '../../../lib/alerts.js';
import { Field, Input, PasswordInput, Button, Alert, Icon } from '../../../Components/ui/index.js';
import { Logo, DemoBanner } from '../../../Components/domain/index.js';
import { TopBar, Spacer, SkipLink } from '../../../layouts/parts.jsx';
import { useAuthApi } from '../../auth/api.js';
import { Clock } from '../components/Clock.jsx';

/** Ouverture de session d'un agent de guérite (compte nominatif). */
export function GateLoginPage() {
  const { config } = usePortFlow();
  const auth = useAuthApi();
  const demoLogins = (config?.demoLogins || []).filter(d => d.app === 'guerite');
  const [ident, setIdent] = useState('');
  const [pwd, setPwd] = useState('');
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState(null);
  const [lockUntil, setLockUntil] = useState(0);
  const [, tick] = useState(0);
  const idRef = useRef(null);
  const wait = Math.max(0, lockUntil - Date.now());
  useEffect(() => { idRef.current?.focus({ preventScroll: true }); }, []);
  useEffect(() => {
    if (wait <= 0) return undefined;
    const t = setInterval(() => tick(x => x + 1), 500);
    return () => clearInterval(t);
  }, [wait > 0]); // eslint-disable-line react-hooks/exhaustive-deps

  const submit = async (i = ident, p = pwd) => {
    if (!i.trim() || !p) { setRes({ ok: false, reason: 'empty' }); return; }
    setBusy(true);
    try {
      const r = await auth.login(i, p);
      setRes(r);
      if (r.reason === 'locked') setLockUntil(Date.now() + (r.wait || 60000));
      if (r.ok) notify('Bonne vacation', 'ok');
    } finally { setBusy(false); }
  };
  const map = {
    empty: 'Renseignez votre identifiant et votre mot de passe.',
    invalid: `Identifiant ou mot de passe incorrect.${res?.left != null ? ` ${res.left} essai${res.left > 1 ? 's' : ''} avant un blocage temporaire.` : ''}`,
    locked: wait > 0 ? `Trop d’essais : connexion bloquée pendant ${Math.ceil(wait / 1000)} s.` : 'Vous pouvez réessayer.',
    inactive: 'Ce compte est désactivé. Contactez le chef de guérite.',
    noGate: 'Ce compte n’a pas accès à l’application Guérite.',
    pending: 'Compte en attente de validation.',
    error: res?.error || 'Connexion impossible.',
  };

  return (
    <div lang="fr" className="flex min-h-screen flex-col bg-slate-100 text-slate-900">
      <SkipLink />
      <TopBar dark>
        <Logo sub="Guérite · porte principale" dark />
        <Spacer />
        <Clock />
      </TopBar>
      <main id="pf-main" tabIndex={-1} className="flex flex-1 items-start justify-center px-4 py-8 focus:outline-none sm:py-12">
        <form noValidate onSubmit={e => { e.preventDefault(); submit(); }}
          className="flex w-full max-w-md flex-col gap-5 rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_12px_32px_rgba(15,23,42,0.08)] sm:p-8">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-brand-700">Ouverture de session</p>
            <h1 className="mt-1.5 text-2xl font-bold tracking-tight text-slate-900">Agent de guérite</h1>
            <p className="mt-1 text-sm text-slate-500">Connectez-vous avec votre compte nominatif : chaque contrôle est inscrit au journal à votre nom.</p>
          </div>
          <Field id="gl-id" label="E-mail ou téléphone">
            <Input ref={idRef} id="gl-id" autoComplete="username" className="h-12 text-base" value={ident} onChange={e => setIdent(e.target.value)} />
          </Field>
          <Field id="gl-pwd" label="Mot de passe">
            <PasswordInput id="gl-pwd" value={pwd} onChange={setPwd} autoComplete="current-password" />
          </Field>
          {res && !res.ok && <Alert tone="bad" role="alert">{map[res.reason] || map.error}</Alert>}
          <Button type="submit" size="lg" block icon="log-in" loading={busy} disabled={wait > 0}>{busy ? 'Vérification…' : 'Se connecter'}</Button>
          {config?.demo && demoLogins.length > 0 && (
            <section aria-labelledby="gl-demo" className="rounded-2xl border border-dashed border-brand-300 bg-brand-50/50 p-4">
              <h3 id="gl-demo" className="flex items-center gap-2 text-sm font-semibold text-slate-900"><Icon name="sparkles" size={15} className="text-brand-600" /> Comptes de démonstration</h3>
              <p className="mt-1 text-[13px] text-slate-600">Mot de passe commun : <span className="font-mono font-semibold text-slate-900">{config.demoPassword}</span></p>
              <div className="mt-3 flex flex-col gap-2">
                {demoLogins.map(d => (
                  <button key={d.id} type="button" disabled={busy} onClick={() => { setIdent(d.id); setPwd(config.demoPassword); submit(d.id, config.demoPassword); }}
                    className="flex w-full cursor-pointer items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-3 text-left transition-colors hover:border-brand-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 disabled:cursor-not-allowed disabled:opacity-60">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-900 text-white"><Icon name={d.icon} size={18} /></span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-slate-900">{d.label}</span>
                      <span className="block break-words text-xs text-slate-500">{d.who} · {d.id}</span>
                    </span>
                    <Icon name="arrow-right" size={16} className="text-slate-400" />
                  </button>
                ))}
              </div>
            </section>
          )}
        </form>
      </main>
      <DemoBanner />
    </div>
  );
}
