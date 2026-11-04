// Fiche utilisateur : consultation, modification, activation, mot de passe provisoire, suppression.
import { useState } from 'react';
import { ACCOUNT_KINDS, accountName, personName, formatPhone, fmtDateTime } from '../../../lib/domain.js';
import { confirmAction, notify, showSecret } from '../../../lib/alerts.js';
import { usePortFlow, useCurrentUser } from '../../../providers/PortFlowProvider.jsx';
import { Drawer, Button, Badge, Avatar, KeyValue, Alert } from '../../../Components/ui/index.js';
import { useAdminApi } from '../api.js';
import { profileOfUser } from '../selectors.js';
import { userForm, userErrors, userPayload } from './userForm.js';
import { UserFields } from './UserFields.jsx';
import { SecretField } from './SecretField.jsx';

export function UserDrawer({ u, canManage, onClose }) {
  const { data } = usePortFlow();
  const { isSuper } = useCurrentUser();
  const admin = useAdminApi();
  const [mode, setMode] = useState('view');
  const [f, setF] = useState(() => userForm(u));
  const [tried, setTried] = useState(false);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [temp, setTemp] = useState(null);
  const set = p => setF(x => ({ ...x, ...p }));
  const internal = u.kind === 'interne';
  const prof = profileOfUser(data, u);
  const creator = data.users.find(x => x.id === u.createdBy);
  const e = tried ? userErrors(f, internal) : {};
  const name = accountName(u);
  const act = async fn => { setBusy(true); try { return await fn(); } finally { setBusy(false); } };

  const save = () => act(async () => {
    setTried(true);
    if (Object.keys(userErrors(f, internal)).length) return;
    const r = await admin.updateUser(u.id, userPayload(f));
    if (!r.ok) { setErr(r.error); return; }
    notify('Utilisateur modifié', 'ok'); setMode('view'); setErr('');
  });
  const toggle = async () => {
    if (u.active && !(await confirmAction({
      title: `Désactiver ${name} ?`, text: 'Le compte ne pourra plus se connecter. Ses données et son historique sont conservés ; il peut être réactivé à tout moment.',
      confirmText: 'Désactiver', tone: 'danger', icon: 'warning',
    }))) return;
    act(async () => {
      const r = await admin.setUserActive(u.id, !u.active);
      if (!r.ok) { setErr(r.error); return; }
      notify(u.active ? `${name} désactivé` : `${name} activé`, 'ok'); setErr('');
    });
  };
  const del = async () => {
    if (!(await confirmAction({
      title: `Supprimer ${name} ?`, text: 'Le compte et ses accès sont supprimés. Pour garder la traçabilité, préférez la désactivation.',
      confirmText: 'Supprimer définitivement', tone: 'danger', icon: 'warning',
    }))) return;
    act(async () => {
      const r = await admin.deleteUser(u.id);
      if (!r.ok) { setErr(r.error); return; }
      notify(`${name} supprimé`, 'neutral'); onClose();
    });
  };
  const resetPwd = async () => {
    if (!(await confirmAction({
      title: `Réinitialiser le mot de passe de ${name} ?`,
      text: 'Un mot de passe provisoire est généré : il remplace l’actuel et devra être changé à la prochaine connexion. Transmettez-le par un canal sûr.',
      confirmText: 'Générer le mot de passe', icon: 'warning',
    }))) return;
    act(async () => {
      const r = await admin.resetUserPassword(u.id);
      if (!r.ok) { setErr(r.error); return; }
      setTemp(r.temp); setErr('');
      showSecret({ title: 'Mot de passe provisoire', text: `Compte de ${name} · affiché une seule fois : copiez-le et transmettez-le par un canal sûr.`, value: r.temp, label: 'Mot de passe' });
    });
  };

  const footer = !canManage ? null : mode === 'edit'
    ? <><Button variant="ghost" onClick={() => { setMode('view'); setF(userForm(u)); setTried(false); setErr(''); }}>Annuler</Button><Button icon="check" loading={busy} onClick={save}>Enregistrer</Button></>
    : (
      <>
        <Button variant="danger-outline" icon="trash-2" disabled={busy} onClick={del}>Supprimer</Button>
        <Button variant="secondary" icon="key-round" disabled={busy} onClick={resetPwd}>Mot de passe</Button>
        <Button variant="secondary" icon={u.active ? 'power' : 'lock-open'} disabled={busy} onClick={toggle}>{u.active ? 'Désactiver' : 'Activer'}</Button>
        <Button icon="pencil" onClick={() => { setErr(''); setMode('edit'); }}>Modifier</Button>
      </>
    );

  return (
    <Drawer open onClose={onClose} title={name} description={internal ? 'Compte de l’administration' : ACCOUNT_KINDS[u.acct]?.label} footer={footer}>
      <div className="flex items-center gap-3">
        <Avatar name={name} size={48} />
        <div className="min-w-0">
          <p className="truncate font-semibold text-slate-900">{name}</p>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {u.active ? <Badge tone="ok" icon="check">Actif</Badge> : <Badge icon="power">Désactivé</Badge>}
            <Badge tone={internal ? 'info' : 'neutral'} icon={internal ? 'shield-user' : 'truck'}>{prof?.name}</Badge>
          </div>
        </div>
      </div>
      {mode === 'edit' ? (
        <>
          {!internal && <p className="text-[13px] text-slate-500">Compte transporteur : l’identité provient de la demande d’inscription ; seuls les contacts sont modifiables.</p>}
          <UserFields f={f} set={set} e={e} profiles={data.profiles} internal={internal} actorIsSuper={isSuper} />
        </>
      ) : (
        <KeyValue items={[
          internal && ['Nom', personName(u)],
          internal && u.title && ['Fonction', u.title],
          !internal && ['Type', ACCOUNT_KINDS[u.acct]?.label],
          !internal && u.org && ['NIF · RCCM', <span className="font-mono">{u.org.nif} · {u.org.rccm}</span>],
          u.email && ['E-mail', u.email],
          u.phone && ['Téléphone', <span className="tabular-nums">{formatPhone(u.phone)}</span>],
          ['Profil', prof?.name],
          ['Créé le', `${fmtDateTime(u.createdAt)}${creator ? ` · par ${personName(creator)}` : ''}`],
          u.inscriptionId && ['Inscription', <span className="font-mono">{u.inscriptionId}</span>],
          ['Dernière connexion', u.lastLoginAt ? fmtDateTime(u.lastLoginAt) : 'Jamais'],
          u.mustChange && ['Mot de passe', 'Provisoire : à changer à la première connexion'],
        ]} />
      )}
      {temp && <SecretField id="temp-reset" label="Mot de passe provisoire" hint="Affiché une seule fois : copiez-le et transmettez-le par un canal sûr." value={temp} />}
      {err && <Alert tone="bad" role="alert">{err}</Alert>}
    </Drawer>
  );
}
