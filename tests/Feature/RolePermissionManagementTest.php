<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use App\Models\User;
use Tests\TestCase;

class RolePermissionManagementTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_manage_permissions(): void
    {
        $admin = User::factory()->create(['email_verified_at' => now()]);
        $admin->assignRole(Role::create(['name' => 'admin', 'guard_name' => 'web']));

        $response = $this->actingAs($admin)->post(route('admin.permissions.store'), ['name' => 'view reports']);
        $response->assertRedirect();
        $permission = Permission::where('name', 'view reports')->firstOrFail();

        $this->actingAs($admin)->put(route('admin.permissions.update', $permission), ['name' => 'view dashboards'])
            ->assertRedirect();
        $this->assertDatabaseHas('permissions', ['id' => $permission->id, 'name' => 'view dashboards']);

        $this->actingAs($admin)->delete(route('admin.permissions.destroy', $permission))
            ->assertRedirect();
        $this->assertDatabaseMissing('permissions', ['id' => $permission->id]);
    }

    public function test_non_admin_cannot_manage_permissions(): void
    {
        $user = User::factory()->create(['email_verified_at' => now()]);

        $this->actingAs($user)->get(route('admin.permissions.index'))->assertForbidden();
        $this->actingAs($user)->post(route('admin.permissions.store'), ['name' => 'view reports'])->assertForbidden();
    }

    public function test_user_can_manage_only_owned_profiles_and_assign_permissions(): void
    {
        $owner = User::factory()->create(['email_verified_at' => now()]);
        $other = User::factory()->create(['email_verified_at' => now()]);
        $permission = Permission::create(['name' => 'view reports', 'guard_name' => 'web']);
        $profile = Role::create(['name' => 'Manager', 'guard_name' => 'web', 'created_by' => $owner->id]);
        $foreignProfile = Role::create(['name' => 'Foreign', 'guard_name' => 'web', 'created_by' => $other->id]);

        $this->actingAs($owner)->get(route('profiles.index'))->assertOk();
        $this->actingAs($owner)->post(route('profiles.store'), [
            'name' => 'Supervisor',
            'permissions' => [$permission->id],
        ])->assertRedirect(route('profiles.index'));

        $created = Role::where('name', 'Supervisor')->firstOrFail();
        $this->assertTrue($created->hasPermissionTo($permission));

        $this->actingAs($owner)->get(route('profiles.edit', $foreignProfile))->assertForbidden();
        $this->actingAs($owner)->delete(route('profiles.destroy', $foreignProfile))->assertForbidden();
        $this->actingAs($owner)->put(route('profiles.update', $profile), [
            'name' => 'Manager Updated',
            'permissions' => [$permission->id],
        ])->assertRedirect(route('profiles.index'));
    }
}
