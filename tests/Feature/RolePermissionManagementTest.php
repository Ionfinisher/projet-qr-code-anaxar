<?php

namespace Tests\Feature;

use Database\Seeders\PermissionSeeder;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use App\Models\User;
use Tests\TestCase;

class RolePermissionManagementTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_cannot_create_update_or_delete_permissions(): void
    {
        $this->seed(PermissionSeeder::class);

        $admin = User::factory()->create(['email_verified_at' => now()]);
        $admin->assignRole(Role::create(['name' => 'admin', 'guard_name' => 'web']));

        // Admin can view permissions index
        $response = $this->actingAs($admin)->get(route('admin.permissions.index'));
        $response->assertOk();

        // Only superadmin can create permissions (admin gets 403)
        $this->actingAs($admin)->post(route('admin.permissions.store'), ['name' => 'new.custom.permission'])
            ->assertForbidden();

        $existingPerm = Permission::firstOrFail();

        // Admin cannot update or delete permissions
        $this->actingAs($admin)->put(route('admin.permissions.update', $existingPerm), ['name' => 'updated.permission'])
            ->assertForbidden();

        $this->actingAs($admin)->delete(route('admin.permissions.destroy', $existingPerm))
            ->assertForbidden();
    }

    public function test_non_admin_cannot_manage_permissions(): void
    {
        $user = User::factory()->create(['email_verified_at' => now()]);

        $this->actingAs($user)->get(route('admin.permissions.index'))->assertForbidden();
        $this->actingAs($user)->post(route('admin.permissions.store'), ['name' => 'view reports'])->assertForbidden();
    }

    public function test_non_admin_cannot_manage_profiles(): void
    {
        $user = User::factory()->create(['email_verified_at' => now()]);
        $profile = Role::create(['name' => 'Manager', 'guard_name' => 'web']);

        $this->actingAs($user)->get(route('profiles.index'))->assertForbidden();
        $this->actingAs($user)->post(route('profiles.store'), ['name' => 'New Role'])->assertForbidden();
        $this->actingAs($user)->get(route('admin.profils.index'))->assertForbidden();
        $this->actingAs($user)->post(route('admin.profils.store'), ['name' => 'New Role', 'kind' => 'interne'])->assertForbidden();
        $this->actingAs($user)->put(route('admin.profils.update', $profile), ['name' => 'Renamed'])->assertForbidden();
        $this->actingAs($user)->delete(route('admin.profils.destroy', $profile))->assertForbidden();
    }

    public function test_admin_can_manage_own_profiles_and_assign_existing_permissions(): void
    {
        $this->seed(PermissionSeeder::class);

        $admin = User::factory()->create(['email_verified_at' => now()]);
        $admin->assignRole(Role::create(['name' => 'admin', 'guard_name' => 'web']));

        $response = $this->actingAs($admin)->get(route('admin.profils.index'));
        $response->assertOk();

        $response = $this->actingAs($admin)->post(route('admin.profils.store'), [
            'name' => 'Superviseur Guérite',
            'kind' => 'interne',
            'description' => 'Supervision guérite et barrières',
            'perms' => ['guerite.controle', 'guerite.supervision'],
        ]);
        $response->assertRedirect(route('admin.profils.index'));

        $created = Role::where('name', 'Superviseur Guérite')->firstOrFail();
        $this->assertSame('interne', $created->kind);
        $this->assertSame($admin->id, $created->created_by);
        $this->assertTrue($created->hasPermissionTo('guerite.controle'));
        $this->assertTrue($created->hasPermissionTo('guerite.supervision'));

        // Update profile
        $this->actingAs($admin)->put(route('admin.profils.update', $created), [
            'name' => 'Superviseur Modifié',
            'kind' => 'interne',
            'description' => 'Description modifiée',
            'perms' => ['guerite.controle'],
        ])->assertRedirect(route('admin.profils.index'));

        $created->refresh();
        $this->assertSame('Superviseur Modifié', $created->name);
        $this->assertTrue($created->hasPermissionTo('guerite.controle'));
        $this->assertFalse($created->hasPermissionTo('guerite.supervision'));

        // Delete profile
        $this->actingAs($admin)->delete(route('admin.profils.destroy', $created))
            ->assertRedirect(route('admin.profils.index'));
        $this->assertDatabaseMissing('roles', ['id' => $created->id]);
    }

    public function test_admin_cannot_manage_profiles_created_by_another_admin(): void
    {
        $admin1 = User::factory()->create(['email_verified_at' => now()]);
        $admin1->assignRole(Role::create(['name' => 'admin', 'guard_name' => 'web']));

        $admin2 = User::factory()->create(['email_verified_at' => now()]);
        $admin2->assignRole(Role::where('name', 'admin')->first());

        $foreignProfile = Role::create([
            'name' => 'Admin2 Profile',
            'kind' => 'interne',
            'guard_name' => 'web',
            'created_by' => $admin2->id,
        ]);

        // Admin1 index should not see Admin2 profile
        $response = $this->actingAs($admin1)->get(route('admin.profils.index'));
        $response->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Admin/Profils/Index')
                ->where('profiles', fn ($profiles) => collect($profiles)->pluck('id')->doesntContain($foreignProfile->id))
            );

        // Admin1 update returns 403
        $this->actingAs($admin1)->put(route('admin.profils.update', $foreignProfile), [
            'name' => 'Hijacked',
            'kind' => 'interne',
        ])->assertForbidden();

        // Admin1 delete returns 403
        $this->actingAs($admin1)->delete(route('admin.profils.destroy', $foreignProfile))
            ->assertForbidden();

        $this->assertDatabaseHas('roles', ['id' => $foreignProfile->id]);
    }

    public function test_profile_booleans_are_strictly_boolean(): void
    {
        $admin = User::factory()->create(['email_verified_at' => now()]);
        $admin->assignRole(Role::create(['name' => 'admin', 'guard_name' => 'web']));

        Role::create([
            'name' => 'Test Locked Profile',
            'kind' => 'interne',
            'guard_name' => 'web',
            'created_by' => $admin->id,
            'is_system' => 1,
            'is_locked' => 1,
        ]);

        $response = $this->actingAs($admin)->get(route('admin.profils.index'));
        $response->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Admin/Profils/Index')
                ->where('profiles', function ($profiles) {
                    $found = collect($profiles)->firstWhere('name', 'Test Locked Profile');
                    return $found !== null
                        && $found['is_locked'] === true
                        && $found['locked'] === true
                        && $found['is_system'] === true
                        && $found['system'] === true;
                })
            );
    }

    public function test_role_seeder_assigns_created_by_to_bureau_and_guerite_roles(): void
    {
        $admin = User::factory()->create([
            'email' => 'admin@test.local',
            'email_verified_at' => now(),
        ]);
        $admin->assignRole(Role::create(['name' => 'admin', 'guard_name' => 'web']));

        $this->seed(RoleSeeder::class);

        $bureau = Role::where('name', 'bureau')->firstOrFail();
        $guerite = Role::where('name', 'guerite')->firstOrFail();
        $adminRole = Role::where('name', 'admin')->firstOrFail();
        $transporteur = Role::where('name', 'transporteur')->firstOrFail();

        $this->assertSame($admin->id, $bureau->created_by);
        $this->assertSame($admin->id, $guerite->created_by);
        $this->assertNull($adminRole->created_by);
        $this->assertNull($transporteur->created_by);
    }
}
