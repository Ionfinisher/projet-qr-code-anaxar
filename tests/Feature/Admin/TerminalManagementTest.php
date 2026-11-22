<?php

namespace Tests\Feature\Admin;

use App\Models\Creneau;
use App\Models\Terminal;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class TerminalManagementTest extends TestCase
{
    use RefreshDatabase;

    private function createAdmin(): User
    {
        $admin = User::factory()->create(['email_verified_at' => now()]);
        $adminRole = Role::firstOrCreate(['name' => 'admin', 'guard_name' => 'web']);
        $admin->assignRole($adminRole);

        return $admin;
    }

    private function createTransporteur(): User
    {
        return User::factory()->transporteur()->create();
    }

    public function test_guest_cannot_access_terminals(): void
    {
        $this->get(route('admin.terminals.index'))->assertRedirect(route('login'));
        $this->post(route('admin.terminals.store'), [])->assertRedirect(route('login'));
    }

    public function test_non_admin_cannot_access_terminals(): void
    {
        $user = $this->createTransporteur();

        $this->actingAs($user)->get(route('admin.terminals.index'))->assertForbidden();
        $this->actingAs($user)->post(route('admin.terminals.store'), [
            'label' => 'Terminal 1',
            'code' => 'T1',
            'statut' => 'active',
        ])->assertForbidden();
    }

    public function test_admin_can_view_terminals_index(): void
    {
        $admin = $this->createAdmin();

        $response = $this->actingAs($admin)->get(route('admin.terminals.index'));

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('Admin/Terminals/Index')
            ->has('terminals')
        );
    }

    public function test_admin_can_create_terminal(): void
    {
        $admin = $this->createAdmin();

        $response = $this->actingAs($admin)->post(route('admin.terminals.store'), [
            'label' => 'Togo Terminal',
            'short' => 'TGT',
            'code' => 'tgt', // should be normalized to uppercase TGT
            'statut' => 'active',
        ]);

        $response->assertRedirect();
        $response->assertSessionHas('success');

        $this->assertDatabaseHas('terminals', [
            'label' => 'Togo Terminal',
            'short' => 'TGT',
            'code' => 'TGT',
            'statut' => 'active',
            'created_by' => $admin->id,
        ]);
    }

    public function test_admin_can_update_terminal(): void
    {
        $admin = $this->createAdmin();
        $terminal = Terminal::factory()->create([
            'label' => 'Old Label',
            'short' => 'OLD',
            'code' => 'OLD',
            'statut' => 'active',
        ]);

        $response = $this->actingAs($admin)->put(route('admin.terminals.update', $terminal->id), [
            'label' => 'New Label',
            'short' => 'NEW',
            'code' => 'NEW',
            'statut' => 'inactive',
        ]);

        $response->assertRedirect();
        $response->assertSessionHas('success');

        $this->assertDatabaseHas('terminals', [
            'id' => $terminal->id,
            'label' => 'New Label',
            'short' => 'NEW',
            'code' => 'NEW',
            'statut' => 'inactive',
            'updated_by' => $admin->id,
        ]);
    }

    public function test_admin_can_delete_unused_terminal(): void
    {
        $admin = $this->createAdmin();
        $terminal = Terminal::factory()->create();

        $response = $this->actingAs($admin)->delete(route('admin.terminals.destroy', $terminal->id));

        $response->assertRedirect();
        $response->assertSessionHas('success');
        $this->assertDatabaseMissing('terminals', ['id' => $terminal->id]);
    }

    public function test_admin_cannot_delete_terminal_with_creneaux(): void
    {
        $admin = $this->createAdmin();
        $terminal = Terminal::factory()->create();
        Creneau::factory()->create(['terminal_id' => $terminal->id]);

        $response = $this->actingAs($admin)->delete(route('admin.terminals.destroy', $terminal->id));

        $response->assertRedirect();
        $response->assertSessionHas('error');
        $this->assertDatabaseHas('terminals', ['id' => $terminal->id]);
    }

    public function test_terminal_code_must_be_unique(): void
    {
        $admin = $this->createAdmin();
        $existing = Terminal::firstOrCreate(
            ['code' => 'LCT'],
            ['short' => 'LCT', 'label' => 'Lomé Container Terminal', 'statut' => 'active']
        );

        $response = $this->actingAs($admin)->post(route('admin.terminals.store'), [
            'label' => 'Another LCT',
            'short' => 'LCT2',
            'code' => 'LCT',
            'statut' => 'active',
        ]);

        $response->assertSessionHasErrors(['code']);
    }
}

