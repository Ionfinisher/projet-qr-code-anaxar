# Changelog

Toutes les modifications notables de ce projet sont consignées dans ce fichier.
Le format suit [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/) et le
projet adhère au [versionnement sémantique](https://semver.org/lang/fr/).

## [Unreleased]

### Added

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

### Changed

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
