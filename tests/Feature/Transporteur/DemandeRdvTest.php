<?php

namespace Tests\Feature\Transporteur;

use App\Models\Creneau;
use App\Models\DemandeCamion;
use App\Models\DemandeDocument;
use App\Models\DemandeRdv;
use App\Models\TemporaryUpload;
use App\Models\User;
use App\Notifications\DemandeRdvSubmitted;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class DemandeRdvTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        Storage::fake('local');
        Notification::fake();
    }

    private function transporteur(array $attributes = []): User
    {
        return User::factory()->transporteur()->create($attributes);
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

    /**
     * @return array<string, string>
     */
    private function uploadDocuments(User $user): array
    {
        $docs = [];

        foreach (DemandeRdv::DOC_TYPES as $type) {
            $response = $this->actingAs($user)->post(route('transporteur.uploads.store'), [
                'type' => $type,
                'file' => UploadedFile::fake()->create($type.'.pdf', 50, 'application/pdf'),
            ]);

            $response->assertCreated();
            $docs[$type] = $response->json('token');
        }

        return $docs;
    }

    /**
     * @return array<string, mixed>
     */
    private function truck(int $index = 1): array
    {
        $containers = ['MSCU4829130', 'CSQU3054383', 'TGHU1234567'];
        $container = $containers[($index - 1) % count($containers)];

        return [
            'driver' => [
                'first' => 'Jean'.$index,
                'last' => 'DUPONT'.$index,
                'phone' => '+22890123456',
                'license' => 'LIC1234'.$index,
            ],
            'vehicle' => [
                'country' => 'TG',
                'tractor' => 'TG 1234 A'.$index,
                'trailer' => '',
            ],
            'container' => [
                'number' => $container,
                'iso' => '45G1',
                'bl' => 'BL12345'.$index,
                'goods' => 'Ciment',
                'vgm' => '',
            ],
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function payload(Creneau $slot, array $overrides = []): array
    {
        return array_merge([
            'op' => 'IMP',
            'terminal' => 'LCT',
            'date' => $slot->date->format('Y-m-d'),
            'start' => $slot->start,
            'notes' => 'Livraison test',
            'transitaire' => null,
            'mandated' => [
                'type' => 'entreprise',
                'company' => '',
                'first' => '',
                'last' => '',
                'phone' => '',
            ],
            'trucks' => [$this->truck(1)],
            'docs' => [],
        ], $overrides);
    }

    private function attachDocuments(DemandeRdv $demande): void
    {
        foreach (DemandeRdv::DOC_TYPES as $type) {
            $content = 'doc-'.$type;
            $path = "rendez-vous/{$demande->id}/{$type}.pdf";
            Storage::disk('local')->put($path, $content);

            $demande->documents()->create([
                'type' => $type,
                'original_name' => $type.'.pdf',
                'path' => $path,
                'mime' => 'application/pdf',
                'size' => strlen($content),
                'sha256' => hash('sha256', $content),
            ]);
        }
    }

    /**
     * @return array<string, int>
     */
    private function documentIds(DemandeRdv $demande): array
    {
        return $demande->documents()->pluck('id', 'type')->all();
    }

    public function test_guest_cannot_access_transporteur_space(): void
    {
        $this->get(route('transporteur.creneaux.index'))->assertRedirect(route('login'));
        $this->get(route('transporteur.demandes.index'))->assertRedirect(route('login'));
    }

    public function test_non_transporteur_cannot_access_transporteur_space(): void
    {
        $user = User::factory()->create(['email_verified_at' => now()]);

        $this->actingAs($user)->get(route('transporteur.creneaux.index'))->assertForbidden();
        $this->actingAs($user)->get(route('transporteur.demandes.index'))->assertForbidden();
    }

    public function test_unapproved_transporteur_cannot_access_transporteur_space(): void
    {
        $user = User::factory()->transporteur()->create(['statut' => User::STATUS_PENDING]);

        $this->actingAs($user)->get(route('transporteur.creneaux.index'))->assertForbidden();
    }

    public function test_transporteur_can_view_slots_with_real_usage(): void
    {
        $user = $this->transporteur();
        $slot = $this->slot(['capacity' => 5]);
        $other = $this->transporteur();

        $pending = DemandeRdv::factory()->forUser($other)->forCreneau($slot)->create();
        DemandeCamion::factory()->forDemande($pending, 1)->create();
        DemandeCamion::factory()->forDemande($pending, 2)->create();

        $approved = DemandeRdv::factory()->forUser($other)->forCreneau($slot)->approved()->create();
        DemandeCamion::factory()->forDemande($approved, 1)->create();

        $response = $this->actingAs($user)->get(route('transporteur.creneaux.index'));

        $response->assertOk()->assertInertia(fn ($page) => $page
            ->component('Transporteur/Creneaux/Index', false)
            ->has('slots', 1)
            ->where('slots.0.pending', 2)
            ->where('slots.0.approved', 1)
            ->where('slots.0.used', 3)
            ->where('slots.0.remaining', 2)
            ->where('me.acct', 'societe')
        );
    }

    public function test_transporteur_pages_render_with_expected_props(): void
    {
        $user = $this->transporteur();
        $slot = $this->slot();
        $demande = DemandeRdv::factory()->forUser($user)->forCreneau($slot)->create();
        DemandeCamion::factory()->forDemande($demande)->create();
        $this->attachDocuments($demande);

        $this->actingAs($user)
            ->get(route('transporteur.demandes.index'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Transporteur/Demandes/Index')
                ->has('demandes.data', 1)
                ->where('demandes.data.0.reference', $demande->reference)
                ->where('counts.all', 1)
                ->where('filters.status', 'all')
                ->where('selected', null)
                ->where('me.acct', 'societe')
            );

        $this->actingAs($user)
            ->get(route('transporteur.demandes.index', ['demande' => $demande->reference]))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Transporteur/Demandes/Index')
                ->where('selected.reference', $demande->reference)
                ->has('selected.trucks', 1)
                ->has('selected.usage')
            );

        $this->actingAs($user)
            ->get(route('transporteur.demandes.create', [
                'date' => $slot->date->format('Y-m-d'),
                'start' => $slot->start,
            ]))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Transporteur/Demandes/Create')
                ->has('slots')
                ->where('initialSlot.date', $slot->date->format('Y-m-d'))
                ->where('initialSlot.start', $slot->start)
            );

        $this->actingAs($user)
            ->get(route('transporteur.demandes.sent', $demande))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Transporteur/Demandes/Sent')
                ->where('demande.reference', $demande->reference)
                ->where('notified_email', $user->email)
                ->where('edited', false)
            );

        $this->actingAs($user)
            ->get(route('transporteur.demandes.edit', $demande))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Transporteur/Demandes/Edit')
                ->where('demande.reference', $demande->reference)
                ->where('demande.status', DemandeRdv::STATUS_PENDING)
                ->has('slots')
            );
    }

    public function test_transporteur_can_view_a_demande_detail_page(): void
    {
        $user = $this->transporteur();
        $slot = $this->slot();
        $demande = DemandeRdv::factory()->forUser($user)->forCreneau($slot)->create();
        DemandeCamion::factory()->forDemande($demande)->create();

        $this->actingAs($user)
            ->get(route('transporteur.demandes.show', $demande))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Transporteur/Demandes/Show')
                ->where('demande.reference', $demande->reference)
                ->has('demande.trucks', 1)
            );
    }

    public function test_transporteur_can_create_a_demande_with_documents(): void
    {
        $user = $this->transporteur();
        $slot = $this->slot(['capacity' => 10]);
        $docs = $this->uploadDocuments($user);

        $response = $this->actingAs($user)->post(
            route('transporteur.demandes.store'),
            $this->payload($slot, ['docs' => $docs])
        );

        $demande = DemandeRdv::firstOrFail();

        $response->assertRedirect(route('transporteur.demandes.sent', $demande));
        $response->assertSessionHas('success');

        $this->assertDatabaseHas('demandes_rdv', [
            'id' => $demande->id,
            'user_id' => $user->id,
            'creneau_id' => $slot->id,
            'status' => DemandeRdv::STATUS_PENDING,
            'operation' => 'IMP',
            'terminal' => 'LCT',
            'trucks_count' => 1,
        ]);

        $this->assertSame(1, $demande->camions()->count());
        $this->assertSame(6, $demande->documents()->count());
        $this->assertSame(0, TemporaryUpload::count());

        $demande->documents()->get()->each(
            fn (DemandeDocument $document) => Storage::disk('local')->assertExists($document->path)
        );

        Notification::assertSentTo($user, DemandeRdvSubmitted::class);
    }

    public function test_transporteur_can_create_a_multi_truck_demande(): void
    {
        $user = $this->transporteur();
        $slot = $this->slot(['capacity' => 10]);
        $docs = $this->uploadDocuments($user);

        $response = $this->actingAs($user)->post(
            route('transporteur.demandes.store'),
            $this->payload($slot, [
                'docs' => $docs,
                'trucks' => [$this->truck(1), $this->truck(2)],
            ])
        );

        $demande = DemandeRdv::firstOrFail();

        $response->assertRedirect(route('transporteur.demandes.sent', $demande));
        $this->assertSame(2, $demande->trucks_count);
        $this->assertSame(2, $demande->camions()->count());
        $this->assertDatabaseHas('demande_camions', [
            'demande_rdv_id' => $demande->id,
            'position' => 2,
            'container_number' => 'CSQU3054383',
        ]);
    }

    public function test_capacity_is_enforced_on_creation(): void
    {
        $user = $this->transporteur();
        $slot = $this->slot(['capacity' => 2]);
        $other = $this->transporteur();

        $existing = DemandeRdv::factory()->forUser($other)->forCreneau($slot)->create();
        DemandeCamion::factory()->forDemande($existing, 1)->create();
        DemandeCamion::factory()->forDemande($existing, 2)->create();

        $docs = $this->uploadDocuments($user);

        $response = $this->actingAs($user)->post(
            route('transporteur.demandes.store'),
            $this->payload($slot, ['docs' => $docs])
        );

        $response->assertSessionHasErrors('slot');
        $this->assertDatabaseCount('demandes_rdv', 1);
    }

    public function test_closed_or_past_slot_is_rejected(): void
    {
        $user = $this->transporteur();
        $docs = $this->uploadDocuments($user);

        $closed = $this->slot(['open' => false]);

        $this->actingAs($user)
            ->post(route('transporteur.demandes.store'), $this->payload($closed, ['docs' => $docs]))
            ->assertSessionHasErrors('slot');

        $past = $this->slot(['date' => now()->subDay()->format('Y-m-d')]);

        $this->actingAs($user)
            ->post(route('transporteur.demandes.store'), $this->payload($past, ['docs' => $docs]))
            ->assertSessionHasErrors('slot');

        $this->assertDatabaseCount('demandes_rdv', 0);
    }

    public function test_invalid_container_phone_and_missing_documents_are_rejected(): void
    {
        $user = $this->transporteur();
        $slot = $this->slot();
        $docs = $this->uploadDocuments($user);

        $payload = $this->payload($slot, ['docs' => $docs]);
        $payload['trucks'][0]['container']['number'] = 'MSCU4829131';
        $payload['trucks'][0]['driver']['phone'] = '+228123';

        $response = $this->actingAs($user)->post(route('transporteur.demandes.store'), $payload);

        $response->assertSessionHasErrors([
            'trucks.0.container.number',
            'trucks.0.driver.phone',
        ]);

        unset($docs['ta']);

        $this->actingAs($user)
            ->post(route('transporteur.demandes.store'), $this->payload($slot, ['docs' => $docs]))
            ->assertSessionHasErrors('docs.ta');

        $this->assertDatabaseCount('demandes_rdv', 0);
    }

    public function test_transporteur_can_update_a_pending_demande(): void
    {
        $user = $this->transporteur();
        $oldSlot = $this->slot();
        $newSlot = $this->slot(['start' => '10:00']);

        $demande = DemandeRdv::factory()->forUser($user)->forCreneau($oldSlot)->create();
        DemandeCamion::factory()->forDemande($demande, 1)->create();
        $this->attachDocuments($demande);

        $response = $this->actingAs($user)->put(
            route('transporteur.demandes.update', $demande),
            $this->payload($newSlot, [
                'docs' => $this->documentIds($demande),
                'trucks' => [$this->truck(1), $this->truck(2)],
            ])
        );

        $response->assertRedirect(route('transporteur.demandes.sent', ['demande' => $demande, 'edited' => 1]));
        $response->assertSessionHas('success');

        $this->assertDatabaseHas('demandes_rdv', [
            'id' => $demande->id,
            'creneau_id' => $newSlot->id,
            'trucks_count' => 2,
        ]);
        $this->assertSame(2, $demande->camions()->count());
        $this->assertSame(6, $demande->documents()->count());
        $this->assertDatabaseHas('demande_evenements', [
            'demande_rdv_id' => $demande->id,
            'type' => 'modifiee',
        ]);
    }

    public function test_transporteur_can_cancel_a_pending_demande(): void
    {
        $user = $this->transporteur();
        $demande = DemandeRdv::factory()->forUser($user)->forCreneau($this->slot())->create();

        $response = $this->actingAs($user)->post(
            route('transporteur.demandes.cancel', $demande),
            ['reason' => 'Camion indisponible']
        );

        $response->assertRedirect();
        $response->assertSessionHas('success');

        $this->assertDatabaseHas('demandes_rdv', [
            'id' => $demande->id,
            'status' => DemandeRdv::STATUS_CANCELLED,
            'cancel_reason' => 'Camion indisponible',
        ]);
        $this->assertNotNull($demande->fresh()->cancelled_at);
        $this->assertDatabaseHas('demande_evenements', [
            'demande_rdv_id' => $demande->id,
            'type' => 'annulee',
        ]);
    }

    public function test_approved_demande_cannot_be_updated_or_cancelled(): void
    {
        $user = $this->transporteur();
        $demande = DemandeRdv::factory()
            ->forUser($user)
            ->forCreneau($this->slot())
            ->approved()
            ->create();

        $this->actingAs($user)
            ->get(route('transporteur.demandes.edit', $demande))
            ->assertForbidden();

        $this->actingAs($user)
            ->post(route('transporteur.demandes.cancel', $demande), ['reason' => 'Test'])
            ->assertForbidden();
    }

    public function test_transporteur_cannot_access_another_transporteur_demande(): void
    {
        $owner = $this->transporteur();
        $intruder = $this->transporteur();
        $demande = DemandeRdv::factory()->forUser($owner)->forCreneau($this->slot())->create();
        $this->attachDocuments($demande);
        $document = $demande->documents()->firstOrFail();

        $this->actingAs($intruder)
            ->get(route('transporteur.demandes.sent', $demande))
            ->assertForbidden();

        $this->actingAs($intruder)
            ->get(route('transporteur.demandes.edit', $demande))
            ->assertForbidden();

        $this->actingAs($intruder)
            ->get(route('transporteur.demandes.documents.download', [$demande, $document]))
            ->assertForbidden();
    }

    public function test_transporteur_can_download_own_document(): void
    {
        $user = $this->transporteur();
        $demande = DemandeRdv::factory()->forUser($user)->forCreneau($this->slot())->create();
        $this->attachDocuments($demande);
        $document = $demande->documents()->where('type', 'bc')->firstOrFail();

        $this->actingAs($user)
            ->get(route('transporteur.demandes.documents.download', [$demande, $document]))
            ->assertOk()
            ->assertDownload('bc.pdf');
    }

    public function test_upload_rejects_invalid_type_and_oversized_file(): void
    {
        $user = $this->transporteur();

        $this->actingAs($user)->post(route('transporteur.uploads.store'), [
            'type' => 'bc',
            'file' => UploadedFile::fake()->create('virus.exe', 10, 'application/x-msdownload'),
        ])->assertSessionHasErrors('file');

        $this->actingAs($user)->post(route('transporteur.uploads.store'), [
            'type' => 'bc',
            'file' => UploadedFile::fake()->create('big.pdf', 11000, 'application/pdf'),
        ])->assertSessionHasErrors('file');
    }

    public function test_upload_can_only_be_deleted_by_its_owner(): void
    {
        $owner = $this->transporteur();
        $intruder = $this->transporteur();

        $response = $this->actingAs($owner)->post(route('transporteur.uploads.store'), [
            'type' => 'bc',
            'file' => UploadedFile::fake()->create('bc.pdf', 10, 'application/pdf'),
        ]);

        $response->assertCreated();
        $upload = TemporaryUpload::firstOrFail();

        $this->actingAs($intruder)
            ->delete(route('transporteur.uploads.destroy', $upload))
            ->assertForbidden();

        $this->actingAs($owner)
            ->delete(route('transporteur.uploads.destroy', $upload))
            ->assertNoContent();

        $this->assertDatabaseCount('temporary_uploads', 0);
    }
}
