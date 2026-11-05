<?php

namespace Tests\Feature;

use App\Models\Creneau;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class AdminCreneauManagementTest extends TestCase
{
    use RefreshDatabase;

    private function createAdmin(): User
    {
        $admin = User::factory()->create(['email_verified_at' => now()]);
        $adminRole = Role::firstOrCreate(['name' => 'admin', 'guard_name' => 'web']);
        $admin->assignRole($adminRole);

        return $admin;
    }

    public function test_guest_cannot_access_admin_creneaux(): void
    {
        $this->get(route('admin.creneaux.index'))->assertRedirect(route('login'));
        $this->post(route('admin.creneaux.batch'), [])->assertRedirect(route('login'));
    }

    public function test_non_admin_cannot_access_admin_creneaux(): void
    {
        $user = User::factory()->create(['email_verified_at' => now()]);

        $this->actingAs($user)->get(route('admin.creneaux.index'))->assertForbidden();
        $this->actingAs($user)->post(route('admin.creneaux.batch'), [])->assertForbidden();
    }

    public function test_admin_can_view_creneaux_index(): void
    {
        $admin = $this->createAdmin();

        $response = $this->actingAs($admin)->get(route('admin.creneaux.index'));
        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('Admin/Creneaux/Index')
            ->has('week')
            ->has('days')
            ->has('slots')
            ->has('stats')
        );
    }

    public function test_admin_can_batch_create_creneaux(): void
    {
        $admin = $this->createAdmin();

        $from = Carbon::now()->startOfWeek()->format('Y-m-d');
        $to = Carbon::now()->startOfWeek()->addDays(2)->format('Y-m-d');

        $response = $this->actingAs($admin)->post(route('admin.creneaux.batch'), [
            'from' => $from,
            'to' => $to,
            'days' => [1, 2, 3], // Mon, Tue, Wed
            'start_h' => 8,
            'end_h' => 12,
            'duration' => 2,
            'capacity' => 35,
        ]);

        $response->assertRedirect();
        $response->assertSessionHas('success');

        // 3 days * 2 slots per day (08:00-10:00, 10:00-12:00) = 6 slots
        $this->assertDatabaseCount('creneaux', 6);
        $this->assertDatabaseHas('creneaux', [
            'date' => $from,
            'start' => '08:00',
            'end' => '10:00',
            'capacity' => 35,
            'open' => true,
        ]);
    }

    public function test_batch_creation_skips_overlapping_slots(): void
    {
        $admin = $this->createAdmin();
        $date = Carbon::now()->startOfWeek()->format('Y-m-d');

        // Pre-create a slot
        Creneau::create([
            'date' => $date,
            'start' => '08:00',
            'end' => '10:00',
            'capacity' => 50,
            'open' => true,
        ]);

        // Attempt to create slots including 08:00-10:00
        $dayOfWeek = Carbon::parse($date)->dayOfWeek;
        $response = $this->actingAs($admin)->post(route('admin.creneaux.batch'), [
            'from' => $date,
            'to' => $date,
            'days' => [$dayOfWeek],
            'start_h' => 8,
            'end_h' => 12,
            'duration' => 2,
            'capacity' => 40,
        ]);

        $response->assertRedirect();
        // 1 existing kept + 1 new (10:00-12:00) = 2 total
        $this->assertDatabaseCount('creneaux', 2);
    }

    public function test_admin_can_update_a_creneau(): void
    {
        $admin = $this->createAdmin();
        $slot = Creneau::create([
            'date' => '2026-11-10',
            'start' => '08:00',
            'end' => '10:00',
            'capacity' => 40,
            'open' => true,
        ]);

        $response = $this->actingAs($admin)->put(route('admin.creneaux.update', $slot->id), [
            'capacity' => 25,
            'open' => false,
            'close_reason' => 'Maintenance portique',
            'start' => '08:00',
            'end' => '10:00',
        ]);

        $response->assertRedirect();
        $response->assertSessionHas('success');

        $this->assertDatabaseHas('creneaux', [
            'id' => $slot->id,
            'capacity' => 25,
            'open' => false,
            'close_reason' => 'Maintenance portique',
        ]);
    }

    public function test_admin_can_delete_a_creneau(): void
    {
        $admin = $this->createAdmin();
        $slot = Creneau::create([
            'date' => '2026-11-10',
            'start' => '14:00',
            'end' => '16:00',
            'capacity' => 40,
            'open' => true,
        ]);

        $response = $this->actingAs($admin)->delete(route('admin.creneaux.destroy', $slot->id));
        $response->assertRedirect();
        $response->assertSessionHas('success');

        $this->assertDatabaseMissing('creneaux', ['id' => $slot->id]);
    }
}

