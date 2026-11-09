<?php

namespace Tests\Feature\Admin;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class UserManagementTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;
    private Role $role;

    protected function setUp(): void
    {
        parent::setUp();

        $this->admin = User::factory()->create([
            'email' => 'admin@portflow.test',
            'email_verified_at' => now(),
        ]);
        $this->admin->assignRole(Role::create(['name' => 'admin', 'guard_name' => 'web']));

        $this->role = Role::create([
            'name' => 'bureau',
            'kind' => 'interne',
            'guard_name' => 'web',
            'created_by' => $this->admin->id,
        ]);
    }

    public function test_admin_can_view_users_index(): void
    {
        $response = $this->actingAs($this->admin)->get(route('admin.utilisateurs.index'));
        $response->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Admin/Utilisateurs/Index')
                ->has('users.data')
                ->has('counts')
                ->has('profiles')
            );
    }

    public function test_admin_can_create_internal_user(): void
    {
        $response = $this->actingAs($this->admin)->post(route('admin.utilisateurs.store'), [
            'prenom' => 'Jean',
            'nom' => 'Dupont',
            'email' => 'jean.dupont@portflow.test',
            'telephone' => '+228 90 11 22 33',
            'fonction' => 'Agent Bureau RDV',
            'role_id' => $this->role->id,
            'temp_password' => 'TemporaryPass123!',
        ]);

        $response->assertRedirect(route('admin.utilisateurs.index'))
            ->assertSessionHas('success')
            ->assertSessionHas('tempPassword', 'TemporaryPass123!');

        $user = User::where('email', 'jean.dupont@portflow.test')->firstOrFail();
        $this->assertSame('Jean', $user->prenom);
        $this->assertSame('Dupont', $user->nom);
        $this->assertSame('Agent Bureau RDV', $user->fonction);
        $this->assertTrue($user->must_change_password);
        $this->assertTrue(Hash::check('TemporaryPass123!', $user->password));
        $this->assertTrue($user->hasRole('bureau'));
    }

    public function test_admin_can_update_user(): void
    {
        $user = User::factory()->create([
            'prenom' => 'Paul',
            'nom' => 'Martin',
            'email' => 'paul.martin@test.local',
            'created_by' => $this->admin->id,
        ]);
        $user->assignRole($this->role);

        $newRole = Role::create([
            'name' => 'guerite',
            'kind' => 'interne',
            'guard_name' => 'web',
            'created_by' => $this->admin->id,
        ]);

        $response = $this->actingAs($this->admin)->put(route('admin.utilisateurs.update', $user), [
            'prenom' => 'Paul-Henri',
            'nom' => 'Martin-Updated',
            'email' => 'paul.martin.updated@test.local',
            'telephone' => '+228 91 22 33 44',
            'fonction' => 'Chef Guérite',
            'role_id' => $newRole->id,
        ]);

        $response->assertRedirect(route('admin.utilisateurs.index'))
            ->assertSessionHas('success');

        $user->refresh();
        $this->assertSame('Paul-Henri', $user->prenom);
        $this->assertSame('Martin-Updated', $user->nom);
        $this->assertSame('paul.martin.updated@test.local', $user->email);
        $this->assertSame('Chef Guérite', $user->fonction);
        $this->assertTrue($user->hasRole('guerite'));
    }

    public function test_admin_can_toggle_user_status(): void
    {
        $user = User::factory()->create([
            'statut' => User::STATUS_ACTIVE,
            'created_by' => $this->admin->id,
        ]);

        // Toggle to inactive
        $this->actingAs($this->admin)->patch(route('admin.utilisateurs.toggle', $user))
            ->assertRedirect(route('admin.utilisateurs.index'));
        $user->refresh();
        $this->assertSame(User::STATUS_INACTIVE, $user->statut);

        // Toggle back to active
        $this->actingAs($this->admin)->patch(route('admin.utilisateurs.toggle', $user))
            ->assertRedirect(route('admin.utilisateurs.index'));
        $user->refresh();
        $this->assertSame(User::STATUS_ACTIVE, $user->statut);
    }

    public function test_admin_can_reset_user_password(): void
    {
        $user = User::factory()->create([
            'password' => Hash::make('OldPassword123!'),
            'must_change_password' => false,
            'created_by' => $this->admin->id,
        ]);

        $response = $this->actingAs($this->admin)->post(route('admin.utilisateurs.reset-password', $user));
        $response->assertRedirect(route('admin.utilisateurs.index'))
            ->assertSessionHas('tempPassword');

        $tempPassword = session('tempPassword');
        $this->assertNotEmpty($tempPassword);

        $user->refresh();
        $this->assertTrue($user->must_change_password);
        $this->assertTrue(Hash::check($tempPassword, $user->password));
    }

    public function test_admin_cannot_delete_self(): void
    {
        $response = $this->actingAs($this->admin)->delete(route('admin.utilisateurs.destroy', $this->admin));
        $response->assertRedirect();
        $response->assertSessionHas('error');

        $this->assertDatabaseHas('users', ['id' => $this->admin->id]);
    }

    public function test_admin_can_delete_other_user(): void
    {
        $user = User::factory()->create([
            'created_by' => $this->admin->id,
        ]);

        $response = $this->actingAs($this->admin)->delete(route('admin.utilisateurs.destroy', $user));
        $response->assertRedirect(route('admin.utilisateurs.index'))
            ->assertSessionHas('success');

        $this->assertDatabaseMissing('users', ['id' => $user->id]);
    }

    public function test_admin_cannot_manage_users_created_by_another_admin(): void
    {
        $otherAdmin = User::factory()->create(['email_verified_at' => now()]);
        $otherAdmin->assignRole(Role::create(['name' => 'admin_other', 'guard_name' => 'web']));

        $foreignUser = User::factory()->create([
            'created_by' => $otherAdmin->id,
            'prenom' => 'Foreign',
            'nom' => 'User',
        ]);

        // Index should not list foreign user
        $response = $this->actingAs($this->admin)->get(route('admin.utilisateurs.index'));
        $response->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Admin/Utilisateurs/Index')
                ->where('users.data', fn ($users) => collect($users)->pluck('id')->doesntContain($foreignUser->id))
            );

        // Update returns 403
        $this->actingAs($this->admin)->put(route('admin.utilisateurs.update', $foreignUser), [
            'prenom' => 'Hacked',
            'nom' => 'User',
            'email' => 'hacked@test.local',
            'role_id' => $this->role->id,
        ])->assertForbidden();

        // Toggle returns 403
        $this->actingAs($this->admin)->patch(route('admin.utilisateurs.toggle', $foreignUser))
            ->assertForbidden();

        // Reset password returns 403
        $this->actingAs($this->admin)->post(route('admin.utilisateurs.reset-password', $foreignUser))
            ->assertForbidden();

        // Delete returns 403
        $this->actingAs($this->admin)->delete(route('admin.utilisateurs.destroy', $foreignUser))
            ->assertForbidden();

        $this->assertDatabaseHas('users', ['id' => $foreignUser->id]);
    }
}

