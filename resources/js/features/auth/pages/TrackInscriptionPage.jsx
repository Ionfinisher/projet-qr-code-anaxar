import { useEffect, useState } from 'react';
import { formatPhone } from '../../../lib/domain.js';
import { useNav, AppLink } from '../../../lib/navigation.jsx';
import { usePortFlow } from '../../../providers/PortFlowProvider.jsx';
import { Card, Field, Input, Button, PageHeader, Icon, buttonClass } from '../../../Components/ui/index.js';
import { InscriptionDetail } from '../../../Components/domain/index.js';
import { useAuthApi } from '../api.js';

/** Suivre sa demande d'inscription (référence + contact) : /inscription/suivi?ref=…&contact=… */
export function TrackInscriptionPage() {
  const { config, data } = usePortFlow();
  const auth = useAuthApi();
  const nav = useNav();
  const initialRef = nav.query.get('ref') || '';
  const initialContact = nav.query.get('contact') || '';
  const [ref, setRef] = useState(initialRef);
  const [contact, setContact] = useState(initialContact.startsWith('+') ? formatPhone(initialContact) : initialContact);
  const [id, setId] = useState(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const ins = id ? data.inscriptions.find(i => i.id === id) : null;
  const examples = config?.demo ? config.demoInscriptions || [] : [];

  const search = async (r = ref, c = contact) => {
    if (!r.trim() || !c.trim()) { setErr('Indiquez la référence et le contact de la demande.'); return; }
    setBusy(true);
    try {
      const found = await auth.findInscription(r, c);
      if (!found) { setErr('Aucune demande ne correspond à cette référence et à ce contact.'); setId(null); return; }
      setErr(''); setId(found.id);
    } finally { setBusy(false); }
  };
  useEffect(() => { if (initialRef && initialContact) search(initialRef, initialContact); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="flex flex-col gap-6">
      <PageHeader eyebrow="Espace public" title="Suivre ma demande d’inscription" subtitle="Consultez l’état de votre demande et complétez-la si l’administration vous le demande." className="mb-0" />
      <Card as="form" onSubmit={ev => { ev.preventDefault(); search(); }}>
        <div className="grid grid-cols-1 items-end gap-4 md:grid-cols-[1fr_1.4fr_auto]">
          <Field id="t-ref" label="Référence"><Input id="t-ref" mono placeholder="INS-XXXXXX" value={ref} onChange={ev => setRef(ev.target.value.toUpperCase())} /></Field>
          <Field id="t-contact" label="E-mail ou téléphone de la demande"><Input id="t-contact" autoComplete="username" value={contact} onChange={ev => setContact(ev.target.value)} /></Field>
          <Button type="submit" icon="search" loading={busy} className="h-11">{busy ? 'Recherche…' : 'Consulter'}</Button>
        </div>
        {err && <p role="alert" className="mt-3 flex items-center gap-1.5 text-sm text-rose-700"><Icon name="triangle-alert" size={15} /> {err}</p>}
        {examples.length > 0 && (
          <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4 text-sm">
            <span className="text-slate-500">Exemples :</span>
            {examples.map(i => (
              <button key={i.id} type="button" onClick={() => { setRef(i.id); setContact(i.contact); search(i.id, i.contact); }}
                className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 hover:border-brand-300 hover:bg-brand-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500">
                <span className="font-mono text-xs font-semibold text-slate-900">{i.id}</span><span className="text-slate-500">{i.name}</span>
              </button>
            ))}
          </div>
        )}
      </Card>
      {ins && (
        <InscriptionDetail ins={ins} actions={
          <div className="flex flex-wrap gap-2">
            {['en_attente', 'a_completer'].includes(ins.status) && (
              <AppLink to="register.update" params={{ id: ins.id }} className={buttonClass()}><Icon name="pencil" size={18} /> {ins.status === 'a_completer' ? 'Compléter ma demande' : 'Mettre à jour ma demande'}</AppLink>
            )}
            {ins.status === 'validee' && <AppLink to="login" query={{ login: ins.email || formatPhone(ins.phone) }} className={buttonClass()}><Icon name="log-in" size={18} /> Se connecter</AppLink>}
            {ins.status === 'rejetee' && <AppLink to="register" className={buttonClass({ variant: 'secondary' })}><Icon name="user-plus" size={18} /> Faire une nouvelle demande</AppLink>}
          </div>
        } />
      )}
    </div>
  );
}
