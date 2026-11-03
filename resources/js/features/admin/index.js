// Fonctionnalité « admin » : back-office du port (inscriptions, demandes de RDV, créneaux, utilisateurs, profils, messagerie)
export { DashboardPage } from './dashboard/DashboardPage.jsx';
export { InscriptionsPage } from './inscriptions/InscriptionsPage.jsx';
export { DemandesAdminPage } from './demandes/DemandesAdminPage.jsx';
export { CreneauxAdminPage } from './creneaux/CreneauxAdminPage.jsx';
export { UtilisateursPage } from './utilisateurs/UtilisateursPage.jsx';
export { ProfilsPage } from './profils/ProfilsPage.jsx';
export { MessageriePage } from './messagerie/MessageriePage.jsx';
export { adminApi, useAdminApi } from './api.js';
export { ADMIN_MODULES, useAdminModules, useCurrentModule } from './modules.js';
