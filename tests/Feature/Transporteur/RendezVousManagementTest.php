<?php

namespace Tests\Feature\Transporteur;

use App\Models\Creneau;
use App\Models\DemandeCamion;
use App\Models\DemandeRdv;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RendezVousManagementTest extends TestCase
{
    use RefreshDatabase;

    private function transporteur(array $attributes = []): User
    {
        return User::factory()->transporteur()->create(array_merge([
            'email_verified_at' => now(),
            'statut' => User::STATUS_APPROVED,
        ], $attributes));
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

    public function test_guest_cannot_access_transporteur_rendez_vous(): void
    {
        $this->get(route('transporteur.rdv.index'))
            ->assertRedirect(route('login'));
    }

    public function test_unapproved_transporteur_cannot_access_rendez_vous(): void
    {
        $user = $this->transporteur(['statut' => User::STATUS_PENDING]);

        $this->actingAs($user)
            ->get(route('transporteur.rdv.index'))
            ->assertForbidden();
    }

    public function test_transporteur_can_view_validated_rendez_vous_with_qr_token(): void
    {
        $user = $this->transporteur();
        $slot = $this->slot();

        // Approved request
        $demande = DemandeRdv::factory()->forUser($user)->forCreneau($slot)->create([
            'status' => DemandeRdv::STATUS_APPROVED,
            'reference' => 'DR-CONF01',
            'decided_at' => now(),
        ]);
        $camion = DemandeCamion::factory()->forDemande($demande, 1)->create([
            'container_number' => 'MSCU1234567',
            'driver_first' => 'John',
            'driver_last' => 'Doe',
        ]);

        // Pending request should not show in RDVs
        $pendingDemande = DemandeRdv::factory()->forUser($user)->forCreneau($slot)->create([
            'status' => DemandeRdv::STATUS_PENDING,
            'reference' => 'DR-PEND01',
        ]);
        DemandeCamion::factory()->forDemande($pendingDemande, 1)->create();

        $response = $this->actingAs($user)->get(route('transporteur.rdv.index'));

        $response->assertOk()->assertInertia(fn ($page) => $page
            ->component('Transporteur/RendezVous/Index')
            ->has('rdvs', 1)
            ->where('rdvs.0.demandeId', 'DR-CONF01')
            ->where('rdvs.0.container.number', 'MSCU1234567')
            ->where('counts.all', 1)
            ->has('rdvs.0.token') // QR signed token present!
        );
    }

    public function test_transporteur_cannot_see_other_transporteur_rendez_vous(): void
    {
        $user1 = $this->transporteur();
        $user2 = $this->transporteur();
        $slot = $this->slot();

        $demande1 = DemandeRdv::factory()->forUser($user1)->forCreneau($slot)->create([
            'status' => DemandeRdv::STATUS_APPROVED,
        ]);
        DemandeCamion::factory()->forDemande($demande1, 1)->create();

        $demande2 = DemandeRdv::factory()->forUser($user2)->forCreneau($slot)->create([
            'status' => DemandeRdv::STATUS_APPROVED,
        ]);
        DemandeCamion::factory()->forDemande($demande2, 1)->create();

        $response = $this->actingAs($user1)->get(route('transporteur.rdv.index'));

        $response->assertOk()->assertInertia(fn ($page) => $page
            ->component('Transporteur/RendezVous/Index')
            ->has('rdvs', 1)
            ->where('rdvs.0.demandeId', $demande1->reference)
        );
    }

    public function test_transporteur_can_filter_and_search_rendez_vous(): void
    {
        $user = $this->transporteur();
        $slot = $this->slot();

        $demande = DemandeRdv::factory()->forUser($user)->forCreneau($slot)->create([
            'status' => DemandeRdv::STATUS_APPROVED,
            'reference' => 'DR-SRCH01',
        ]);
        DemandeCamion::factory()->forDemande($demande, 1)->create([
            'container_number' => 'CMAU9999999',
            'driver_first' => 'Ablam',
            'driver_last' => 'Koffi',
        ]);

        $searchResponse = $this->actingAs($user)->get(route('transporteur.rdv.index', ['q' => 'Ablam']));

        $searchResponse->assertOk()->assertInertia(fn ($page) => $page
            ->component('Transporteur/RendezVous/Index')
            ->has('rdvs', 1)
            ->where('rdvs.0.driver.first', 'Ablam')
        );
    }
}

