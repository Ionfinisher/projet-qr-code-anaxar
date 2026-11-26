<?php

namespace Tests\Feature\Api;

use App\Http\Controllers\Api\AuthController;
use App\Models\Creneau;
use App\Models\DemandeCamion;
use App\Models\DemandeDocument;
use App\Models\DemandeRdv;
use App\Models\User;
use App\Support\DemandeRdvPresenter;
use App\Support\Poste;
use App\Support\QrJwsVerifier;
use App\Support\RdvId;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\PersonalAccessToken;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class MobileScanApiTest extends TestCase
{
    use RefreshDatabase;

    private const PASSWORD = 'MotDePasse123!';

    private const ADMIN_EMAIL = 'admin-scan@example.com';

    private const HEADER = ['alg' => 'ES256', 'kid' => 'pf-2026'];

    protected function setUp(): void
    {
        parent::setUp();

        Storage::fake('local');
        RateLimiter::clear(AuthController::throttleKey(self::ADMIN_EMAIL, '127.0.0.1'));
    }

    private function admin(array $attributes = []): User
    {
        $admin = User::factory()->create(array_merge([
            'email' => self::ADMIN_EMAIL,
            'password' => Hash::make(self::PASSWORD),
            'email_verified_at' => now(),
            'name' => 'Admin Scan',
        ], $attributes));

        $role = Role::firstOrCreate(['name' => 'admin', 'guard_name' => 'web']);
        $admin->assignRole($role);

        return $admin;
    }

    private function transporteur(): User
    {
        return User::factory()->transporteur()->create();
    }

    private function authenticate(User $user, array $abilities = ['mobile.access']): string
    {
        $token = $user->createToken('mobile-test', $abilities)->plainTextToken;
        $this->withHeader('Authorization', 'Bearer '.$token);

        return $token;
    }

    private function slot(): Creneau
    {
        return Creneau::factory()->create([
            'date' => now()->format('Y-m-d'),
            'start' => '08:00',
            'end' => '10:00',
            'capacity' => 40,
        ]);
    }

    private function demande(User $owner, Creneau $slot, string $reference, string $status = DemandeRdv::STATUS_APPROVED): DemandeRdv
    {
        return DemandeRdv::factory()
            ->forUser($owner)
            ->forCreneau($slot)
            ->create([
                'reference' => $reference,
                'status' => $status,
                'decided_at' => $status === DemandeRdv::STATUS_APPROVED ? now() : null,
            ]);
    }

    private function truck(DemandeRdv $demande, int $position): DemandeCamion
    {
        $camion = DemandeCamion::factory()->forDemande($demande, $position)->create();
        $camion->forceFill([
            'rdv_hash' => substr(RdvId::for($camion, $demande), strlen(RdvId::PREFIX)),
        ])->save();

        return $camion;
    }

    private function documentFor(DemandeCamion $camion, string $type, string $content = 'contenu pdf'): DemandeDocument
    {
        $path = "rendez-vous/{$camion->demande_rdv_id}/{$camion->id}/{$type}.pdf";
        Storage::disk('local')->put($path, $content);

        return DemandeDocument::factory()->create([
            'demande_rdv_id' => $camion->demande_rdv_id,
            'demande_camion_id' => $camion->id,
            'type' => $type,
            'original_name' => strtoupper($type).'.pdf',
            'path' => $path,
            'mime' => 'application/pdf',
            'size' => strlen($content),
            'sha256' => hash('sha256', $content),
        ]);
    }

    private function qr(DemandeRdv $demande, DemandeCamion $camion): string
    {
        $demande->load('camions.documents');
        $camion->loadMissing('documents');

        return DemandeRdvPresenter::generateToken($demande, $camion);
    }

    private function scan(string $token, int|string|null $poste = null)
    {
        $payload = ['token' => $token];

        if ($poste !== null) {
            $payload['poste'] = $poste;
        }

        return $this->postJson(route('api.v1.scan'), $payload);
    }

    /**
     * @param  array<string, mixed>  $claims
     * @param  array<string, mixed>  $header
     */
    private function sign(array $claims, array $header = self::HEADER): string
    {
        $h64 = self::base64UrlEncode((string) json_encode($header, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE));
        $p64 = self::base64UrlEncode((string) json_encode($claims, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE));
        $signature = self::base64UrlEncode(hash_hmac('sha256', "{$h64}.{$p64}", (string) config('app.key'), true));

        return "{$h64}.{$p64}.{$signature}";
    }

    /**
     * @return array{0: string, 1: string, 2: string}
     */
    private function parts(string $token): array
    {
        $parts = explode('.', $token);

        return [$parts[0], $parts[1], $parts[2]];
    }

    /**
     * @return array<string, mixed>
     */
    private function claims(string $token): array
    {
        [, $payload] = $this->parts($token);

        return json_decode((string) base64_decode(strtr($payload, '-_', '+/'), true), true, 512, JSON_THROW_ON_ERROR);
    }

    /**
     * @param  callable(array<string, mixed>): void  $mutate
     */
    private function resign(string $token, callable $mutate): string
    {
        $claims = $this->claims($token);
        $mutate($claims);

        return $this->sign($claims);
    }

    private static function base64UrlEncode(string $data): string
    {
        return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
    }

    public function test_scan_returns_the_complete_read_only_dossier(): void
    {
        $admin = $this->admin();
        $this->authenticate($admin);
        $slot = $this->slot();
        $demande = $this->demande($this->transporteur(), $slot, 'DR-SCAN01');
        $camion = $this->truck($demande, 1);

        $documents = [];
        foreach (DemandeRdv::DOC_TYPES as $type) {
            $documents[$type] = $this->documentFor($camion, $type, 'contenu-'.$type);
        }
        $documents['bc']->forceFill([
            'check_result' => DemandeDocument::CHECK_PASSE,
            'checked_at' => now(),
            'checked_by' => $admin->id,
            'check_note' => null,
        ])->save();

        $token = $this->qr($demande, $camion);
        $response = $this->scan($token);

        $response->assertOk()
            ->assertJsonPath('rdv_id', RdvId::for($camion, $demande))
            ->assertJsonPath('demande.reference', 'DR-SCAN01')
            ->assertJsonPath('demande.status', DemandeRdv::STATUS_APPROVED)
            ->assertJsonPath('demande.operation', 'IMP')
            ->assertJsonPath('demande.terminal', 'LCT')
            ->assertJsonPath('demande.slot.start', '08:00')
            ->assertJsonPath('demande.slot.end', '10:00')
            ->assertJsonPath('truck.camion_id', $camion->id)
            ->assertJsonPath('truck.position', 1)
            ->assertJsonPath('truck.driver.first', $camion->driver_first)
            ->assertJsonPath('truck.vehicle.country', 'TG')
            ->assertJsonPath('truck.container.iso', '45G1')
            ->assertJsonCount(6, 'documents')
            ->assertJsonCount(6, 'checks')
            ->assertJsonPath('documents.0.poste', 1)
            ->assertJsonPath('documents.0.type', 'bc')
            ->assertJsonPath('documents.0.label', 'Bon de chargement')
            ->assertJsonPath('documents.0.id', $documents['bc']->id)
            ->assertJsonPath('documents.0.name', 'BC.pdf')
            ->assertJsonPath('documents.0.mime', 'application/pdf')
            ->assertJsonPath('documents.0.sha256', $documents['bc']->sha256)
            ->assertJsonPath('documents.0.check.result', DemandeDocument::CHECK_PASSE)
            ->assertJsonPath('documents.0.check.by', 'Admin Scan')
            ->assertJsonPath('checks.bc.result', DemandeDocument::CHECK_PASSE)
            ->assertJsonPath('checks.bf', null)
            ->assertJsonStructure([
                'rdv_id',
                'demande' => ['reference', 'status', 'operation', 'terminal', 'slot' => ['date', 'start', 'end'], 'submitted_at', 'decided_at'],
                'truck' => [
                    'camion_id', 'position',
                    'driver' => ['first', 'last'],
                    'vehicle' => ['country', 'tractor', 'trailer'],
                    'container' => ['number', 'iso', 'bl'],
                ],
                'documents' => [['poste', 'type', 'label', 'id', 'name', 'mime', 'sha256', 'check']],
                'checks',
            ]);

        $content = (string) $response->getContent();
        $this->assertStringNotContainsString('"url"', $content);
        $this->assertStringNotContainsString('"phone"', $content);
        $this->assertStringNotContainsString('"license"', $content);
    }

    public function test_scan_filters_documents_and_checks_by_poste(): void
    {
        $admin = $this->admin();
        $this->authenticate($admin);
        $demande = $this->demande($this->transporteur(), $this->slot(), 'DR-SCAN12');
        $camion = $this->truck($demande, 1);

        $documents = [];
        foreach (DemandeRdv::DOC_TYPES as $type) {
            $documents[$type] = $this->documentFor($camion, $type);
        }
        $documents['gp']->forceFill([
            'check_result' => DemandeDocument::CHECK_PASSE,
            'checked_at' => now(),
            'checked_by' => $admin->id,
        ])->save();

        $token = $this->qr($demande, $camion);

        $response = $this->scan($token, Poste::POSTE_GP)
            ->assertOk()
            ->assertJsonCount(1, 'documents')
            ->assertJsonCount(1, 'checks')
            ->assertJsonPath('rdv_id', RdvId::for($camion, $demande))
            ->assertJsonPath('documents.0.poste', Poste::POSTE_GP)
            ->assertJsonPath('documents.0.type', 'gp')
            ->assertJsonPath('documents.0.id', $documents['gp']->id)
            ->assertJsonPath('checks.gp.result', DemandeDocument::CHECK_PASSE);

        $this->assertSame(['gp'], array_column($response->json('documents'), 'type'));
        $this->assertArrayNotHasKey('bc', $response->json('checks'));

        $this->scan($token, 'TA')
            ->assertOk()
            ->assertJsonCount(1, 'documents')
            ->assertJsonPath('documents.0.type', 'ta');
    }

    public function test_scan_returns_an_empty_document_for_a_poste_without_document(): void
    {
        $this->authenticate($this->admin());
        $demande = $this->demande($this->transporteur(), $this->slot(), 'DR-SCAN14');
        $camion = $this->truck($demande, 1);
        $this->documentFor($camion, 'bc');

        $this->scan($this->qr($demande, $camion), 'gp')
            ->assertOk()
            ->assertJsonCount(1, 'documents')
            ->assertJsonPath('documents.0.poste', Poste::POSTE_GP)
            ->assertJsonPath('documents.0.type', 'gp')
            ->assertJsonPath('documents.0.id', null)
            ->assertJsonPath('checks.gp', null);
    }

    public function test_scan_rejects_unknown_or_malformed_poste(): void
    {
        $this->authenticate($this->admin());
        $demande = $this->demande($this->transporteur(), $this->slot(), 'DR-SCAN15');
        $camion = $this->truck($demande, 1);
        $token = $this->qr($demande, $camion);

        foreach ([0, 7, 'sup', '', '1.5'] as $poste) {
            $this->scan($token, $poste)
                ->assertStatus(422)
                ->assertJsonValidationErrors('poste');
        }

        foreach ([null, true, ['bc']] as $poste) {
            $this->postJson(route('api.v1.scan'), ['token' => $token, 'poste' => $poste])
                ->assertStatus(422)
                ->assertJsonValidationErrors('poste');
        }
    }

    public function test_filtered_scan_stays_read_only_and_verifies_every_document(): void
    {
        $this->authenticate($this->admin());
        $demande = $this->demande($this->transporteur(), $this->slot(), 'DR-SCAN13');
        $camion = $this->truck($demande, 1);
        foreach (DemandeRdv::DOC_TYPES as $type) {
            $this->documentFor($camion, $type);
        }
        $document = $camion->documents()->where('type', 'bc')->firstOrFail();
        $token = $this->qr($demande, $camion);
        $before = $document->updated_at->toIso8601String();

        $this->scan($token, Poste::POSTE_BC)->assertOk();

        $this->assertDatabaseCount('demande_evenements', 0);
        $this->assertSame($before, $document->fresh()->updated_at->toIso8601String());

        // L'empreinte d'un document non affiché reste vérifiée avant le filtrage.
        $this->scan($this->resign($token, function (array &$claims): void {
            $claims['dh'][5] = str_repeat('0', 8);
        }), Poste::POSTE_BC)
            ->assertStatus(400)
            ->assertJsonPath('reason', 'mismatch');
    }

    public function test_scan_does_not_change_any_state(): void
    {
        $this->authenticate($this->admin());
        $demande = $this->demande($this->transporteur(), $this->slot(), 'DR-SCAN02');
        $camion = $this->truck($demande, 1);
        $document = $this->documentFor($camion, 'bc');

        $demandeBefore = $demande->updated_at->toIso8601String();
        $camionBefore = $camion->updated_at->toIso8601String();
        $documentBefore = $document->updated_at->toIso8601String();

        $this->scan($this->qr($demande, $camion))->assertOk();

        $this->assertDatabaseCount('demande_evenements', 0);
        $this->assertSame($demandeBefore, $demande->fresh()->updated_at->toIso8601String());
        $this->assertSame($camionBefore, $camion->fresh()->updated_at->toIso8601String());
        $this->assertSame($documentBefore, $document->fresh()->updated_at->toIso8601String());
    }

    public function test_scan_validates_missing_and_malformed_tokens(): void
    {
        $this->authenticate($this->admin());

        $this->postJson(route('api.v1.scan'), [])
            ->assertStatus(422)
            ->assertJsonValidationErrors('token');
        $this->scan('pas-un-jwt')
            ->assertStatus(422)
            ->assertJsonValidationErrors('token');
        $this->scan(str_repeat('a', 4097))
            ->assertStatus(422)
            ->assertJsonValidationErrors('token');
        $this->scan('abc.def.ghi')
            ->assertStatus(400)
            ->assertJsonPath('message', 'QR code invalide.');
    }

    public function test_scan_rejects_invalid_header_and_tampered_payload(): void
    {
        $this->authenticate($this->admin());
        $demande = $this->demande($this->transporteur(), $this->slot(), 'DR-SCAN03');
        $camion = $this->truck($demande, 1);
        $token = $this->qr($demande, $camion);

        $header = array_merge(self::HEADER, ['alg' => 'RS256']);
        $this->scan($this->sign($this->claims($token), $header))
            ->assertStatus(400)
            ->assertJsonPath('reason', 'header');

        $header = array_merge(self::HEADER, ['kid' => 'other']);
        $this->scan($this->sign($this->claims($token), $header))
            ->assertStatus(400)
            ->assertJsonPath('reason', 'header');

        // Payload modifié sans recalculer la signature : le HMAC ne correspond plus.
        [$h64, $p64, $sig64] = $this->parts($token);
        $claims = $this->claims($token);
        $claims['op'] = 'EXP';
        $tamperedPayload = self::base64UrlEncode((string) json_encode($claims, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE));
        $this->scan("{$h64}.{$tamperedPayload}.{$sig64}")
            ->assertStatus(400)
            ->assertJsonPath('reason', 'signature');
    }

    public function test_scan_rejects_future_nbf_past_exp_and_exp_equal_now(): void
    {
        $this->authenticate($this->admin());
        $demande = $this->demande($this->transporteur(), $this->slot(), 'DR-SCAN04');
        $camion = $this->truck($demande, 1);
        $token = $this->qr($demande, $camion);

        $this->scan($this->resign($token, function (array &$claims): void {
            $claims['nbf'] = time() + 3600;
        }))->assertStatus(400)->assertJsonPath('reason', 'timing');

        $this->scan($this->resign($token, function (array &$claims): void {
            $claims['exp'] = time() - 1;
        }))->assertStatus(400)->assertJsonPath('reason', 'timing');

        $fixedNow = time();
        $this->app->instance(QrJwsVerifier::class, new QrJwsVerifier(fn (): int => $fixedNow));

        $this->scan($this->resign($token, function (array &$claims) use ($fixedNow): void {
            $claims['exp'] = $fixedNow;
        }))->assertStatus(400)->assertJsonPath('reason', 'timing');
    }

    public function test_scan_rejects_stale_document_hashes_and_inconsistent_claims(): void
    {
        $this->authenticate($this->admin());
        $demande = $this->demande($this->transporteur(), $this->slot(), 'DR-SCAN05');
        $camion = $this->truck($demande, 1);
        foreach (DemandeRdv::DOC_TYPES as $type) {
            $this->documentFor($camion, $type);
        }
        $token = $this->qr($demande, $camion);

        $this->scan($this->resign($token, function (array &$claims): void {
            $claims['dh'][0] = str_repeat('0', 8);
        }))->assertStatus(400)->assertJsonPath('reason', 'mismatch');

        foreach (['op' => 'EXP', 'trm' => 'TGT', 'slt' => '202601010800-1000', 'lot' => 'DR-AUTRE/1-1'] as $key => $value) {
            $this->scan($this->resign($token, function (array &$claims) use ($key, $value): void {
                $claims[$key] = $value;
            }))->assertStatus(400)->assertJsonPath('reason', 'mismatch');
        }
    }

    public function test_scan_rejects_invalid_document_hash_shapes_and_accepts_a_lot_free_token(): void
    {
        $this->authenticate($this->admin());
        $demande = $this->demande($this->transporteur(), $this->slot(), 'DR-SCAN10');
        $camion = $this->truck($demande, 1);
        $token = $this->qr($demande, $camion);

        // Un camion isolé n'embarque pas de claim "lot" : son QR reste valide.
        $this->assertArrayNotHasKey('lot', $this->claims($token));

        $this->scan($this->resign($token, function (array &$claims): void {
            unset($claims['dh']);
        }))->assertStatus(400)->assertJsonPath('reason', 'mismatch');

        $this->scan($this->resign($token, function (array &$claims): void {
            $claims['dh'] = 'aaaaaaaa';
        }))->assertStatus(400)->assertJsonPath('reason', 'mismatch');

        $this->scan($this->resign($token, function (array &$claims): void {
            $claims['dh'] = ['aaaaaaaa'];
        }))->assertStatus(400)->assertJsonPath('reason', 'mismatch');

        $this->scan($token)
            ->assertOk()
            ->assertJsonPath('rdv_id', RdvId::for($camion, $demande));
    }

    public function test_scan_returns_404_for_unknown_subject_and_pending_demande(): void
    {
        $this->authenticate($this->admin());
        $slot = $this->slot();
        $demande = $this->demande($this->transporteur(), $slot, 'DR-SCAN06');
        $camion = $this->truck($demande, 1);
        $token = $this->qr($demande, $camion);

        $this->scan($this->resign($token, function (array &$claims): void {
            $claims['sub'] = 'PF-FFFFFF';
        }))->assertNotFound()->assertJsonPath('message', 'Dossier introuvable.');

        $pending = $this->demande($this->transporteur(), $slot, 'DR-ATTENTE', DemandeRdv::STATUS_PENDING);
        $pendingCamion = $this->truck($pending, 1);

        $this->scan($this->qr($pending, $pendingCamion))
            ->assertNotFound()
            ->assertJsonPath('message', 'Dossier introuvable.');
    }

    public function test_scan_requires_authentication_and_admin_access(): void
    {
        $demande = $this->demande($this->transporteur(), $this->slot(), 'DR-SCAN07');
        $camion = $this->truck($demande, 1);
        $token = $this->qr($demande, $camion);

        $this->scan($token)->assertStatus(401);

        $this->authenticate($this->transporteur());
        $this->scan($token)
            ->assertStatus(403)
            ->assertJsonPath('message', 'Accès non autorisé.');
    }

    public function test_scan_accepts_lowercase_subject_and_rejects_malformed_subject(): void
    {
        $this->authenticate($this->admin());
        $demande = $this->demande($this->transporteur(), $this->slot(), 'DR-SCAN08');
        $camion = $this->truck($demande, 1);
        $token = $this->qr($demande, $camion);

        $this->scan($this->resign($token, function (array &$claims): void {
            $claims['sub'] = strtolower((string) $claims['sub']);
        }))->assertOk()->assertJsonPath('rdv_id', RdvId::for($camion, $demande));

        $this->scan($this->resign($token, function (array &$claims): void {
            $claims['sub'] = 'PF-GGGGGG';
        }))->assertStatus(400)->assertJsonPath('reason', 'subject');
    }

    public function test_scan_is_rate_limited_per_user_with_retry_after(): void
    {
        $accessToken = $this->authenticate($this->admin());
        $demande = $this->demande($this->transporteur(), $this->slot(), 'DR-SCAN09');
        $camion = $this->truck($demande, 1);
        $token = $this->qr($demande, $camion);

        for ($attempt = 0; $attempt < 30; $attempt++) {
            $this->scan($token)->assertOk();
        }

        $response = $this->scan($token)
            ->assertStatus(429)
            ->assertJsonPath('message', 'Trop de requêtes. Réessayez plus tard.');

        $this->assertNotEmpty($response->headers->get('Retry-After'));
        $this->assertNotNull(PersonalAccessToken::findToken($accessToken));
    }

    public function test_scan_rate_limit_is_isolated_per_user(): void
    {
        $firstToken = $this->authenticate($this->admin());
        $secondToken = $this->admin(['email' => 'admin-scan-2@example.com'])
            ->createToken('mobile-test', ['mobile.access'])->plainTextToken;

        $demande = $this->demande($this->transporteur(), $this->slot(), 'DR-SCAN11');
        $camion = $this->truck($demande, 1);
        $token = $this->qr($demande, $camion);

        for ($attempt = 0; $attempt < 30; $attempt++) {
            $this->scan($token)->assertOk();
        }

        $this->scan($token)->assertStatus(429);

        $this->withHeader('Authorization', 'Bearer '.$secondToken);
        $this->app['auth']->forgetGuards();
        $this->scan($token)->assertOk();

        $this->assertNotNull(PersonalAccessToken::findToken($firstToken));
        $this->assertNotNull(PersonalAccessToken::findToken($secondToken));
    }
}
