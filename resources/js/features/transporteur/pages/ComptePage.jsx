import { useState } from 'react';
import { ACCOUNT_KINDS, COUNTRY, formatPhone, fmtDateTime, personName } from '../../../lib/domain.js';
import { notify } from '../../../lib/alerts.js';
import { usePortFlow, useCurrentUser } from '../../../providers/PortFlowProvider.jsx';
import { PageHeader, Card, SectionTitle, KeyValue, Button } from '../../../components/ui/index.js';
import { InscriptionDetail } from '../../../components/domain/index.js';
import { ChangePasswordDrawer, useAuthApi } from '../../auth/index.js';

const mono = v => <span className="font-mono">{v}</span>;

/** Mon compte : identité, connexion, demande d'inscription d'origine (/transporteur/compte). */
export function ComptePage() {
  const { data, config } = usePortFlow();
  const { user } = useCurrentUser();
  const auth = useAuthApi();
  const [showIns, setShowIns] = useState(false);
  const [pwd, setPwd] = useState(false);
  const ins = data.inscriptions.find(i => i.id === user.inscriptionId);
  const c = COUNTRY[user.country]?.name || user.country;
  const logout = async () => { await auth.logout(); notify('Vous êtes déconnecté', 'neutral'); };
  return (
    <>
      <PageHeader title="Mon compte" subtitle={`${ACCOUNT_KINDS[user.acct]?.label || 'Transporteur'} · profil Transporteur`}
        actions={<>
          <Button variant="secondary" icon="lock-keyhole" onClick={() => setPwd(true)}>Changer mon mot de passe</Button>
          <Button variant="danger-outline" icon="log-out" onClick={logout}>Se déconnecter</Button>
        </>} />
      <div className="grid items-start gap-5 lg:grid-cols-2">
        <Card>
          <SectionTitle icon={ACCOUNT_KINDS[user.acct]?.icon || 'user'}>Identité</SectionTitle>
          <KeyValue items={user.org ? [
            ['Raison sociale', user.org.company],
            ['NIF', mono(user.org.nif)],
            ['RCCM', mono(user.org.rccm)],
            ['Adresse', `${user.org.address}, ${user.city} · ${c}`],
            user.org.rep && ['Représentant légal', `${user.org.rep.first} ${user.org.rep.last} · ${user.org.rep.role}`],
            user.fleet ? ['Camions', String(user.fleet)] : null,
          ] : [
            ['Nom', personName(user)],
            ['Pièce d’identité', mono(user.idNumber)],
            ['Ville', `${user.city} · ${c}`],
            user.fleet ? ['Camions', String(user.fleet)] : null,
          ]} />
        </Card>
        <Card>
          <SectionTitle icon="lock-keyhole">Connexion</SectionTitle>
          <KeyValue items={[
            ['Identifiant', user.email || formatPhone(user.phone)],
            user.email && ['E-mail', user.email],
            ['Téléphone', <span className="tabular-nums">{formatPhone(user.phone)}</span>],
            ['Dernière connexion', fmtDateTime(user.lastLoginAt)],
            ['Mot de passe', `Haché sur le serveur (${config?.pwdAlgo || 'Argon2id'})`],
          ]} />
        </Card>
      </div>
      {ins && (
        <Card className="mt-5">
          <SectionTitle icon="user-check"
            aside={<Button size="sm" variant="ghost" icon={showIns ? 'chevron-up' : 'chevron-down'} aria-expanded={showIns} onClick={() => setShowIns(x => !x)}>{showIns ? 'Masquer' : 'Consulter ma demande d’inscription'}</Button>}>
            Inscription
          </SectionTitle>
          <KeyValue items={[
            ['Référence', mono(ins.id)],
            ['Déposée le', fmtDateTime(ins.submittedAt)],
            ins.decision && ['Validée le', `${fmtDateTime(ins.decision.at)} · ${ins.decision.byName}`],
          ]} />
          {showIns && <div className="mt-5"><InscriptionDetail ins={ins} head={false} /></div>}
        </Card>
      )}
      <ChangePasswordDrawer open={pwd} onClose={() => setPwd(false)} />
    </>
  );
}
