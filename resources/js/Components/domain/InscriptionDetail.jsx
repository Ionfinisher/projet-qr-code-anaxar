// Demande d'inscription (lecture) : partagée entre le suivi public et l'administration.
import { INS_STATUS, INS_DOCS, ACCOUNT_KINDS, COUNTRY, formatPhone, fmtDateTime, fmtAgo, insName } from '../../Lib/domain.js';
import { Alert } from '../ui/Feedback.jsx';
import { Card, SectionTitle } from '../ui/Card.jsx';
import { KeyValue } from '../ui/Data.jsx';
import { StatusTag } from './Rdv.jsx';
import { DocumentList } from './Documents.jsx';
import { HistoryTimeline } from './HistoryTimeline.jsx';

const mono = v => <span className="font-mono">{v}</span>;

/** Identité du demandeur sous forme [libellé, valeur]. */
export function insIdentity(ins) {
  const c = COUNTRY[ins.country]?.name || ins.country;
  if (ins.kind === 'particulier') {
    return [
      ['Type de compte', ACCOUNT_KINDS[ins.kind].label],
      ['Nom', `${ins.first} ${ins.last}`],
      ['Pièce d’identité', mono(ins.idNumber)],
      ['Ville', `${ins.city} · ${c}`],
      ins.fleet ? ['Camions', String(ins.fleet)] : null,
    ];
  }
  return [
    ['Type de compte', ACCOUNT_KINDS[ins.kind].label],
    ['Raison sociale', ins.company],
    ['NIF', mono(ins.nif)],
    ['RCCM', mono(ins.rccm)],
    ['Adresse', `${ins.address}, ${ins.city} · ${c}`],
    ins.rep ? ['Représentant légal', `${ins.rep.first} ${ins.rep.last} · ${ins.rep.role}`] : null,
    ins.kind === 'transport' && ins.fleet ? ['Camions', String(ins.fleet)] : null,
  ];
}

/** État de la demande expliqué au demandeur. */
export function InscriptionStatusAlert({ ins }) {
  if (ins.status === 'en_attente') {
    return <Alert tone="info" icon="hourglass" title="En cours d’examen">L’administration vérifie les pièces. La décision est envoyée par e-mail et SMS.</Alert>;
  }
  if (ins.status === 'a_completer') {
    return <Alert tone="warn" icon="file-up" role="status" title={`Compléments demandés · ${fmtDateTime(ins.request?.at)}`}>{ins.request?.comment}</Alert>;
  }
  if (ins.status === 'validee') {
    return <Alert tone="ok" title={`Validée · ${fmtDateTime(ins.decision?.at)}`}>Le compte transporteur est actif. Identifiant : {ins.email || formatPhone(ins.phone)}.</Alert>;
  }
  return (
    <Alert tone="bad" role="status" title={`Rejetée · ${fmtDateTime(ins.decision?.at)}`}>
      Motif : {ins.decision?.motif}{ins.decision?.comment ? `. ${ins.decision.comment}` : ''}
    </Alert>
  );
}

/** Détail complet d'une demande d'inscription ; `actions` : boutons de décision (administration) ou de mise à jour. */
export function InscriptionDetail({ ins, actions, head = true }) {
  const defs = INS_DOCS[ins.kind];
  return (
    <div className="flex flex-col gap-5">
      {head && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-brand-700">Demande d’inscription</p>
          <h2 className="mt-1 font-mono text-2xl font-semibold text-slate-900">{ins.id}</h2>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <StatusTag map={INS_STATUS} status={ins.status} />
            <span className="text-[13px] text-slate-500">{insName(ins)} · déposée {fmtAgo(ins.submittedAt)}</span>
          </div>
        </div>
      )}
      <InscriptionStatusAlert ins={ins} />
      {actions}
      <Card>
        <SectionTitle icon="user">Identité</SectionTitle>
        <KeyValue items={insIdentity(ins)} />
      </Card>
      <Card>
        <SectionTitle icon="at-sign">Contact et identifiant de connexion</SectionTitle>
        <KeyValue items={[
          ins.email ? ['E-mail', ins.email] : null,
          ['Téléphone', <span className="tabular-nums">{formatPhone(ins.phone)}</span>],
          ['Identifiant', ins.email || formatPhone(ins.phone)],
        ]} />
      </Card>
      <Card>
        <SectionTitle icon="file-check" aside={<span className="text-[13px] tabular-nums text-slate-500">{defs.filter(d => ins.docs?.[d.key]).length}/{defs.length}</span>}>Pièces justificatives</SectionTitle>
        <DocumentList defs={defs} docs={ins.docs} />
      </Card>
      <Card>
        <SectionTitle icon="history">Historique</SectionTitle>
        <HistoryTimeline items={ins.history || []} />
      </Card>
    </div>
  );
}
