// Décision sur une demande d'inscription : valider (création du compte), demander des compléments, rejeter.
import { useState } from 'react';
import { INS_REJECT, INS_COMPLEMENTS, insName, formatPhone } from '../../../lib/domain.js';
import { confirmAction, notify } from '../../../lib/alerts.js';
import { usePortFlow, useCurrentUser } from '../../../providers/PortFlowProvider.jsx';
import { Button } from '../../../components/ui/index.js';
import { SentMessages } from '../../../components/domain/index.js';
import { DecisionBar, ReadOnlyNote } from '../components/Parts.jsx';
import { rejectWithMotif, requestComplements, introHtml, kvHtml } from '../components/dialogs.js';
import { useAdminApi } from '../api.js';

export function InscriptionDecision({ ins }) {
  const { data } = usePortFlow();
  const { can } = useCurrentUser();
  const admin = useAdminApi();
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(null);
  const open = ['en_attente', 'a_completer'].includes(ins.status);
  const canAct = can('inscriptions.traiter') && open;
  const history = data.messages.filter(m => m.insId === ins.id).slice(0, 4);

  const run = async (decision, opts) => {
    setBusy(true);
    try {
      const r = await admin.processInscription(ins.id, decision, opts);
      if (!r.ok) { notify(r.error, 'bad'); return; }
      setSent(r.msgs || []);
      notify(decision === 'validee' ? `Compte de ${insName(ins)} créé et activé` : decision === 'a_completer' ? 'Demande de compléments envoyée' : 'Demande rejetée', decision === 'rejetee' ? 'neutral' : 'ok');
    } finally { setBusy(false); }
  };
  const validate = async () => {
    const ok = await confirmAction({
      title: `Valider ${ins.id}`,
      html: introHtml(`Le compte transporteur de **${insName(ins)}** sera créé et activé.`) + kvHtml([
        ['Profil', 'Transporteur'],
        ['Identifiant', ins.email || formatPhone(ins.phone)],
        ['Mot de passe', 'Celui choisi à l’inscription (déjà haché)'],
        ['Notifications', [ins.email && 'e-mail', 'SMS'].filter(Boolean).join(' + ')],
      ]),
      confirmText: 'Valider et notifier', tone: 'ok',
    });
    if (ok) run('validee');
  };
  const complete = async () => {
    const comment = await requestComplements({ title: `Compléments · ${ins.id}`, suggestions: INS_COMPLEMENTS });
    if (comment) run('a_completer', { comment });
  };
  const reject = async () => {
    const res = await rejectWithMotif({ title: `Rejeter ${ins.id}`, motifs: INS_REJECT });
    if (res) run('rejetee', { motif: res.motif, comment: res.comment });
  };

  return (
    <>
      {canAct && (
        <DecisionBar>
          <Button variant="ok" icon="user-check" loading={busy} onClick={validate}>Valider et créer le compte</Button>
          <Button variant="secondary" icon="file-up" disabled={busy} onClick={complete}>Demander des compléments</Button>
          <Button variant="danger-outline" icon="x" disabled={busy} onClick={reject}>Rejeter</Button>
        </DecisionBar>
      )}
      {!can('inscriptions.traiter') && open && <ReadOnlyNote>Votre profil permet de consulter les inscriptions, pas de les traiter.</ReadOnlyNote>}
      <SentMessages messages={sent || (history.length ? history : null)} title={sent ? 'Messages envoyés au demandeur' : 'Derniers messages au demandeur'} />
    </>
  );
}
