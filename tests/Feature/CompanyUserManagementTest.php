<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class CompanyUserManagementTest extends TestCase
{
    use RefreshDatabase;

    public function test_non_admin_cannot_create_or_manage_users(): void
    {
        $company = User::factory()->create([
            'user_type' => 'societe',
            'statut' => User::STATUS_APPROVED,
            'email_verified_at' => now(),
        ]);
        $role = Role::create(['name' => 'Comptable', 'guard_name' => 'web']);

        // Non-admin attempting to access legacy users route
        $this->actingAs($company)->get(route('users.index'))->assertForbidden();
        $this->actingAs($company)->post(route('users.store'), [
            'nom' => 'Doe',
            'prenom' => 'Jane',
            'email' => 'jane@example.com',
            'adresse' => 'Lome',
            'role_id' => $role->id,
        ])->assertForbidden();

        // Non-admin attempting to access admin utilisateurs route
        $this->actingAs($company)->get(route('admin.utilisateurs.index'))->assertForbidden();
        $this->actingAs($company)->post(route('admin.utilisateurs.store'), [
            'nom' => 'Doe',
            'prenom' => 'Jane',
            'email' => 'jane@example.com',
            'role_id' => $role->id,
        ])->assertForbidden();
    }

    public function test_non_admin_cannot_update_or_delete_users(): void
    {
        $company = User::factory()->create([
            'user_type' => 'societe',
            'email_verified_at' => now(),
        ]);
        $other = User::factory()->create(['email' => 'other@example.com']);

        $this->actingAs($company)->get(route('users.edit', $other))->assertForbidden();
        $this->actingAs($company)->put(route('users.update', $other), [
            'nom' => 'Updated',
            'prenom' => 'Child',
        ])->assertForbidden();
        $this->actingAs($company)->delete(route('users.destroy', $other))->assertForbidden();

        $this->actingAs($company)->put(route('admin.utilisateurs.update', $other), [
            'nom' => 'Updated',
            'prenom' => 'Child',
            'email' => 'other@example.com',
        ])->assertForbidden();
        $this->actingAs($company)->delete(route('admin.utilisateurs.destroy', $other))->assertForbidden();
    }
}
