<?php

namespace Tests\Feature;

use App\Models\Creneau;
use App\Models\DemandeCamion;
use App\Models\DemandeRdv;
use App\Models\User;
use App\Notifications\DemandeRdvDecided;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class AdminDemandeRdvTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        Notification::fake();
    }

    private function admin(): User
    {
        $admin = User::factory()->create(['email_verified_at' => now()]);
        $role = Role::firstOrCreate(['name' => 'admin', 'guard_name' => 'web']);
        $admin->assignRole($role);

        return $admin;
    }

    private function transporteur(): User
    {
        return User::factory()->transporteur()->create();
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

    public function test_non_admin_cannot_decide_a_demande(): void
    {
        $user = $this->transporteur();
        $demande = DemandeRdv::factory()->forUser($user)->forCreneau($this->slot())->create();

        $this->actingAs($user)
            ->post(route('admin.demandes.approve', $demande))
            ->assertForbidden();

        $this->actingAs($user)
            ->post(route('admin.demandes.reject', $demande), ['reason' => 'Test'])
            ->assertForbidden();
    }

    public function test_admin_can_approve_a_pending_demande(): void
    {
        $admin = $this->admin();
        $user = $this->transporteur();
        $slot = $this->slot();
        $demande = DemandeRdv::factory()->forUser($user)->forCreneau($slot)->create();
        DemandeCamion::factory()->forDemande($demande, 1)->create();

        $response = $this->actingAs($admin)->post(
            route('admin.demandes.approve', $demande),
            ['comment' => 'Dossier conforme']
        );

        $response->assertRedirect();
        $response->assertSessionHas('success');

        $this->assertDatabaseHas('demandes_rdv', [
            'id' => $demande->id,
            'status' => DemandeRdv::STATUS_APPROVED,
            'decided_by' => $admin->id,
            'decision_comment' => 'Dossier conforme',
        ]);
        $this->assertDatabaseHas('demande_evenements', [
            'demande_rdv_id' => $demande->id,
            'type' => 'validee',
        ]);
        Notification::assertSentTo($user, DemandeRdvDecided::class);
    }

    public function test_admin_can_reject_a_pending_demande(): void
    {
        $admin = $this->admin();
        $user = $this->transporteur();
        $slot = $this->slot();
        $demande = DemandeRdv::factory()->forUser($user)->forCreneau($slot)->create();
        DemandeCamion::factory()->forDemande($demande, 1)->create();

        $response = $this->actingAs($admin)->post(
            route('admin.demandes.reject', $demande),
            ['reason' => 'Conteneur non libéré', 'comment' => 'Revenez après libération']
        );

        $response->assertRedirect();
        $response->assertSessionHas('success');

        $this->assertDatabaseHas('demandes_rdv', [
            'id' => $demande->id,
            'status' => DemandeRdv::STATUS_REJECTED,
            'decided_by' => $admin->id,
            'rejection_reason' => 'Conteneur non libéré',
            'decision_comment' => 'Revenez après libération',
        ]);
        $this->assertDatabaseHas('demande_evenements', [
            'demande_rdv_id' => $demande->id,
            'type' => 'rejetee',
        ]);
        Notification::assertSentTo($user, DemandeRdvDecided::class);
    }

    public function test_admin_cannot_approve_when_the_slot_is_over_capacity(): void
    {
        $admin = $this->admin();
        $slot = $this->slot(['capacity' => 1]);

        $first = DemandeRdv::factory()->forUser($this->transporteur())->forCreneau($slot)->create();
        DemandeCamion::factory()->forDemande($first, 1)->create();

        $second = DemandeRdv::factory()->forUser($this->transporteur())->forCreneau($slot)->create();
        DemandeCamion::factory()->forDemande($second, 1)->create();

        $response = $this->actingAs($admin)->post(route('admin.demandes.approve', $second));

        $response->assertSessionHasErrors('demande');
        $this->assertDatabaseHas('demandes_rdv', [
            'id' => $second->id,
            'status' => DemandeRdv::STATUS_PENDING,
        ]);
    }

    public function test_admin_cannot_delete_a_slot_used_by_a_demande(): void
    {
        $admin = $this->admin();
        $slot = $this->slot();
        DemandeRdv::factory()->forCreneau($slot)->create();

        $response = $this->actingAs($admin)->delete(route('admin.creneaux.destroy', $slot->id));

        $response->assertRedirect();
        $response->assertSessionHas('error');
        $this->assertDatabaseHas('creneaux', ['id' => $slot->id]);
    }

    public function test_admin_creneaux_index_shows_real_usage(): void
    {
        $admin = $this->admin();
        $slot = $this->slot([
            'date' => Carbon::now()->startOfWeek()->addDays(2)->format('Y-m-d'),
            'capacity' => 10,
        ]);
        $demande = DemandeRdv::factory()->forCreneau($slot)->create();
        DemandeCamion::factory()->forDemande($demande, 1)->create();

        $response = $this->actingAs($admin)->get(route('admin.creneaux.index'));

        $response->assertOk()->assertInertia(fn ($page) => $page
            ->component('Admin/Creneaux/Index')
            ->where('slots.0.used', 1)
            ->where('stats.total_used', 1)
        );
    }
}
