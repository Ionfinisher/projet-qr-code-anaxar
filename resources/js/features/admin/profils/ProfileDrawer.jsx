// Profil : consultation, création, modification, suppression.
import { useState } from 'react';
import { accountName } from '../../../lib/domain.js';
import { confirmAction, notify } from '../../../lib/alerts.js';
import { usePortFlow } from '../../../providers/PortFlowProvider.jsx';
import { Drawer, Button, Badge, Field, Input, Textarea, Segmented, Alert, Avatar, fieldProps } from '../../../components/ui/index.js';
import { useAdminApi } from '../api.js';
import { PermMatrix } from './PermMatrix.jsx';

export function ProfileDrawer({ p, canManage, onClose }) {
  const { data } = usePortFlow();
  const admin = useAdminApi();
  const creating = !p;
  const [mode, setMode] = useState(creating ? 'edit' : 'view');
  const [f, setF] = useState(() => ({ name: p?.name || '', description: p?.description || '', kind: p?.kind || 'interne', perms: p ? [...p.perms] : ['demandes.consulter'] }));
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const users = p ? data.users.filter(u => u.profileId === p.id) : [];
  const set = x => setF(y => ({ ...y, ...x }));
  const locked = !!p?.locked;

  const save = async () => {
    setBusy(true);
    try {
      const r = creating ? await admin.createProfile(f) : await admin.updateProfile(p.id, f);
      if (!r.ok) { setErr(r.error); return; }
      notify(creating ? `Profil « ${f.name.trim()} » créé` : 'Profil modifié', 'ok');
      if (creating) onClose(); else { setMode('view'); setErr(''); }
    } finally { setBusy(false); }
  };
  const del = async () => {
    if (!(await confirmAction({ title: `Supprimer le profil « ${p.name} » ?`, text: 'Cette action est définitive.', confirmText: 'Supprimer le profil', tone: 'danger', icon: 'warning' }))) return;
    setBusy(true);
    try {
      const r = await admin.deleteProfile(p.id);
      if (!r.ok) { setErr(r.error); return; }
      notify(`Profil « ${p.name} » supprimé`, 'neutral'); onClose();
    } finally { setBusy(false); }
  };

  const footer = !canManage ? null : mode === 'edit'
    ? <><Button variant="ghost" onClick={() => (creating ? onClose() : (setMode('view'), setErr('')))}>Annuler</Button><Button icon="check" loading={busy} onClick={save}>{creating ? 'Créer le profil' : 'Enregistrer'}</Button></>
    : (!p.system || !locked) && (
      <>
        {!p.system && <Button variant="danger-outline" icon="trash-2" disabled={busy} onClick={del}>Supprimer</Button>}
        {!locked && <Button icon="pencil" onClick={() => { setErr(''); setMode('edit'); }}>Modifier</Button>}
      </>
    );

  return (
    <Drawer open onClose={onClose} title={creating ? 'Nouveau profil' : p.name} description={creating ? 'Habilitations attribuées aux utilisateurs de ce profil.' : undefined} size="lg" footer={footer || null}>
      {mode === 'edit' ? (
        <>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Field id="pf-name" label="Nom du profil" required hint={p?.system ? 'Nom d’un profil système : non modifiable.' : undefined}>
              <Input disabled={!!p?.system} {...fieldProps('pf-name', null, p?.system ? 'x' : null)} value={f.name} onChange={e => set({ name: e.target.value })} />
            </Field>
            <Field id="pf-kind" label="Type">
              <Segmented label="Type de profil" value={f.kind} onChange={v => creating && set({ kind: v, perms: v === 'externe' ? ['transporteur.espace'] : ['demandes.consulter'] })}
                options={[{ value: 'interne', label: 'Interne (administration)', icon: 'shield-user' }, { value: 'externe', label: 'Externe', icon: 'truck' }]} />
            </Field>
          </div>
          <Field id="pf-desc" label="Description" optional><Textarea rows={3} {...fieldProps('pf-desc')} value={f.description} onChange={e => set({ description: e.target.value })} /></Field>
          <section>
            <p className="mb-2 text-sm font-semibold text-slate-800">Habilitations</p>
            <PermMatrix kind={f.kind} value={f.perms} onChange={perms => set({ perms })} />
          </section>
        </>
      ) : (
        <>
          <div className="flex flex-wrap gap-1.5">
            <Badge tone={p.kind === 'externe' ? 'neutral' : 'info'}>{p.kind === 'externe' ? 'Profil externe' : 'Profil interne'}</Badge>
            {p.system && <Badge icon="lock">Profil système</Badge>}
            {locked && <Badge tone="warn" icon="key-round">Non modifiable</Badge>}
          </div>
          {p.description && <p className="text-sm text-slate-700">{p.description}</p>}
          <section>
            <p className="mb-2 text-sm font-semibold text-slate-800">Habilitations</p>
            <PermMatrix kind={p.kind} value={p.perms} onChange={() => {}} disabled />
          </section>
          <section>
            <p className="mb-2 text-sm font-semibold text-slate-800">Utilisateurs · {users.length}</p>
            {users.length === 0 ? <p className="text-sm text-slate-500">Aucun utilisateur n’a ce profil.</p> : (
              <div className="flex flex-wrap gap-1.5">
                {users.slice(0, 16).map(u => (
                  <span key={u.id} className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white py-1 pl-1 pr-3 text-[13px] text-slate-700">
                    <Avatar name={accountName(u)} size={22} /> {accountName(u)}
                  </span>
                ))}
                {users.length > 16 && <span className="self-center text-sm text-slate-500">+ {users.length - 16}</span>}
              </div>
            )}
          </section>
        </>
      )}
      {err && <Alert tone="bad" role="alert">{err}</Alert>}
    </Drawer>
  );
}
