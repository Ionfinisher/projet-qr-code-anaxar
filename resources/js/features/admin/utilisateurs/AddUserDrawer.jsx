// Ajout d'un compte de l'administration avec mot de passe provisoire.
import { useEffect, useState } from 'react';
import { genPassword, personName } from '../../../lib/domain.js';
import { notify } from '../../../lib/alerts.js';
import { usePortFlow, useCurrentUser } from '../../../providers/PortFlowProvider.jsx';
import { Drawer, Button, Alert } from '../../../Components/ui/index.js';
import { useAdminApi } from '../api.js';
import { userForm, userErrors, userPayload } from './userForm.js';
import { UserFields } from './UserFields.jsx';
import { SecretField } from './SecretField.jsx';

export function AddUserDrawer({ open, onClose }) {
  const { data } = usePortFlow();
  const { isSuper } = useCurrentUser();
  const admin = useAdminApi();
  const [f, setF] = useState(() => userForm(null));
  const [temp, setTemp] = useState(() => genPassword());
  const [tried, setTried] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [done, setDone] = useState(null);
  useEffect(() => { if (open) { setF(userForm(null)); setTemp(genPassword()); setTried(false); setErr(''); setDone(null); } }, [open]);
  const set = p => setF(x => ({ ...x, ...p }));
  const e = tried ? userErrors(f, true) : {};

  const create = async () => {
    setTried(true);
    if (Object.keys(userErrors(f, true)).length) return;
    setBusy(true);
    try {
      const r = await admin.addUser({ ...userPayload(f), tempPassword: temp });
      if (!r.ok) { setErr(r.error); return; }
      setDone(r);
      notify(`Compte de ${personName(r.user)} créé`, 'ok');
    } finally { setBusy(false); }
  };

  return (
    <Drawer open={open} onClose={onClose} title={done ? 'Compte créé' : 'Ajouter un utilisateur'} size="lg"
      footer={done ? <Button onClick={onClose}>Terminer</Button> : <><Button variant="ghost" onClick={onClose}>Annuler</Button><Button icon="user-plus" loading={busy} onClick={create}>{busy ? 'Création…' : 'Créer le compte'}</Button></>}>
      {done ? (
        <>
          <Alert tone="ok" title={`${personName(done.user)} · ${data.profiles.find(p => p.id === done.user.profileId)?.name || ''}`}>
            Un e-mail de création de compte a été envoyé à {done.user.email}. Transmettez le mot de passe provisoire par un autre canal : il devra être remplacé à la première connexion.
          </Alert>
          <SecretField id="temp-done" label="Mot de passe provisoire" value={done.temp} />
        </>
      ) : (
        <form className="flex flex-col gap-5" onSubmit={ev => { ev.preventDefault(); create(); }} noValidate>
          <p className="text-sm text-slate-500">Comptes de l’administration (bureau des rendez-vous, guérite, supervision). Les comptes transporteurs sont créés par la validation d’une demande d’inscription.</p>
          <UserFields f={f} set={set} e={e} profiles={data.profiles} internal actorIsSuper={isSuper} />
          <SecretField id="uf-temp" label="Mot de passe provisoire" hint="Généré aléatoirement · haché sur le serveur · à changer à la première connexion." value={temp}
            action={<Button variant="secondary" icon="refresh-cw" onClick={() => setTemp(genPassword())}>Régénérer</Button>} />
          {err && <Alert tone="bad" role="alert">{err}</Alert>}
          <button type="submit" hidden />
        </form>
      )}
    </Drawer>
  );
}
