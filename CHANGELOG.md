# Changelog

Toutes les modifications notables de ce projet sont consignées dans ce fichier.
Le format suit [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/) et le
projet adhère au [versionnement sémantique](https://semver.org/lang/fr/).

## [Unreleased]

### Added

- API mobile sous `/api/v1` : login Sanctum (token `mobile` 12 h, capacité
  `mobile.access`), scan d'un QR signé retournant le dossier complet en lecture
  seule, et logout révoquant le token courant.
- Migration `2026_11_24_000000_add_rdv_hash_to_demande_camions.php` : colonne
  `rdv_hash` nullable indexée, backfillée par lots à partir de la référence, de
  l'identifiant camion et de la position définitive.
- `App\Support\RdvId`, `App\Support\QrJwsVerifier`, `App\Services\QrScanService`
  et `App\Support\MobileDossierPresenter` : centralisation de l'identifiant PF,
  vérification JWS et présentation dossier.
- Suites de tests `MobileAuthApiTest.php`, `MobileScanApiTest.php`,
  `QrJwsVerifierTest.php` et `RdvIdTest.php`.
- Migration `2026_11_23_000000_add_checks_to_demande_documents.php` : colonnes
  nullable `check_result`, `checked_at`, `checked_by` et `check_note`.
- `App\Support\Poste` : mapping centralisé postes 1-6 ↔ types de documents et
  libellés, aligné sur `DemandeRdv::DOC_TYPES`.
- Suite de tests `PosteTest.php` (mapping des postes 1-6).
- Migration `2026_11_20_090000_add_documents_per_truck_to_demandes.php` :
  `temporary_uploads.truck_key`, `demande_documents.demande_camion_id`, index
  associés et backfill non destructif.
- Relations `DemandeCamion::documents()` et `DemandeDocument::camion()`.
- Upload lié à un camion via `truck_key`, avec token utilisable uniquement par
  son utilisateur, son type et son camion d'origine.
- Composant Inertia `TruckDocuments.jsx` : six documents par camion dans une
  étape dédiée du formulaire de demande.
- Affichage des documents groupés par camion dans le récapitulatif transporteur,
  le détail transporteur et le détail admin.
- Suite de tests `DemandeDocumentParCamionTest.php` : 15 tests couvrant upload,
  persistance, réordonnancement, suppression, anti-réemploi, QR par camion,
  documents historiques, validation `rdvId` et téléchargement.

### Removed

- **Breaking :** les cinq endpoints `/api/v1/admin/*` (login, liste des rendez-vous,
  documents par poste, téléchargement et décision) sont supprimés ainsi que la
  route `api.v1.admin.documents.download` et l'événement `check.poste`.
- Contrôleurs, FormRequests, middleware `admin.mobile`, token `MobileAdminToken`
  et presenter `MobileRendezVousPresenter` associés à l'ancienne API mobile.

### Changed

- **Breaking :** l'API mobile passe dans le namespace global `/api/v1`, la
  capacité devient `mobile.access`, le middleware `admin.mobile` devient
  `mobile` et le nom du token Sanctum devient `mobile`.
- **Breaking :** le scan ne modifie plus aucun document : les contrôles
  `passe`/`refuse` ne sont plus exposés via l'API mobile.
- **Breaking :** le champ `docs` passe d'un objet plat
  (`{ bc: token, ... }`) à un objet imbriqué par camion
  (`{ [truckKey]: { bc: token, ... } }`). Les anciens payloads sont rejetés.
- **Breaking :** `trucks[].key` est obligatoire et `trucks[].rdvId` doit
  référencer un camion de la demande en cours, ou être `null`.
- `DemandeRdvService::syncCamions()` conserve les camions existants lors d'une
  modification, ce qui évite de recréer leurs documents.
- `DemandeRdvPresenter` expose `docs[camionId]`, une liste plate `documents`
  avec `camion_id`, et calcule `dh` uniquement à partir des documents du camion.
- Le QR d'un camion multi-camions porte le champ `lot`.
- Après création ou modification, le formulaire redirige vers la liste des
  demandes (`transporteur.demandes.index`).
- Le type d’opération choisi est affiché en haut à droite des étapes 2 à 4 du
  formulaire de demande.

### Fixed

- Les documents historiques sans camion restent visibles en lecture seule et ne
  sont plus supprimés lors d'une modification.
- Les fichiers remplacés ou supprimés ne sont effacés qu'après commit de la
  transaction (`DB::afterCommit()`).
- Validation des identifiants `rdvId` dupliqués ou appartenant à une autre
  demande.
- Eager loading `camions.documents` dans les index transporteur/admin afin
  d'éviter les requêtes N+1.
- Ancrage regex `\z` au lieu de `$` pour les clés de camion.
- Nom de fichier téléchargé assaini (ASCII, pas de retour à la ligne ni de
  guillemets parasite).
- `documents` exposé par le presenter est de nouveau un tableau plat : la page
  de détail ne plante plus sur `(documents || []).some`.

### Security

- Vérification HMAC stricte des QR (`hash_equals` sur la chaîne brute
  `config('app.key')`), whitelist `alg`/`kid`, décodage base64url canonique et
  contrôle des claims `nbf`/`exp`/`sub` ; aucun token ni claim n'est journalisé.
- Limitation du scan à 30 requêtes/minute par utilisateur, avec `Retry-After`.
- Aucun secret de repli en dur pour la signature des QR : `APP_KEY` est
  obligatoire et une erreur explicite est levée si elle manque.
- Un token d'upload ne peut être réutilisé pour un autre camion ou un autre
  utilisateur.
- Le téléchargement vérifie que le document appartient à la demande et, le cas
  échéant, au camion de cette demande.

### Limitation connue

- Le QR est bien calculé par camion, mais le générateur hérité signe en
  HMAC-SHA256 avec `APP_KEY` tout en annonçant `alg: ES256`. Le vérificateur
  historique attend une signature ECDSA P-256. Une migration de clés est
  nécessaire pour une vérification ES256 conforme ; elle n'est pas incluse dans
  cette version.
