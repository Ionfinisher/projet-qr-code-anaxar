<?php

namespace Tests\Feature\Admin;

use App\Models\Creneau;
use App\Models\DemandeCamion;
use App\Models\DemandeDocument;
use App\Models\DemandeRdv;
use App\Models\User;
use App\Services\CreneauUsageService;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class DemandeDocumentValidationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('local');
    }

    private function createAdmin(): User
    {
        $admin = User::factory()->create(['email_verified_at' => now()]);
        $role = Role::firstOrCreate(['name' => 'admin', 'guard_name' => 'web']);
        $admin->assignRole($role);

        return $admin;
    }

    private function createTransporteur(): User
    {
        return User::factory()->transporteur()->create([
            'email_verified_at' => now(),
            'statut' => User::STATUS_APPROVED,
        ]);
    }

    private function createSlot(): Creneau
    {
        return Creneau::factory()->create([
            'date' => Carbon::now()->addDays(2)->format('Y-m-d'),
            'start' => '08:00',
            'end' => '10:00',
            'capacity' => 20,
            'open' => true,
        ]);
    }

    public function test_admin_can_preview_document_but_not_download(): void
    {
        $admin = $this->createAdmin();
        $transporteur = $this->createTransporteur();
        $slot = $this->createSlot();

        $demande = DemandeRdv::factory()->forUser($transporteur)->forCreneau($slot)->create([
            'status' => DemandeRdv::STATUS_APPROVED,
        ]);

        $filePath = 'demandes/' . $demande->id . '/test.pdf';
        Storage::disk('local')->put($filePath, 'PDF CONTENT');

        $doc = DemandeDocument::create([
            'demande_rdv_id' => $demande->id,
            'type' => 'BL',
            'original_name' => 'connaissement.pdf',
            'path' => $filePath,
            'mime' => 'application/pdf',
            'size' => 11,
            'sha256' => hash('sha256', 'PDF CONTENT'),
            'statut' => DemandeDocument::STATUT_EN_ATTENTE,
        ]);

        $response = $this->actingAs($admin)->get(route('admin.demandes.documents.preview', [$demande, $doc]));
        $response->assertOk();
        $this->assertStringContainsString('inline', $response->headers->get('content-disposition'));
    }

    public function test_admin_can_validate_documents_on_pending_demande_and_last_document_triggers_approval(): void
    {
        $admin = $this->createAdmin();
        $transporteur = $this->createTransporteur();
        $slot = $this->createSlot();

        $demande = DemandeRdv::factory()->forUser($transporteur)->forCreneau($slot)->create([
            'status' => DemandeRdv::STATUS_PENDING,
        ]);

        $camion = DemandeCamion::factory()->forDemande($demande, 1)->create();

        $doc1 = DemandeDocument::create([
            'demande_rdv_id' => $demande->id,
            'demande_camion_id' => $camion->id,
            'type' => 'BL',
            'original_name' => 'bl.pdf',
            'path' => 'bl.pdf',
            'mime' => 'application/pdf',
            'size' => 10,
            'sha256' => 'abc',
            'statut' => DemandeDocument::STATUT_EN_ATTENTE,
        ]);

        $doc2 = DemandeDocument::create([
            'demande_rdv_id' => $demande->id,
            'demande_camion_id' => $camion->id,
            'type' => 'CG',
            'original_name' => 'cg.pdf',
            'path' => 'cg.pdf',
            'mime' => 'application/pdf',
            'size' => 10,
            'sha256' => 'def',
            'statut' => DemandeDocument::STATUT_EN_ATTENTE,
        ]);

        // Initially pending and not approved
        $this->assertEquals(DemandeRdv::STATUS_PENDING, $demande->fresh()->status);
        $this->assertFalse($demande->fresh()->hasAllDocumentsValidated());

        // Validate doc 1
        $res1 = $this->actingAs($admin)->post(route('admin.demandes.documents.validate', [$demande, $doc1]));
        $res1->assertRedirect();
        $this->assertEquals(DemandeDocument::STATUT_VALIDE, $doc1->fresh()->statut);
        $this->assertEquals($admin->id, $doc1->fresh()->validated_by);

        // Still pending because doc2 is not validated yet
        $this->assertEquals(DemandeRdv::STATUS_PENDING, $demande->fresh()->status);
        $this->assertFalse($demande->fresh()->hasAllDocumentsValidated());

        // Validate doc 2 (the last document)
        $res2 = $this->actingAs($admin)->post(route('admin.demandes.documents.validate', [$demande, $doc2]));
        $res2->assertRedirect();
        $this->assertEquals(DemandeDocument::STATUT_VALIDE, $doc2->fresh()->statut);

        // Now demande is automatically approved and all documents are validated
        $freshDemande = $demande->fresh();
        $this->assertEquals(DemandeRdv::STATUS_APPROVED, $freshDemande->status);
        $this->assertTrue($freshDemande->hasAllDocumentsValidated());
        $this->assertNotNull($freshDemande->decided_at);
        $this->assertEquals($admin->id, $freshDemande->decided_by);
    }

    public function test_each_truck_can_be_approved_and_issued_a_qr_independently(): void
    {
        $admin = $this->createAdmin();
        $transporteur = $this->createTransporteur();
        $slot = $this->createSlot();
        $demande = DemandeRdv::factory()->forUser($transporteur)->forCreneau($slot)->create();
        $firstTruck = DemandeCamion::factory()->forDemande($demande, 1)->create();
        $secondTruck = DemandeCamion::factory()->forDemande($demande, 2)->create();

        foreach ([$firstTruck, $secondTruck] as $truck) {
            foreach (['BL', 'CG'] as $type) {
                DemandeDocument::create([
                    'demande_rdv_id' => $demande->id,
                    'demande_camion_id' => $truck->id,
                    'type' => $type,
                    'original_name' => "{$type}.pdf",
                    'path' => "{$truck->id}-{$type}.pdf",
                    'mime' => 'application/pdf',
                    'size' => 10,
                    'sha256' => hash('sha256', "{$truck->id}-{$type}"),
                    'statut' => DemandeDocument::STATUT_EN_ATTENTE,
                ]);
            }
        }

        foreach ($firstTruck->documents as $document) {
            $this->actingAs($admin)
                ->post(route('admin.demandes.documents.validate', [$demande, $document]))
                ->assertRedirect();
        }

        $this->assertSame(DemandeCamion::REVIEW_APPROVED, $firstTruck->fresh()->review_status);
        $this->assertSame(DemandeCamion::REVIEW_PENDING, $secondTruck->fresh()->review_status);
        $this->assertSame(DemandeRdv::STATUS_PARTIALLY_APPROVED, $demande->fresh()->status);
        $this->assertSame(1, count($demande->fresh()->load('camions.documents')->camions->filter(
            fn (DemandeCamion $truck) => $truck->isApproved() && $truck->hasAllDocumentsValidated()
        )));

        $rdvs = $this->actingAs($transporteur)->get(route('transporteur.rdv.index'));
        $rdvs->assertOk()->assertInertia(fn ($page) => $page->has('rdvs', 1));

        $usage = app(CreneauUsageService::class)->forCreneau($slot);
        $this->assertSame(1, $usage['approved']);
        $this->assertSame(1, $usage['pending']);
        $this->assertSame(2, $usage['used']);
    }

    public function test_document_cannot_be_validated_if_demande_is_cancelled_or_rejected(): void
    {
        $admin = $this->createAdmin();
        $transporteur = $this->createTransporteur();
        $slot = $this->createSlot();

        $demande = DemandeRdv::factory()->forUser($transporteur)->forCreneau($slot)->create([
            'status' => DemandeRdv::STATUS_REJECTED,
        ]);

        $doc = DemandeDocument::create([
            'demande_rdv_id' => $demande->id,
            'type' => 'BL',
            'original_name' => 'bl.pdf',
            'path' => 'bl.pdf',
            'mime' => 'application/pdf',
            'size' => 10,
            'sha256' => 'abc',
            'statut' => DemandeDocument::STATUT_EN_ATTENTE,
        ]);

        $response = $this->actingAs($admin)->post(route('admin.demandes.documents.validate', [$demande, $doc]));
        $response->assertSessionHasErrors(['document']);
        $this->assertEquals(DemandeDocument::STATUT_EN_ATTENTE, $doc->fresh()->statut);
    }
}

