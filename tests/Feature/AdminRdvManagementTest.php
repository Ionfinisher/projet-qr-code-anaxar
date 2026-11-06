<?php

namespace Tests\Feature;

use App\Models\Creneau;
use App\Models\DemandeCamion;
use App\Models\DemandeRdv;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class AdminRdvManagementTest extends TestCase
{
    use RefreshDatabase;

    private function admin(): User
    {
        $admin = User::factory()->create(['email_verified_at' => now()]);
        $role = Role::firstOrCreate(['name' => 'admin', 'guard_name' => 'web']);
        $admin->assignRole($role);

        return $admin;
    }

    private function transporteur(): User
    {
        return User::factory()->transporteur()->create([
            'email_verified_at' => now(),
            'statut' => User::STATUS_APPROVED,
        ]);
    }

    private function slot(array $attributes = []): Creneau
    {
        $start = $attributes['start'] ?? '08:00';
        $end = $attributes['end'] ?? Carbon::createFromFormat('H:i', $start)->addHours(2)->format('H:i');

        return Creneau::factory()->create(array_merge([
            'date' => now()->addDay()->format('Y-m-d'),
            'start' => $start,
            'end' => $end,
            'capacity' => 40,
        ], $attributes));
    }

    public function test_guest_cannot_access_admin_rendez_vous(): void
    {
        $this->get(route('admin.rdv.index'))
            ->assertRedirect(route('login'));
    }

    public function test_non_admin_cannot_access_admin_rendez_vous(): void
    {
        $user = $this->transporteur();

        $this->actingAs($user)
            ->get(route('admin.rdv.index'))
            ->assertForbidden();
    }

    public function test_admin_can_view_all_validated_rendez_vous_with_qr_token(): void
    {
        $admin = $this->admin();
        $user1 = $this->transporteur();
        $user2 = $this->transporteur();
        $slot = $this->slot();

        $demande1 = DemandeRdv::factory()->forUser($user1)->forCreneau($slot)->create([
            'status' => DemandeRdv::STATUS_APPROVED,
            'reference' => 'DR-ADM001',
            'decided_at' => now(),
        ]);
        DemandeCamion::factory()->forDemande($demande1, 1)->create([
            'container_number' => 'MSCU1111111',
        ]);

        $demande2 = DemandeRdv::factory()->forUser($user2)->forCreneau($slot)->create([
            'status' => DemandeRdv::STATUS_APPROVED,
            'reference' => 'DR-ADM002',
            'decided_at' => now(),
        ]);
        DemandeCamion::factory()->forDemande($demande2, 1)->create([
            'container_number' => 'CMAU2222222',
        ]);

        // Pending demande should not show up
        $demandePending = DemandeRdv::factory()->forUser($user1)->forCreneau($slot)->create([
            'status' => DemandeRdv::STATUS_PENDING,
        ]);
        DemandeCamion::factory()->forDemande($demandePending, 1)->create();

        $response = $this->actingAs($admin)->get(route('admin.rdv.index'));

        $response->assertOk()->assertInertia(fn ($page) => $page
            ->component('Admin/Rdv/Index')
            ->has('rdvs', 2)
            ->where('counts.all', 2)
            ->has('rdvs.0.token')
            ->has('rdvs.1.token')
        );
    }

    public function test_admin_can_search_and_filter_rendez_vous(): void
    {
        $admin = $this->admin();
        $user = $this->transporteur();
        $slot = $this->slot();

        $demande = DemandeRdv::factory()->forUser($user)->forCreneau($slot)->create([
            'status' => DemandeRdv::STATUS_APPROVED,
            'reference' => 'DR-SEARCH',
            'decided_at' => now(),
        ]);
        DemandeCamion::factory()->forDemande($demande, 1)->create([
            'container_number' => 'MEDU3333333',
            'driver_first' => 'Foli',
        ]);

        $searchResponse = $this->actingAs($admin)->get(route('admin.rdv.index', ['q' => 'Foli']));

        $searchResponse->assertOk()->assertInertia(fn ($page) => $page
            ->component('Admin/Rdv/Index')
            ->has('rdvs', 1)
            ->where('rdvs.0.driver.first', 'Foli')
        );
    }
}

