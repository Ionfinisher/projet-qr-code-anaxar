<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\PermissionRegistrar;

class PermissionSeeder extends Seeder
{
    public function run(): void
    {
        app(PermissionRegistrar::class)->forgetCachedPermissions();

        // Permissions relatives aux tables et actions métier de PortFlow
        $permissions = [
            // Table creneaux / rendez-vous transporteur (espace externe)
            'transporteur.espace',

            // Table inscriptions (demandes d'inscription, pièces justificatives)
            'inscriptions.consulter',
            'inscriptions.traiter',
            'inscriptions.valider',
            'inscriptions.rejeter',

            // Table demande_rdvs, demande_camions, demande_documents (demandes de rendez-vous)
            'demandes.consulter',
            'demandes.traiter',
            'demandes.creer',
            'demandes.modifier',
            'demandes.annuler',

            // Table creneaux (gestion des créneaux de passage)
            'creneaux.consulter',
            'creneaux.gerer',
            'creneaux.creer',
            'creneaux.modifier',
            'creneaux.supprimer',

            // Table users (gestion des comptes utilisateurs)
            'utilisateurs.consulter',
            'utilisateurs.gerer',
            'utilisateurs.creer',
            'utilisateurs.modifier',
            'utilisateurs.activer',
            'utilisateurs.desactiver',
            'utilisateurs.supprimer',

            // Table roles, permissions (gestion des profils et habilitations)
            'profils.consulter',
            'profils.gerer',
            'profils.creer',
            'profils.modifier',
            'profils.supprimer',

            // Journal des messages et notifications (e-mails, SMS, alertes)
            'messagerie.consulter',
            'messagerie.envoyer',

            // Guérite d'accès portuaire (contrôle des QR codes et supervision barrières)
            'guerite.controle',
            'guerite.supervision',
        ];

        foreach ($permissions as $name) {
            Permission::firstOrCreate([
                'name' => $name,
                'guard_name' => 'web',
            ]);
        }
    }
}

