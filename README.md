# PortFlow — inscriptions transporteurs et rendez-vous portuaires

Application Laravel 10 / Inertia.js / React 18 pour l'inscription et la validation
des transporteurs (sociétés et particuliers), puis la préparation des demandes de
rendez-vous multi-camions avec documents et QR par camion.

## Stack

- PHP 8.1+, Laravel 10
- Inertia.js + React 18 + Vite + Tailwind CSS
- PostgreSQL (ou MySQL / SQLite en développement)
- `spatie/laravel-permission` pour les rôles

## Fonctionnement de l'inscription

1. Le visiteur choisit son type de compte : **société**, **transitaire** ou
   **particulier**.
2. Les pays proposés viennent de la table `pays`.
3. Les pièces à fournir viennent de la table `piece_a_fournir` :
   - `CFE` pour les sociétés ;
   - `CNI` pour les particuliers.
4. Les fichiers acceptés sont configurables par pièce via la colonne `extension`
   (PDF, JPG, JPEG et PNG par défaut), dans la limite de 10 Mo.
5. Une inscription **transitaire** crée une ligne dans la table dédiée
   `transitaire` (et renseigne `users.idtransitaire` /
   `inscription.idtransitaire`). Les types **société** et **particulier**
   restent dans la table `transporteur`.
6. Le dossier est créé avec le statut `pending`, le compte utilisateur aussi.
   Le rôle est assigné immédiatement : `transporteur` pour société/particulier,
   `transitaire` pour transitaire.
7. L'utilisateur vérifie son email via un lien signé.
8. Un administrateur valide ou rejette le dossier depuis `/admin/registrations`.
9. En cas de rejet, le demandeur doit créer une nouvelle demande depuis la page
   de suivi (`/registration/status`).

Le numéro de dossier (`DOS-AAAAMMJJ-XXXXXX`) et les clés métier
(`keyinscription`, `keytransporteur`, `keytransitaire`, `keypieceinscription`,
`keyuser`) sont générés automatiquement par les modèles.

## Installation

```bash
composer install
cp .env.example .env
php artisan key:generate
```

Configurer la base de données dans `.env`, puis :

```bash
php artisan migrate --seed
npm ci
npm run build   # ou npm run dev en développement
php artisan serve
```

### Emails en arrière-plan

Les emails sont placés dans la file Laravel `database` et ne bloquent pas les
requêtes web. Après les migrations, lancez un worker dans un processus
persistant :

```bash
php artisan queue:work database --tries=5 --backoff=60
```

Chaque notification email est tentée au maximum cinq fois avec des délais
croissants (60, 120, 240 puis 480 secondes). Les erreurs définitives sont
enregistrées dans `failed_jobs` :

```bash
php artisan queue:failed
php artisan queue:retry all
```

En production, le worker doit être supervisé (par exemple avec Supervisor ou
un service systemd) et redémarré après chaque déploiement :

```bash
php artisan queue:restart
```

> Si votre version de PHP est 8.5, le `composer.lock` actuel (Inertia 0.6)
> nécessite `composer install --ignore-platform-req=php`. Une mise à jour vers
> Inertia 1.x est recommandée à terme.

### Compte administrateur initial

Renseigner ces variables dans `.env` **avant** `php artisan migrate --seed` :

```dotenv
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=mot-de-passe-fort
```

`DatabaseSeeder` crée alors ce compte avec le rôle `admin`. Si les variables
sont vides, aucun administrateur n'est créé automatiquement.

Les seeders créent également :

- les pays (`PaysSeeder`) ;
- les pièces CFE et CNI (`PieceAFournirSeeder`) ;
- les rôles `admin`, `transporteur` et `transitaire` (`RoleSeeder`).

## Stockage des documents

Les pièces sont stockées sur le disque `local`, dans
`storage/app/registrations/{id_inscription}/`. Elles ne sont pas exposées
publiquement : le téléchargement passe par une route protégée réservée aux
administrateurs.

## Routes principales

| Méthode | URL | Description |
|---------|-----|-------------|
| GET/POST | `/register` | Inscription transporteur |
| GET/POST | `/login` | Connexion |
| GET | `/registration/status` | Suivi de dossier |
| GET | `/registration/verify/{id}/{hash}` | Vérification email (lien signé) |
| GET | `/registration/{numeroDossier}/edit` | Correction en 4 étapes (email actuel en query) |
| POST | `/registration/{numeroDossier}` | Resoumission (`current_email` requis ; `email` et `password` facultatifs) |
| GET | `/admin/registrations` | Liste des dossiers (admin) |
| POST | `/admin/registrations/{id}/approve` | Valider un dossier |
| POST | `/admin/registrations/{id}/reject` | Rejeter un dossier |
| GET | `/admin/registration-documents/{piece}/preview` | Prévisualiser une pièce (admin) |
| GET | `/admin/registration-documents/{piece}/download` | Télécharger une pièce |
| GET | `/api/places/cities` | Suggestions de villes (proxy Google Places, filtré par pays) |
| GET | `/api/places/addresses` | Suggestions d'adresses (proxy Google Places, filtré par pays) |

## Autocomplétion des villes et adresses (Google Places)

Les champs **Ville** et **Adresse du siège** de l'inscription proposent des
suggestions issues de
[Google Places API (New) — Autocomplete](https://developers.google.com/maps/documentation/places/web-service/place-autocomplete).
Les suggestions sont restreintes au pays sélectionné (`includedRegionCodes`).

- Villes : `includedPrimaryTypes: ["(cities)"]`.
- Adresses : `includedPrimaryTypes: ["street_address", "premise", "subpremise", "route", "plus_code"]`
  (adresses, bâtiments, voies et plus codes pour les zones sans adressage numéroté).

Les requêtes passent par un **proxy serveur** (`GET /api/places/cities` et
`GET /api/places/addresses`) : la clé Google n'est jamais exposée au navigateur.
Les endpoints sont publics, limités à 30 requêtes/minute par IP, et les résultats
identiques sont mis en cache 24 h.

### Configuration

1. Activer **Places API (New)** dans le projet Google Cloud (facturation requise).
2. Créer une clé API et la renseigner dans `.env` :

   ```dotenv
   GOOGLE_PLACES_API_KEY=votre-cle
   ```

   Variables optionnelles : `GOOGLE_PLACES_ENDPOINT`, `GOOGLE_PLACES_TIMEOUT` (secondes).

Sans clé (ou en cas de quota dépassé / panne réseau), les endpoints répondent
avec une liste vide et **la saisie manuelle de la ville et de l'adresse reste
possible** : aucune fonctionnalité n'est bloquée.

Le pays `XX` (« Autre ») n'a pas de code ISO : aucune restriction de pays n'est
alors appliquée.

## Tests

Les tests utilisent SQLite en mémoire (`phpunit.xml`) et ne touchent jamais à la
base de développement :

```bash
php artisan test
```

Couverture fonctionnelle : inscription dynamique avec pièces, pièce obligatoire
manquante, type de fichier invalide, connexion bloquée/autorisée, vérification
email, approbation/rejet administrateur, resoumission d'un dossier rejeté et
proxy d'autocomplétion des villes et adresses (validation, cache, dégradation
gracieuse). L'API mobile est couverte par `MobileAuthApiTest.php`,
`MobileScanApiTest.php`, `QrJwsVerifierTest.php` et `RdvIdTest.php`.

Pour les documents par camion, la suite dédiée est :

```bash
php artisan test tests/Feature/Transporteur/DemandeDocumentParCamionTest.php
```

Le build frontend est vérifié avec :

```bash
npm run build
```

## Demandes de rendez-vous multi-camions

Une demande peut contenir jusqu'à 20 camions. Chaque camion doit fournir les
six documents suivants : `bc`, `bf`, `as`, `vt`, `gp`, `ta`.

### Contrat de données

- `trucks[].key` : clé client stable (`^[A-Za-z0-9_-]+\z`, 64 caractères max),
  utilisée comme clé du formulaire React.
- `trucks[].rdvId` : identifiant d'un camion déjà enregistré dans **cette**
  demande, ou `null` pour un nouveau camion. Un identifiant dupliqué ou
  appartenant à une autre demande est rejeté.
- `docs` : objet imbriqué `{ [truckKey]: { bc: token|id, ... } }`. **Le format
  plat `docs.bc` n'est plus accepté** (voir `CHANGELOG.md`).
- Upload : `POST /transporteur/uploads` avec `type`, `truck_key` et `file`.
  Le token n'est utilisable que par l'utilisateur, le type et le camion pour
  lesquels il a été émis.

Les fichiers sont stockés sur le disque privé `local` dans
`rendez-vous/{demandeId}/{camionId}/`. Les documents historiques sans camion
restent lisibles en lecture seule et ne sont jamais purgés par une modification.

### QR par camion

Après validation de la demande, chaque camion reçoit son propre token QR. Le
tableau `dh` ne contient que les empreintes SHA-256 des six documents du
camion, dans l'ordre fixe `DOCS`. Le champ `lot` est renseigné uniquement pour
les demandes multi-camions.

> **Limitation connue et héritée :** le générateur signe actuellement en
> HMAC-SHA256 avec `APP_KEY` tout en annonçant `alg: ES256` dans l'en-tête JWS,
> alors que le vérificateur historique (`resources/js/Lib/domain.js`) attend une
> vraie signature ECDSA P-256. Le QR est donc correctement **calculé par
> camion**, mais sa vérification cryptographique conforme ES256 nécessite une
> migration de clés (private key serveur + JWK public) hors du périmètre de
> cette évolution. Le fallback secret en dur a été supprimé : `APP_KEY` est
> obligatoire.

### Routes ajoutées

| Méthode | URL | Description |
|---------|-----|-------------|
| POST | `/transporteur/uploads` | Téléverser un document avec `truck_key` |
| GET | `/transporteur/demandes/{demande}/documents/{document}/telecharger` | Télécharger un document (transporteur) |
| GET | `/admin/demandes/{demande}/documents/{document}/telecharger` | Télécharger un document (admin) |
| POST | `/api/v1/login` | Connexion mobile (token Sanctum 12 h) |
| POST | `/api/v1/scan` | Vérifier un QR et retourner le dossier en lecture seule |
| POST | `/api/v1/logout` | Révoquer le token courant |

## API mobile

Préfixe : `/api/v1`. Trois endpoints seulement. `login` est public ; `scan` et
`logout` exigent l'en-tête `Authorization: Bearer <access_token>` et un compte
`admin` actif, approuvé et sans changement de mot de passe forcé. **Cet état est
revérifié à chaque requête** : un token émis reste valable 12 heures au maximum,
mais il est rejeté avec un 403 dès que le compte est désactivé, non approuvé,
soumis à un changement de mot de passe ou privé du rôle admin. Le token Sanctum
`mobile` porte la seule capacité `mobile.access` ; le champ `expires_at` de la
réponse de login est au format ISO 8601.

| Méthode | URL | Paramètres (JSON) | Réponse |
|---------|-----|-------------------|---------|
| POST | `/api/v1/login` | `email`, `password` | `access_token`, `token_type: "Bearer"`, `expires_at`, `user` (`id`, `name`, `email`, `roles`) |
| POST | `/api/v1/scan` | `token` (JWS en 3 segments base64url, 4096 car. max), `poste` optionnel (1-6 ou `bc`/`bf`/`as`/`vt`/`gp`/`ta`) | Dossier complet : `rdv_id`, `demande`, `truck`, 6 `documents`, `checks` ; avec `poste`, un seul document et un seul contrôle |
| POST | `/api/v1/logout` | aucun | `{"message":"Déconnecté."}` |

Le scan est **en lecture seule** : aucun fichier n'est téléchargé, aucun
contrôle n'est enregistré, aucun événement n'est créé. Les six documents sont
retournés dans l'ordre fixe `bc`, `bf`, `as`, `vt`, `gp`, `ta` avec leur poste,
leur libellé, leurs métadonnées et leur contrôle éventuel (`null` sinon). La
réponse n'expose ni URL de téléchargement, ni téléphone ni permis du chauffeur.

Le paramètre optionnel `poste` filtre la réponse sur un seul poste de contrôle :
`documents` et `checks` ne contiennent alors que le document correspondant
(les données `rdv_id`, `demande` et `truck` restent complètes). Il accepte le
numéro du poste ou sa clé, sans tenir compte de la casse. Sans paramètre, la
réponse conserve les six documents : ce filtrage est donc rétrocompatible.
Si le document du poste demandé n'existe pas, une entrée avec des métadonnées
`null` est retournée, comme pour le dossier complet. Les six empreintes `dh`
du QR sont vérifiées **avant** le filtrage : un QR falsifié reste rejeté même
si le document falsifié n'est pas celui affiché.

Le champ `rdv_hash` des camions (indexé, calculé avec la position définitive)
permet de retrouver le dossier ; les claims `op`, `trm`, `slt`, `lot` et `dh`
sont recalculés côté serveur et doivent correspondre au créneau et aux
documents.

Codes d'erreur :

| Code | Signification |
|------|---------------|
| 400 | QR invalide (`reason` : `format`, `encoding`, `header`, `claims`, `signature`, `timing`, `subject`, `mismatch`) |
| 401 | Identifiants invalides (message identique pour email inconnu et mauvais mot de passe) ou token absent/invalide/révoqué |
| 403 | Compte non admin, inactif, non approuvé, changement de mot de passe requis, ou token sans capacité `mobile.access` |
| 404 | Aucun dossier correspondant au QR (`Dossier introuvable.`) |
| 422 | Validation FormRequest (`token` absent/mal formé, `poste` inconnu ou de type invalide) ou identifiant QR ambigu |
| 429 | Limite atteinte : 5 échecs de login par email+IP, 10 requêtes/min sur `login`, 30 scans/min par utilisateur ; en-tête `Retry-After` |

> **Limitation connue et héritée :** le générateur signe actuellement en
> HMAC-SHA256 avec la chaîne brute `APP_KEY` tout en annonçant `alg: ES256`
> dans l'en-tête JWS, alors que le vérificateur historique
> (`resources/js/Lib/domain.js`) attend une vraie signature ECDSA P-256. Le
> vérificateur serveur applique cette même convention HMAC en whitelistant
> `alg` et `kid` (`pf-2026`). Le scan valide donc les QR produits par
> l'application, mais une vérification ES256 conforme nécessite une migration
> de clés (private key serveur + JWK public) hors du périmètre de cette
> évolution.

## Structure du projet

- `app/Http/Requests` : validation des formulaires et des uploads.
- `app/Services` : logique métier (créneaux, demandes, synchronisation camions/documents).
- `app/Support` : presenters Inertia et génération des QR.
- `database/migrations` : schéma versionné, dont l'ajout des documents par camion.
- `resources/js/Pages` : arbre Inertia actif, monté par `resources/js/app.jsx`.
- `resources/js/features` : ancien arbre SPA conservé pour référence, non monté
  par `app.jsx`.
- `tests/Feature` : Tests HTTP Laravel, dont la suite documents par camion.

## Configuration

| Variable | Rôle | Valeur par défaut | Obligatoire |
|----------|------|-------------------|-------------|
| `APP_KEY` | Chiffrement Laravel et signature HMAC des QR | vide | oui |
| `FILESYSTEM_DISK` | Disque des pièces et documents | `local` | oui |
| `QUEUE_CONNECTION` | File des notifications email | `database` | oui |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | Compte admin créé par le seeder | vides | non |
| `GOOGLE_PLACES_API_KEY` | Autocomplétion villes/adresses | vide | non |

Toutes les variables sont reprises dans `.env.example`. Aucune nouvelle
variable d'environnement n'a été introduite par les documents par camion.

## Documentation API

Les endpoints publics `/api/places/cities` et `/api/places/addresses` sont
décrits dans le tableau des routes ci-dessus. Aucune spécification OpenAPI
n'est générée par le projet ; il s'agit d'une dette documentaire connue.

## Contribuer

Les contributions sont acceptées via pull request. Avant proposition :

```bash
php artisan test
npm run build
```

Le contrôle Pint global échoue actuellement sur du code préexistant non lié à
cette évolution ; appliquer Pint uniquement aux fichiers réellement modifiés
(`./vendor/bin/pint <fichier>`) tant que cette dette n'est pas soldée.

Respecter l'arbre Inertia actif (`resources/js/Pages`) et éviter d'étendre
l'ancien arbre `resources/js/features`, non monté par `app.jsx`.
