<?php

namespace Tests\Feature\Transporteur;

use App\Models\Creneau;
use App\Models\DemandeCamion;
use App\Models\DemandeDocument;
use App\Models\DemandeRdv;
use App\Models\TemporaryUpload;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class DemandeDocumentParCamionTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        Storage::fake('local');
        Notification::fake();
    }

    private function transporteur(): User
    {
        return User::factory()->transporteur()->create();
    }

    private function slot(): Creneau
    {
        return Creneau::factory()->create([
            'date' => now()->addDay()->format('Y-m-d'),
            'start' => '08:00',
            'end' => '10:00',
            'capacity' => 40,
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function truck(int $index): array
    {
        $containers = ['MSCU4829130', 'CSQU3054383'];

        return [
            'key' => 'truck-'.$index,
            'rdvId' => null,
            'driver' => [
                'first' => 'Jean'.$index,
                'last' => 'DUPONT'.$index,
                'phone' => sprintf('+22890%06d', $index),
                'license' => 'LIC1234'.$index,
            ],
            'vehicle' => [
                'country' => 'TG',
                'tractor' => 'TG 1234 A'.$index,
                'trailer' => '',
            ],
            'container' => [
                'number' => $containers[$index - 1],
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
            'notes' => null,
            'transitaire' => null,
            'mandated' => ['type' => 'entreprise', 'company' => '', 'first' => '', 'last' => '', 'phone' => ''],
            'trucks' => [$this->truck(1)],
            'docs' => [],
        ], $overrides);
    }

    /**
     * @return array<string, array<string, string>>
     */
    private function uploadDocuments(User $user, string $truckKey, string $contentPrefix = ''): array
    {
        $docs = [];

        foreach (DemandeRdv::DOC_TYPES as $type) {
            $response = $this->actingAs($user)->post(route('transporteur.uploads.store'), [
                'type' => $type,
                'truck_key' => $truckKey,
                'file' => UploadedFile::fake()->createWithContent($type.'.pdf', $contentPrefix.$type),
            ]);

            $response->assertCreated();
            $docs[$truckKey][$type] = $response->json('token');
        }

        return $docs;
    }

    public function test_le_payload_reel_du_formulaire_est_accepte(): void
    {
        $user = $this->transporteur();
        $slot = $this->slot();
        $key = 'AB12CD34EF';
        $docs = $this->uploadDocuments($user, $key);

        $truck = $this->truck(1);
        $truck['key'] = $key;
        $truck['rdvId'] = null;
        $truck['container']['vgm'] = null;

        $response = $this->actingAs($user)->post(route('transporteur.demandes.store'), [
            'op' => 'IMP',
            'terminal' => 'LCT',
            'date' => $slot->date->format('Y-m-d'),
            'start' => $slot->start,
            'notes' => '',
            'transitaire' => '',
            'mandated' => null,
            'trucks' => [$truck],
            'docs' => $docs,
        ]);

        $response->assertSessionHasNoErrors()->assertRedirect();
    }

    public function test_upload_requiert_une_cle_de_camion(): void
    {
        $user = $this->transporteur();

        $this->actingAs($user)->post(route('transporteur.uploads.store'), [
            'type' => 'bc',
            'file' => UploadedFile::fake()->create('bc.pdf', 10, 'application/pdf'),
        ])->assertSessionHasErrors('truck_key');

        $this->assertDatabaseCount('temporary_uploads', 0);
    }

    public function test_upload_rejette_une_cle_de_camion_invalide(): void
    {
        $user = $this->transporteur();

        $this->actingAs($user)->post(route('transporteur.uploads.store'), [
            'type' => 'bc',
            'truck_key' => 'camion 1; DROP TABLE users',
            'file' => UploadedFile::fake()->create('bc.pdf', 10, 'application/pdf'),
        ])->assertSessionHasErrors('truck_key');

        $this->actingAs($user)->post(route('transporteur.uploads.store'), [
            'type' => 'bc',
            'truck_key' => str_repeat('a', 65),
            'file' => UploadedFile::fake()->create('bc.pdf', 10, 'application/pdf'),
        ])->assertSessionHasErrors('truck_key');

        $this->assertDatabaseCount('temporary_uploads', 0);
    }

    public function test_upload_persiste_la_cle_de_camion(): void
    {
        $user = $this->transporteur();

        $response = $this->actingAs($user)->post(route('transporteur.uploads.store'), [
            'type' => 'bc',
            'truck_key' => 'inertia-0',
            'file' => UploadedFile::fake()->create('bc.pdf', 10, 'application/pdf'),
        ]);

        $response->assertCreated();

        $this->assertDatabaseHas('temporary_uploads', [
            'token' => $response->json('token'),
            'user_id' => $user->id,
            'truck_key' => 'inertia-0',
            'type' => 'bc',
        ]);
    }

    public function test_les_documents_sont_rattaches_a_chaque_camion(): void
    {
        $user = $this->transporteur();
        $slot = $this->slot();
        $docs = $this->uploadDocuments($user, 'truck-1') + $this->uploadDocuments($user, 'truck-2');

        $this->actingAs($user)->post(route('transporteur.demandes.store'), $this->payload($slot, [
            'docs' => $docs,
            'trucks' => [$this->truck(1), $this->truck(2)],
        ]))->assertRedirect();

        $demande = DemandeRdv::firstOrFail();

        $this->assertSame(12, $demande->documents()->count());
        $this->assertSame(0, TemporaryUpload::count());

        foreach ($demande->camions as $camion) {
            $this->assertSame(6, $camion->documents()->count());

            $camion->documents()->get()->each(function ($document) use ($camion) {
                $this->assertSame($camion->id, $document->demande_camion_id);
                $this->assertStringContainsString("/{$camion->id}/", $document->path);
                Storage::disk('local')->assertExists($document->path);
            });
        }
    }

    public function test_un_token_ne_peut_pas_etre_reutilise_pour_un_autre_camion(): void
    {
        $user = $this->transporteur();
        $slot = $this->slot();
        $docs = $this->uploadDocuments($user, 'truck-1') + $this->uploadDocuments($user, 'truck-2');
        $docs['truck-2']['bc'] = $docs['truck-1']['bc'];

        $this->actingAs($user)->post(route('transporteur.demandes.store'), $this->payload($slot, [
            'docs' => $docs,
            'trucks' => [$this->truck(1), $this->truck(2)],
        ]))->assertSessionHasErrors('docs.truck-2.bc');

        $this->assertDatabaseCount('demandes_rdv', 0);
    }

    public function test_un_token_appartenant_a_un_autre_utilisateur_est_rejete(): void
    {
        $owner = $this->transporteur();
        $intruder = $this->transporteur();
        $slot = $this->slot();
        $docs = $this->uploadDocuments($owner, 'truck-1') + $this->uploadDocuments($owner, 'truck-2');

        $this->actingAs($intruder)->post(route('transporteur.demandes.store'), $this->payload($slot, [
            'docs' => $docs,
            'trucks' => [$this->truck(1), $this->truck(2)],
        ]))->assertSessionHasErrors('docs.truck-1.bc');

        $this->assertDatabaseCount('demandes_rdv', 0);
    }

    public function test_les_six_documents_sont_obligatoires_pour_chaque_camion(): void
    {
        $user = $this->transporteur();
        $slot = $this->slot();
        $docs = $this->uploadDocuments($user, 'truck-1') + $this->uploadDocuments($user, 'truck-2');
        unset($docs['truck-2']['ta']);

        $this->actingAs($user)->post(route('transporteur.demandes.store'), $this->payload($slot, [
            'docs' => $docs,
            'trucks' => [$this->truck(1), $this->truck(2)],
        ]))->assertSessionHasErrors('docs.truck-2.ta');

        $this->assertDatabaseCount('demandes_rdv', 0);
    }

    public function test_supprimer_un_camion_supprime_ses_documents_et_ses_fichiers(): void
    {
        $user = $this->transporteur();
        $slot = $this->slot();
        $docs = $this->uploadDocuments($user, 'truck-1') + $this->uploadDocuments($user, 'truck-2');

        $this->actingAs($user)->post(route('transporteur.demandes.store'), $this->payload($slot, [
            'docs' => $docs,
            'trucks' => [$this->truck(1), $this->truck(2)],
        ]))->assertRedirect();

        $demande = DemandeRdv::firstOrFail();
        $premier = $demande->camions()->orderBy('position')->firstOrFail();
        $second = $demande->camions()->get()->last();
        $cheminsSupprimes = $second->documents()->pluck('path')->all();

        $documentsConserves = [];
        foreach (DemandeRdv::DOC_TYPES as $type) {
            $documentsConserves[(string) $premier->id][$type] = $premier->documents()->where('type', $type)->value('id');
        }

        $truck = $this->truck(1);
        $truck['key'] = (string) $premier->id;
        $truck['rdvId'] = $premier->id;

        $this->actingAs($user)->put(route('transporteur.demandes.update', $demande), $this->payload($slot, [
            'docs' => $documentsConserves,
            'trucks' => [$truck],
        ]))->assertRedirect();

        $this->assertSame(1, $demande->camions()->count());
        $this->assertSame(6, $demande->documents()->count());

        foreach ($cheminsSupprimes as $path) {
            Storage::disk('local')->assertMissing($path);
        }
    }

    public function test_reordonner_les_camions_conserve_les_documents(): void
    {
        $user = $this->transporteur();
        $slot = $this->slot();
        $docs = $this->uploadDocuments($user, 'truck-1') + $this->uploadDocuments($user, 'truck-2');

        $this->actingAs($user)->post(route('transporteur.demandes.store'), $this->payload($slot, [
            'docs' => $docs,
            'trucks' => [$this->truck(1), $this->truck(2)],
        ]))->assertRedirect();

        $demande = DemandeRdv::firstOrFail();
        $premier = $demande->camions()->orderBy('position')->firstOrFail();
        $second = $demande->camions()->get()->last();

        $truckUn = $this->truck(1);
        $truckUn['key'] = (string) $second->id;
        $truckUn['rdvId'] = $second->id;
        $truckDeux = $this->truck(2);
        $truckDeux['key'] = (string) $premier->id;
        $truckDeux['rdvId'] = $premier->id;

        $documents = [];
        foreach ([$truckUn, $truckDeux] as $truck) {
            foreach (DemandeRdv::DOC_TYPES as $type) {
                $documents[$truck['key']][$type] = DemandeDocument::query()
                    ->where('demande_camion_id', $truck['rdvId'])
                    ->where('type', $type)
                    ->value('id');
            }
        }

        $this->actingAs($user)->put(route('transporteur.demandes.update', $demande), $this->payload($slot, [
            'docs' => $documents,
            'trucks' => [$truckUn, $truckDeux],
        ]))->assertRedirect();

        $this->assertSame(12, $demande->documents()->count());
        $this->assertSame($second->id, $demande->camions()->orderBy('position')->firstOrFail()->id);
        $this->assertSame(6, $second->fresh()->documents()->count());
    }

    public function test_le_qr_de_chaque_camion_ne_contient_que_ses_propres_empreintes(): void
    {
        $user = $this->transporteur();
        $slot = $this->slot();
        $docs = $this->uploadDocuments($user, 'truck-1', 'premier-')
            + $this->uploadDocuments($user, 'truck-2', 'second-');

        $this->actingAs($user)->post(route('transporteur.demandes.store'), $this->payload($slot, [
            'docs' => $docs,
            'trucks' => [$this->truck(1), $this->truck(2)],
        ]))->assertRedirect();

        $demande = DemandeRdv::firstOrFail();
        $demande->update(['status' => DemandeRdv::STATUS_APPROVED, 'decided_at' => now()]);

        $response = $this->actingAs($user)->get(route('transporteur.rdv.index'));
        $response->assertOk()->assertInertia(fn ($page) => $page->has('rdvs', 2));

        $props = $response->viewData('page')['props'];
        $premier = $demande->camions()->orderBy('position')->firstOrFail();
        $second = $demande->camions()->get()->last();

        $claimsPremier = $this->decodeJwtClaims($props['rdvs'][0]['token']);
        $claimsSecond = $this->decodeJwtClaims($props['rdvs'][1]['token']);

        $this->assertSame(array_values($this->expectedHashes($premier)), $claimsPremier['dh']);
        $this->assertSame(array_values($this->expectedHashes($second)), $claimsSecond['dh']);
        $this->assertNotSame($claimsPremier['dh'], $claimsSecond['dh']);
    }

    public function test_les_props_exposent_les_documents_indexes_par_camion(): void
    {
        $user = $this->transporteur();
        $slot = $this->slot();
        $docs = $this->uploadDocuments($user, 'truck-1', 'premier-')
            + $this->uploadDocuments($user, 'truck-2', 'second-');

        $this->actingAs($user)->post(route('transporteur.demandes.store'), $this->payload($slot, [
            'docs' => $docs,
            'trucks' => [$this->truck(1), $this->truck(2)],
        ]))->assertRedirect();

        $demande = DemandeRdv::firstOrFail();
        $premier = $demande->camions()->orderBy('position')->firstOrFail();
        $second = $demande->camions()->get()->last();

        $this->actingAs($user)->get(route('transporteur.demandes.edit', $demande))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->where('demande.docs.'.$premier->id.'.bc.type', 'bc')
                ->where('demande.docs.'.$premier->id.'.bc.camion_id', $premier->id)
                ->where('demande.docs.'.$second->id.'.bc.type', 'bc')
                ->where('demande.docs.'.$second->id.'.bc.camion_id', $second->id)
                ->missing('demande.docs.bc')
            );
    }

    public function test_le_detail_expose_une_liste_plat_de_documents(): void
    {
        $user = $this->transporteur();
        $slot = $this->slot();
        $docs = $this->uploadDocuments($user, 'truck-1') + $this->uploadDocuments($user, 'truck-2');

        $this->actingAs($user)->post(route('transporteur.demandes.store'), $this->payload($slot, [
            'docs' => $docs,
            'trucks' => [$this->truck(1), $this->truck(2)],
        ]))->assertRedirect();

        $demande = DemandeRdv::firstOrFail();
        $response = $this->actingAs($user)->get(route('transporteur.demandes.show', $demande));
        $props = $response->viewData('page')['props'];

        $this->assertIsArray($props['demande']['documents']);
        $this->assertCount(12, $props['demande']['documents']);
    }

    public function test_le_telechargement_refuse_un_document_rattache_a_un_autre_camion(): void
    {
        $user = $this->transporteur();
        $slot = $this->slot();
        $docs = $this->uploadDocuments($user, 'truck-1');

        $this->actingAs($user)->post(route('transporteur.demandes.store'), $this->payload($slot, [
            'docs' => $docs,
            'trucks' => [$this->truck(1)],
        ]))->assertRedirect();

        $demande = DemandeRdv::firstOrFail();
        $document = $demande->documents()->where('type', 'bc')->firstOrFail();

        // Le document reste rattaché à cette demande, mais son camion appartient
        // à une autre demande : le contrôle d'appartenance doit le refuser.
        $autreDemande = DemandeRdv::factory()->forCreneau($slot)->create();
        $camionEtranger = DemandeCamion::factory()->create(['demande_rdv_id' => $autreDemande->id]);
        $document->update(['demande_camion_id' => $camionEtranger->id]);

        $this->actingAs($user)
            ->get(route('transporteur.demandes.documents.download', [$demande, $document]))
            ->assertNotFound();
    }

    public function test_les_documents_legacy_restent_visibles_et_ne_sont_pas_supprimes(): void
    {
        $user = $this->transporteur();
        $slot = $this->slot();
        $docs = $this->uploadDocuments($user, 'truck-1') + $this->uploadDocuments($user, 'truck-2');

        $this->actingAs($user)->post(route('transporteur.demandes.store'), $this->payload($slot, [
            'docs' => $docs,
            'trucks' => [$this->truck(1), $this->truck(2)],
        ]))->assertRedirect();

        $demande = DemandeRdv::firstOrFail();
        $premier = $demande->camions()->orderBy('position')->firstOrFail();

        $legacyPath = 'rendez-vous/'.$demande->id.'/legacy/bc-ancien.pdf';
        Storage::disk('local')->put($legacyPath, 'ancien document');
        $legacy = $demande->documents()->create([
            'demande_camion_id' => null,
            'type' => 'bc',
            'original_name' => 'ancien-bc.pdf',
            'path' => $legacyPath,
            'mime' => 'application/pdf',
            'size' => 14,
            'sha256' => hash('sha256', 'ancien document'),
        ]);

        $documentsConserves = [];
        foreach (DemandeRdv::DOC_TYPES as $type) {
            $documentsConserves[(string) $premier->id][$type] = $premier->documents()->where('type', $type)->value('id');
        }

        $truck = $this->truck(1);
        $truck['key'] = (string) $premier->id;
        $truck['rdvId'] = $premier->id;

        $this->actingAs($user)->put(route('transporteur.demandes.update', $demande), $this->payload($slot, [
            'docs' => $documentsConserves,
            'trucks' => [$truck],
        ]))->assertRedirect();

        $this->assertDatabaseHas('demande_documents', [
            'id' => $legacy->id,
            'demande_camion_id' => null,
        ]);
        Storage::disk('local')->assertExists($legacyPath);
        $this->assertSame(7, $demande->documents()->count());

        $this->actingAs($user)->get(route('transporteur.demandes.edit', $demande))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->where('demande.docs.legacy.bc.id', $legacy->id)
                ->where('demande.docs.legacy.bc.camion_id', null)
            );
    }

    public function test_un_rdv_id_duplique_ou_etranger_est_rejete(): void
    {
        $user = $this->transporteur();
        $slot = $this->slot();
        $docs = $this->uploadDocuments($user, 'truck-1') + $this->uploadDocuments($user, 'truck-2');

        $this->actingAs($user)->post(route('transporteur.demandes.store'), $this->payload($slot, [
            'docs' => $docs,
            'trucks' => [$this->truck(1), $this->truck(2)],
        ]))->assertRedirect();

        $demande = DemandeRdv::firstOrFail();
        $premier = $demande->camions()->orderBy('position')->firstOrFail();
        $second = $demande->camions()->get()->last();

        $documents = [];
        foreach ([(string) $premier->id => $premier, (string) $second->id => $second] as $key => $camion) {
            foreach (DemandeRdv::DOC_TYPES as $type) {
                $documents[$key][$type] = $camion->documents()->where('type', $type)->value('id');
            }
        }

        $truckUn = $this->truck(1);
        $truckUn['rdvId'] = $premier->id;
        $truckDeux = $this->truck(2);
        $truckDeux['rdvId'] = $premier->id;

        $this->actingAs($user)->put(route('transporteur.demandes.update', $demande), $this->payload($slot, [
            'docs' => $documents,
            'trucks' => [$truckUn, $truckDeux],
        ]))->assertSessionHasErrors('trucks.1.rdvId');

        $autreDemande = DemandeRdv::factory()->forCreneau($slot)->create();
        $camionEtranger = DemandeCamion::factory()->create(['demande_rdv_id' => $autreDemande->id]);
        $truckUn['rdvId'] = $camionEtranger->id;
        $truckDeux['rdvId'] = $second->id;

        $this->actingAs($user)->put(route('transporteur.demandes.update', $demande), $this->payload($slot, [
            'docs' => $documents,
            'trucks' => [$truckUn, $truckDeux],
        ]))->assertSessionHasErrors('trucks.0.rdvId');
    }

    public function test_le_telechargement_assainit_le_nom_de_fichier(): void
    {
        $user = $this->transporteur();
        $slot = $this->slot();
        $docs = $this->uploadDocuments($user, 'truck-1');

        $this->actingAs($user)->post(route('transporteur.demandes.store'), $this->payload($slot, [
            'docs' => $docs,
            'trucks' => [$this->truck(1)],
        ]))->assertRedirect();

        $demande = DemandeRdv::firstOrFail();
        $document = $demande->documents()->where('type', 'bc')->firstOrFail();
        $document->update(['original_name' => 'pièce #1.pdf']);

        $response = $this->actingAs($user)
            ->get(route('transporteur.demandes.documents.download', [$demande, $document]));

        $response->assertOk();
        $disposition = (string) $response->headers->get('Content-Disposition');

        $this->assertStringContainsString('piece', $disposition);
        $this->assertStringNotContainsString('è', $disposition);
    }

    /**
     * @return array<string, string>
     */
    private function expectedHashes(DemandeCamion $camion): array
    {
        $hashes = [];

        foreach ($camion->documents as $document) {
            $hashes[$document->type] = substr(hash('sha256', Storage::disk('local')->get($document->path)), 0, 8);
        }

        return $hashes;
    }

    /**
     * @return array<string, mixed>
     */
    private function decodeJwtClaims(string $token): array
    {
        $segment = explode('.', $token)[1];

        return json_decode(base64_decode(strtr($segment, '-_', '+/')), true, 512, JSON_THROW_ON_ERROR);
    }
}
