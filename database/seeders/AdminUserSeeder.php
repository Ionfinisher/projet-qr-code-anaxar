<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

/**
 * Crée le premier administrateur uniquement si ADMIN_EMAIL et ADMIN_PASSWORD
 * sont fournis par l'environnement. Aucun identifiant n'est codé en dur.
 */
class AdminUserSeeder extends Seeder
{
    public function run(): void
    {
        $email = config('admin.email');
        $password = config('admin.password');

        if (empty($email) || empty($password)) {
            $this->command?->warn('ADMIN_EMAIL / ADMIN_PASSWORD non définis : aucun administrateur créé.');

            return;
        }

        $user = User::firstOrNew(['email' => Str::lower($email)]);

        if (! $user->exists) {
            $user->forceFill([
                'name' => 'Administrateur',
                'nom' => 'Administrateur',
                'email' => Str::lower($email),
                'password' => $password,
                'statut' => User::STATUS_APPROVED,
                'email_verified_at' => now(),
            ])->save();
        }

        $user->assignRole('admin');
    }
}
