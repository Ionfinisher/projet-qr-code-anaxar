// Modules de l'administration : navigation filtrée par habilitation, compteurs des dossiers à traiter.
import { useMemo } from 'react';
import { useNav } from '../../lib/navigation.jsx';
import { usePortFlow, useCurrentUser } from '../../providers/PortFlowProvider.jsx';

export const ADMIN_MODULES = [
  { key: 'dashboard', route: 'admin.dashboard', exact: true, label: 'Tableau de bord', icon: 'layout-dashboard' },
  { key: 'inscriptions', route: 'admin.inscriptions', label: 'Inscriptions', icon: 'user-check', perm: 'inscriptions.consulter' },
  { key: 'demandes', route: 'admin.demandes', label: 'Demandes de RDV', icon: 'calendar-clock', perm: 'demandes.consulter' },
  { key: 'creneaux', route: 'admin.creneaux', label: 'Créneaux', icon: 'calendar-days', perm: 'creneaux.consulter' },
  { key: 'utilisateurs', route: 'admin.utilisateurs', label: 'Utilisateurs', icon: 'users', perm: 'utilisateurs.consulter' },
  { key: 'profils', route: 'admin.profils', label: 'Profils', icon: 'shield', perm: 'profils.consulter' },
  { key: 'messagerie', route: 'admin.messagerie', label: 'Messagerie', icon: 'mail', perm: 'messagerie.consulter' },
];

/** Modules accessibles à l'utilisateur, avec le nombre de dossiers en attente. */
export function useAdminModules() {
  const { data } = usePortFlow();
  const { can } = useCurrentUser();
  const pendIns = data.inscriptions.filter(i => i.status === 'en_attente').length;
  const pendDem = data.demandes.filter(d => d.status === 'en_attente').length;
  return useMemo(() => ADMIN_MODULES
    .filter(m => !m.perm || can(m.perm))
    .map(m => ({ ...m, count: m.key === 'inscriptions' ? pendIns : m.key === 'demandes' ? pendDem : 0 })), [can, pendIns, pendDem]);
}

/** Module affiché (d'après l'adresse). */
export function useCurrentModule(modules) {
  const nav = useNav();
  return modules.find(m => !m.exact && nav.isActive(m.route)) || modules.find(m => nav.isActive(m.route, undefined, { exact: true })) || modules[0];
}
