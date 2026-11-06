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

    public function test_guest_cannot_access_admin_demandes(): void
    {
        $this->get(route('admin.demandes.index'))
            ->assertRedirect(route('login'));
    }

    public function test_non_admin_cannot_access_admin_demandes(): void
    {
        $user = $this->transporteur();

        $this->actingAs($user)
            ->get(route('admin.demandes.index'))
            ->assertForbidden();
    }

    public function test_admin_can_view_demandes_index(): void
    {
        $admin = $this->admin();
        $user = $this->transporteur();
        $slot = $this->slot();
        $demande = DemandeRdv::factory()->forUser($user)->forCreneau($slot)->create();
        DemandeCamion::factory()->forDemande($demande, 1)->create();

        $response = $this->actingAs($admin)->get(route('admin.demandes.index'));

        $response->assertOk()->assertInertia(fn ($page) => $page
            ->component('Admin/Demandes/Index')
            ->has('demandes', 1)
            ->where('demandes.0.reference', $demande->reference)
            ->has('counts')
            ->where('counts.en_attente', 1)
            ->where('counts.all', 1)
        );
    }

    public function test_admin_can_filter_demandes_by_status_and_search(): void
    {
        $admin = $this->admin();
        $user = $this->transporteur();
        $slot = $this->slot();

        $pending = DemandeRdv::factory()->forUser($user)->forCreneau($slot)->create(['reference' => 'DR-AAAAAA']);
        DemandeCamion::factory()->forDemande($pending, 1)->create(['container_number' => 'MSCU1234567']);

        $approved = DemandeRdv::factory()->forUser($user)->forCreneau($slot)->create([
            'reference' => 'DR-BBBBBB',
            'status' => DemandeRdv::STATUS_APPROVED,
        ]);
        DemandeCamion::factory()->forDemande($approved, 1)->create(['container_number' => 'CMAU7654321']);

        // Filter: validee
        $response = $this->actingAs($admin)->get(route('admin.demandes.index', ['status' => 'validee']));
        $response->assertOk()->assertInertia(fn ($page) => $page
            ->component('Admin/Demandes/Index')
            ->has('demandes', 1)
            ->where('demandes.0.reference', 'DR-BBBBBB')
        );

        // Search by container number
        $searchResponse = $this->actingAs($admin)->get(route('admin.demandes.index', ['status' => 'all', 'q' => 'MSCU1234567']));
        $searchResponse->assertOk()->assertInertia(fn ($page) => $page
            ->component('Admin/Demandes/Index')
            ->has('demandes', 1)
            ->where('demandes.0.reference', 'DR-AAAAAA')
        );
    }

    public function test_admin_can_view_specific_demande_in_drawer(): void
    {
        $admin = $this->admin();
        $user = $this->transporteur();
        $slot = $this->slot();
        $demande = DemandeRdv::factory()->forUser($user)->forCreneau($slot)->create();
        DemandeCamion::factory()->forDemande($demande, 1)->create();

        $response = $this->actingAs($admin)->get(route('admin.demandes.index', ['id' => $demande->reference]));

        $response->assertOk()->assertInertia(fn ($page) => $page
            ->component('Admin/Demandes/Index')
            ->where('selected.reference', $demande->reference)
        );
    }

    public function test_admin_can_download_demande_document(): void
    {
        \Illuminate\Support\Facades\Storage::fake('local');

        $admin = $this->admin();
        $user = $this->transporteur();
        $slot = $this->slot();
        $demande = DemandeRdv::factory()->forUser($user)->forCreneau($slot)->create();

        $path = 'demandes/test.pdf';
        \Illuminate\Support\Facades\Storage::disk('local')->put($path, 'test content');

        $document = \App\Models\DemandeDocument::create([
            'demande_rdv_id' => $demande->id,
            'user_id' => $user->id,
            'type' => 'bc',
            'original_name' => 'bon_commande.pdf',
            'path' => $path,
            'mime' => 'application/pdf',
            'size' => 12,
            'sha256' => hash('sha256', 'test content'),
        ]);

        $response = $this->actingAs($admin)->get(route('admin.demandes.documents.download', [$demande, $document]));

        $response->assertOk();
    }
}
