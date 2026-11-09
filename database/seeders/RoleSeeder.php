<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

class RoleSeeder extends Seeder
{
    public function run(): void
    {
        $this->call(PermissionSeeder::class);

        app(PermissionRegistrar::class)->forgetCachedPermissions();

        // 1. Assurer que le rôle admin existe d'abord
        $adminRole = Role::firstOrNew([
            'name' => 'admin',
            'guard_name' => 'web',
        ]);
        $adminRole->description = 'Administrateur système · accès complet';
        $adminRole->kind = 'interne';
        $adminRole->is_system = true;
        $adminRole->is_locked = true;
        $adminRole->created_by = null;
        $adminRole->save();

        $adminPerms = Permission::where('guard_name', 'web')->pluck('name')->all();
        if (! empty($adminPerms)) {
            $adminRole->syncPermissions($adminPerms);
        }

        // 2. Récupérer ou initialiser l'utilisateur admin pour attribuer created_by
        $adminUser = User::role('admin')->first();

        if (! $adminUser && ! empty(config('admin.email'))) {
            $adminUser = User::where('email', Str::lower(config('admin.email')))->first();
        }

        if (! $adminUser && (! empty(config('admin.email')) && ! empty(config('admin.password')))) {
            $this->call(AdminUserSeeder::class);
            $adminUser = User::role('admin')->first()
                ?? User::where('email', Str::lower(config('admin.email')))->first();
        }

        $adminId = $adminUser?->id;

        $roles = [
            [
                'name' => 'bureau',
                'description' => 'Bureau des rendez-vous et traitement des demandes',
                'kind' => 'interne',
                'is_system' => true,
                'is_locked' => false,
                'created_by' => $adminId,
                'perms' => [
                    'demandes.consulter',
                    'demandes.traiter',
                    'creneaux.consulter',
                    'creneaux.gerer',
                    'inscriptions.consulter',
                    'inscriptions.traiter',
                    'messagerie.consulter',
                ],
            ],
            [
                'name' => 'guerite',
                'description' => 'Agents de guérite · contrôle d’accès et validation',
                'kind' => 'interne',
                'is_system' => true,
                'is_locked' => false,
                'created_by' => $adminId,
                'perms' => [
                    'guerite.controle',
                    'guerite.supervision',
                ],
            ],
            [
                'name' => 'transporteur',
                'description' => 'Accès réservé aux transporteurs validés',
                'kind' => 'externe',
                'is_system' => true,
                'is_locked' => true,
                'created_by' => null,
                'perms' => [
                    'transporteur.espace',
                ],
            ],
            [
                'name' => 'transitaire',
                'description' => 'Accès réservé aux transitaires et commissionnaires',
                'kind' => 'externe',
                'is_system' => true,
                'is_locked' => true,
                'created_by' => null,
                'perms' => [
                    'transporteur.espace',
                ],
            ],
        ];

        foreach ($roles as $data) {
            $role = Role::firstOrNew([
                'name' => $data['name'],
                'guard_name' => 'web',
            ]);

            $role->description = $data['description'];
            $role->kind = $data['kind'];
            $role->is_system = (bool) $data['is_system'];
            $role->is_locked = (bool) $data['is_locked'];
            $role->created_by = $data['created_by'] ?? null;
            $role->save();

            if (! empty($data['perms'])) {
                $existingPerms = Permission::where('guard_name', 'web')
                    ->whereIn('name', $data['perms'])
                    ->pluck('name')
                    ->all();
                if (! empty($existingPerms)) {
                    $role->syncPermissions($existingPerms);
                }
            }
        }
    }
}

