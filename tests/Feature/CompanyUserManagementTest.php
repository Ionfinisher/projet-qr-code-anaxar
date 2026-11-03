<?php

namespace Tests\Feature;

use App\Models\User;
use App\Notifications\CreatedUserCredentials;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class CompanyUserManagementTest extends TestCase
{
    use RefreshDatabase;

    public function test_societe_can_create_an_owned_user_with_an_owned_profile(): void
    {
        Notification::fake();
        $company = User::factory()->create([
            'user_type' => 'societe',
            'statut' => User::STATUS_APPROVED,
            'email_verified_at' => now(),
        ]);
        $role = Role::create(['name' => 'Comptable', 'guard_name' => 'web', 'created_by' => $company->id]);

        $response = $this->actingAs($company)->post(route('users.store'), [
            'nom' => 'Doe',
            'prenom' => 'Jane',
            'email' => 'jane@example.com',
            'adresse' => 'Lome',
            'role_id' => $role->id,
        ]);

        $response->assertRedirect(route('users.index'));
        $child = User::where('email', 'jane@example.com')->firstOrFail();
        $this->assertSame($company->id, $child->created_by);
        $this->assertTrue($child->must_change_password);
        $this->assertTrue($child->hasRole('Comptable'));
        Notification::assertSentTo($child, CreatedUserCredentials::class);
    }

    public function test_admin_and_other_companies_cannot_manage_users(): void
    {
        $admin = User::factory()->create(['email_verified_at' => now()]);
        $admin->assignRole(Role::create(['name' => 'admin', 'guard_name' => 'web']));
        $this->actingAs($admin)->get(route('users.index'))->assertForbidden();

        $company = User::factory()->create([
            'user_type' => 'societe',
            'email_verified_at' => now(),
        ]);
        $other = User::factory()->create(['created_by' => $company->id]);

        $this->actingAs(User::factory()->create([
            'user_type' => 'societe',
            'email_verified_at' => now(),
        ]))->get(route('users.edit', $other))->assertForbidden();
    }

    public function test_company_can_only_update_allowed_child_fields(): void
    {
        $company = User::factory()->create([
            'user_type' => 'societe',
            'email_verified_at' => now(),
        ]);
        $child = User::factory()->create([
            'created_by' => $company->id,
            'email' => 'child@example.com',
            'statut' => User::STATUS_ACTIVE,
        ]);

        $this->actingAs($company)->put(route('users.update', $child), [
            'nom' => 'Updated',
            'prenom' => 'Child',
            'adresse' => 'New address',
            'email' => 'changed@example.com',
            'statut' => User::STATUS_INACTIVE,
        ])->assertRedirect(route('users.index'));

        $child->refresh();
        $this->assertSame('child@example.com', $child->email);
        $this->assertSame(User::STATUS_ACTIVE, $child->statut);
        $this->assertSame('Updated', $child->nom);
    }
}
