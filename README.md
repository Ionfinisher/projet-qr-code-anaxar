# Gestion des inscriptions transporteurs

Application Laravel 10 / Inertia.js / React 18 pour l'inscription et la validation
des transporteurs (sociétés et particuliers).

## Stack

- PHP 8.1+, Laravel 10
- Inertia.js + React 18 + Vite + Tailwind CSS
- PostgreSQL (ou MySQL / SQLite en développement)
- `spatie/laravel-permission` pour les rôles

## Fonctionnement de l'inscription

1. Le visiteur choisit son type de compte : **société** ou **particulier**.
2. Les pays proposés viennent de la table `pays`.
3. Les pièces à fournir viennent de la table `piece_a_fournir` :
   - `CFE` pour les sociétés ;
   - `CNI` pour les particuliers.
4. Les fichiers acceptés sont configurables par pièce via la colonne `extension`
   (PDF, JPG, JPEG et PNG par défaut), dans la limite de 10 Mo.
5. Le dossier est créé avec le statut `pending`, le compte utilisateur aussi.
6. L'utilisateur vérifie son email via un lien signé.
7. Un administrateur valide ou rejette le dossier depuis `/admin/registrations`.
8. En cas de rejet, le demandeur peut corriger et resoumettre son dossier depuis
   la page de suivi (`/registration/status`).

Le numéro de dossier (`DOS-AAAAMMJJ-XXXXXX`) et les clés métier
(`keyinscription`, `keytransporteur`, `keypieceinscription`, `keyuser`) sont
générés automatiquement par les modèles.

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
- les rôles `admin` et `transporteur` (`RoleSeeder`).

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
| GET | `/registration/{numeroDossier}/edit` | Formulaire de correction (email en query) |
| POST | `/registration/{numeroDossier}` | Resoumission d'un dossier rejeté |
| GET | `/admin/registrations` | Liste des dossiers (admin) |
| POST | `/admin/registrations/{id}/approve` | Valider un dossier |
| POST | `/admin/registrations/{id}/reject` | Rejeter un dossier |
| GET | `/admin/registration-documents/{piece}/download` | Télécharger une pièce |

## Tests

Les tests utilisent SQLite en mémoire (`phpunit.xml`) et ne touchent jamais à la
base de développement :

```bash
php artisan test
```

Couverture fonctionnelle : inscription dynamique avec pièces, pièce obligatoire
manquante, type de fichier invalide, connexion bloquée/autorisée, vérification
email, approbation/rejet administrateur et resoumission d'un dossier rejeté.
