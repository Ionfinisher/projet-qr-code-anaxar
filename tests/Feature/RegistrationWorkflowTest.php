<?php

namespace Tests\Feature;

use App\Models\Inscription;
use App\Models\Pays;
use App\Models\PieceAFournir;
use App\Models\PieceInscription;
use App\Models\Transitaire;
use App\Models\Transporteur;
use App\Models\User;
use App\Notifications\RegistrationApproved;
use App\Notifications\RegistrationPending;
use App\Notifications\RegistrationRejected;
use App\Notifications\VerifyRegistrationEmail;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\URL;
use Illuminate\Support\Str;
use Inertia\Testing\AssertableInertia as Assert;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class RegistrationWorkflowTest extends TestCase
{
    use RefreshDatabase;

    private function createPays(): Pays
    {
        return Pays::create([
            'nom' => 'Togo',
            'code' => 'TG',
            'indicatif' => '+228',
        ]);
    }

    private function createPiece(string $libelle = 'CFE', string $type = PieceAFournir::TYPE_SOCIETE): PieceAFournir
    {
        return PieceAFournir::create([
            'libelle' => $libelle,
            'description' => 'Document de test',
            'type_de_piece' => $type,
            'isrequired' => true,
            'statut' => PieceAFournir::STATUS_ACTIVE,
        ]);
    }

    private function registrationPayload(Pays $pays, PieceAFournir $piece): array
    {
        return [
            'user_type' => 'societe',
            'idpays' => $pays->id,
            'raison_sociale' => 'Acme Transport',
            'nif' => 'TG1000123456',
            'rccm' => 'TG-LOM 2024 B 1234',
            'representant_nom' => 'DOE',
            'representant_prenom' => 'Jane',
            'fonction_representant' => 'Gérante',
            'telephone' => '+228 90 00 00 00',
            'adresse' => 'Lomé',
            'ville' => 'Lomé',
            'nombre_camions' => 8,
            'email' => 'acme@example.com',
            'password' => 'Password1!Long',
            'password_confirmation' => 'Password1!Long',
            'documents' => [
                $piece->id => UploadedFile::fake()->create('cfe.pdf', 100, 'application/pdf'),
            ],
        ];
    }

    public function test_dynamic_registration_creates_a_pending_account_and_case(): void
    {
        Storage::fake('local');
        Notification::fake();

        $pays = $this->createPays();
        $piece = $this->createPiece();

        $response = $this->post('/register', $this->registrationPayload($pays, $piece));

        $response->assertRedirect(route('login'));
        $response->assertSessionHas('success');
        $this->assertGuest();

        $this->assertDatabaseHas('users', [
            'email' => 'acme@example.com',
            'statut' => 'pending',
            'idpays' => $pays->id,
        ]);
        $this->assertDatabaseHas('inscription', [
            'email' => 'acme@example.com',
            'statut' => 'pending',
        ]);

        $inscription = Inscription::where('email', 'acme@example.com')->firstOrFail();
        $this->assertNotEmpty($inscription->keyinscription);
        $this->assertNotEmpty($inscription->numero_dossier);
        $this->assertNotEmpty($inscription->transporteur?->keytransporteur);

        $pieceInscription = PieceInscription::where('idinscription', $inscription->id)->firstOrFail();
        $this->assertNotEmpty($pieceInscription->keypieceinscription);
        $this->assertSame($piece->id, $pieceInscription->idpieceafournir);
        Storage::disk('local')->assertExists($pieceInscription->piece);

        $user = User::where('email', 'acme@example.com')->firstOrFail();
        $this->assertNotNull($user->idtransporteur);
        $this->assertNull($user->idtransitaire);
        $this->assertTrue($user->hasRole('transporteur'));
        $this->assertFalse($user->hasRole('transitaire'));

        Notification::assertSentTo(
            User::where('email', 'acme@example.com')->firstOrFail(),
            VerifyRegistrationEmail::class
        );
    }

    public function test_registration_fails_when_a_required_document_is_missing(): void
    {
        Storage::fake('local');
        $pays = $this->createPays();
        $piece = $this->createPiece();

        $payload = $this->registrationPayload($pays, $piece);
        unset($payload['documents']);

        $this->post('/register', $payload)->assertSessionHasErrors("documents.{$piece->id}");

        $this->assertDatabaseMissing('users', ['email' => 'acme@example.com']);
    }

    public function test_registration_rejects_an_invalid_document_type(): void
    {
        Storage::fake('local');
        $pays = $this->createPays();
        $piece = $this->createPiece();

        $payload = $this->registrationPayload($pays, $piece);
        $payload['documents'][$piece->id] = UploadedFile::fake()->create('cfe.exe', 10, 'application/x-msdownload');

        $this->post('/register', $payload)->assertSessionHasErrors("documents.{$piece->id}");

        $this->assertDatabaseMissing('users', ['email' => 'acme@example.com']);
    }

    public function test_registration_uses_the_configured_document_extensions(): void
    {
        Storage::fake('local');
        $pays = $this->createPays();
        $piece = $this->createPiece();
        $piece->update(['extension' => 'pdf']);

        $payload = $this->registrationPayload($pays, $piece);
        $payload['documents'][$piece->id] = UploadedFile::fake()->create('cfe.jpg', 10, 'image/jpeg');

        $this->post('/register', $payload)->assertSessionHasErrors("documents.{$piece->id}");

        $this->assertDatabaseMissing('users', ['email' => 'acme@example.com']);
    }

    public function test_pending_user_cannot_log_in(): void
    {
        $user = User::create([
            'name' => 'Acme Transport',
            'email' => 'acme@example.com',
            'password' => 'Password1!',
            'statut' => User::STATUS_PENDING,
        ]);
        $user->forceFill(['email_verified_at' => now()])->save();

        $response = $this->post('/login', [
            'email' => 'acme@example.com',
            'password' => 'Password1!',
        ]);

        $response->assertSessionHas('error', 'Votre dossier est encore en cours de validation.');
        $this->assertGuest();
        $this->assertNotNull($user);
    }

    public function test_approved_user_can_log_in(): void
    {
        $user = User::create([
            'name' => 'Acme Transport',
            'email' => 'acme@example.com',
            'password' => 'Password1!',
            'email_verified_at' => now(),
            'statut' => User::STATUS_APPROVED,
        ]);

        $response = $this->post('/login', [
            'email' => 'acme@example.com',
            'password' => 'Password1!',
        ]);

        $response->assertRedirect('/dashboard')->assertSessionHas('success');
        $this->assertAuthenticatedAs($user);
    }

    public function test_signed_email_verification_marks_email_verified_and_notifies_pending(): void
    {
        Notification::fake();

        $user = User::create([
            'name' => 'Acme Transport',
            'email' => 'acme@example.com',
            'password' => 'Password1!',
            'statut' => User::STATUS_PENDING,
        ]);

        Inscription::create([
            'email' => $user->email,
            'statut' => Inscription::STATUS_PENDING,
            'token' => 'token',
        ]);

        $url = URL::temporarySignedRoute('registration.verification', now()->addDay(), [
            'id' => $user->id,
            'hash' => sha1($user->getEmailForVerification()),
        ]);

        $this->get($url)->assertRedirect(route('login'))->assertSessionHas('success');

        $this->assertNotNull($user->fresh()->email_verified_at);
        Notification::assertSentTo($user, RegistrationPending::class);
    }

    public function test_admin_can_approve_a_registration(): void
    {
        Notification::fake();
        Role::create(['name' => 'admin', 'guard_name' => 'web']);
        $admin = User::create([
            'name' => 'Admin',
            'email' => 'admin@example.com',
            'password' => 'Password1!',
            'email_verified_at' => now(),
            'statut' => User::STATUS_APPROVED,
        ]);
        $admin->assignRole('admin');

        $registration = $this->createRejectedRegistration();
        $registration->update(['statut' => Inscription::STATUS_PENDING]);

        $this->actingAs($admin)
            ->post(route('admin.registrations.approve', $registration))
            ->assertRedirect()
            ->assertSessionHas('success');

        $this->assertSame(Inscription::STATUS_APPROVED, $registration->fresh()->statut);
        $this->assertSame('approved', $registration->fresh()->transporteur->statut);
        Notification::assertSentTo($registration->fresh()->transporteur->user, RegistrationApproved::class);
    }

    public function test_admin_can_reject_a_registration(): void
    {
        Notification::fake();
        Role::create(['name' => 'admin', 'guard_name' => 'web']);
        $admin = User::create([
            'name' => 'Admin',
            'email' => 'admin@example.com',
            'password' => 'Password1!',
            'email_verified_at' => now(),
            'statut' => User::STATUS_APPROVED,
        ]);
        $admin->assignRole('admin');

        $registration = $this->createRejectedRegistration();
        $registration->update(['statut' => Inscription::STATUS_PENDING]);

        $this->actingAs($admin)
            ->post(route('admin.registrations.reject', $registration), ['raison' => 'Document illisible'])
            ->assertRedirect()
            ->assertSessionHas('success');

        $registration->refresh();
        $this->assertSame(Inscription::STATUS_REJECTED, $registration->statut);
        $this->assertDatabaseHas('rejet_inscription', [
            'idinscription' => $registration->id,
            'raison' => 'Document illisible',
            'statut' => 'active',
        ]);
        Notification::assertSentTo($registration->transporteur->user, RegistrationRejected::class);
    }

    public function test_rejected_registration_can_be_resubmitted(): void
    {
        Storage::fake('local');
        Notification::fake();

        $registration = $this->createRejectedRegistration();
        $registration->rejetinscriptions()->create([
            'raison' => 'Ancien motif',
            'statut' => 'active',
        ]);
        $piece = $this->createPiece();
        $oldPath = UploadedFile::fake()->create('old.pdf', 100, 'application/pdf')
            ->store('registrations/'.$registration->id, 'local');

        $pieceInscription = PieceInscription::create([
            'piece' => $oldPath,
            'statut' => 'rejected',
            'idpieceafournir' => $piece->id,
            'idinscription' => $registration->id,
        ]);

        $response = $this->post(route('registration.update', $registration->numero_dossier), [
            'email' => strtoupper($registration->email),
            'telephone' => '+228 91 00 00 00',
            'raison_sociale' => 'Acme Transport Corrigé',
            'documents' => [
                $piece->id => UploadedFile::fake()->create('new.pdf', 100, 'application/pdf'),
            ],
        ]);

        $response->assertRedirect(route('registration.status'));
        $response->assertSessionHas('success');
        $this->assertSame(Inscription::STATUS_PENDING, $registration->fresh()->statut);
        $this->assertSame('pending', $registration->fresh()->transporteur->statut);
        $this->assertSame('pending', $registration->fresh()->transporteur->user->statut);
        $this->assertDatabaseHas('rejet_inscription', [
            'idinscription' => $registration->id,
            'statut' => 'inactive',
        ]);

        $pieceInscription->refresh();
        Storage::disk('local')->assertMissing($oldPath);
        Storage::disk('local')->assertExists($pieceInscription->piece);

        Notification::assertSentTo($registration->fresh()->transporteur->user, RegistrationPending::class);
    }

    public function test_registration_status_can_be_found_with_exact_email_and_numero_dossier(): void
    {
        $registration = $this->createRejectedRegistration();

        $response = $this->get(route('registration.status.search', [
            'email' => $registration->email,
            'numero_dossier' => $registration->numero_dossier,
        ]));

        $response->assertOk()->assertInertia(fn (Assert $page) => $page
            ->component('Registration/Status')
            ->where('registration.numero_dossier', $registration->numero_dossier)
            ->where('registration.status', Inscription::STATUS_REJECTED)
            ->where('registration.can_edit', true));
    }

    public function test_registration_status_lookup_ignores_email_case_and_numero_spacing(): void
    {
        $registration = $this->createRejectedRegistration();

        $response = $this->get(route('registration.status.search', [
            'email' => '  '.Str::upper($registration->email).'  ',
            'numero_dossier' => '  '.Str::lower($registration->numero_dossier).'  ',
        ]));

        $response->assertOk()->assertInertia(fn (Assert $page) => $page
            ->component('Registration/Status')
            ->where('registration.numero_dossier', $registration->numero_dossier));
    }

    public function test_transitaire_registration_creates_a_dedicated_account_with_role(): void
    {
        Storage::fake('local');
        Notification::fake();

        $pays = $this->createPays();

        $response = $this->post('/register', [
            'user_type' => 'transitaire',
            'idpays' => $pays->id,
            'raison_sociale' => 'Lagune Transit SARL',
            'nif' => 'TG1000123456',
            'rccm' => 'TG-LOM 2024 B 1234',
            'representant_nom' => 'BOKO',
            'representant_prenom' => 'Akossiwa',
            'fonction_representant' => 'Directrice',
            'telephone' => '+228 90 00 00 00',
            'adresse' => 'Boulevard du 13 Janvier',
            'ville' => 'Lomé',
            'email' => 'transit@example.com',
            'password' => 'Password1!Long',
            'password_confirmation' => 'Password1!Long',
        ]);

        $response->assertRedirect(route('login'));
        $response->assertSessionHas('success');

        $user = User::where('email', 'transit@example.com')->firstOrFail();
        $inscription = Inscription::where('email', 'transit@example.com')->firstOrFail();

        $this->assertNotNull($user->idtransitaire);
        $this->assertNull($user->idtransporteur);
        $this->assertSame('Lagune Transit SARL', $user->name);
        $this->assertTrue($user->hasRole('transitaire'));
        $this->assertFalse($user->hasRole('transporteur'));

        $this->assertNotNull($inscription->idtransitaire);
        $this->assertNull($inscription->idtransporteur);

        $this->assertDatabaseHas('transitaire', [
            'id' => $user->idtransitaire,
            'raisonsociale' => 'Lagune Transit SARL',
            'nif' => 'TG1000123456',
            'statut' => 'pending',
        ]);
        $this->assertDatabaseMissing('transporteur', ['email' => 'transit@example.com']);

        Notification::assertSentTo($user, VerifyRegistrationEmail::class);
    }

    public function test_particulier_registration_assigns_the_transporteur_role(): void
    {
        Storage::fake('local');
        Notification::fake();

        $pays = $this->createPays();

        $this->post('/register', [
            'user_type' => 'particulier',
            'idpays' => $pays->id,
            'nom' => 'ATSU',
            'prenom' => 'Komla',
            'telephone' => '+228 91 00 00 00',
            'adresse' => 'Kpalimé',
            'email' => 'komla@example.com',
            'password' => 'Password1!Long',
            'password_confirmation' => 'Password1!Long',
        ])->assertRedirect(route('login'));

        $user = User::where('email', 'komla@example.com')->firstOrFail();

        $this->assertNotNull($user->idtransporteur);
        $this->assertNull($user->idtransitaire);
        $this->assertTrue($user->hasRole('transporteur'));
        $this->assertFalse($user->hasRole('transitaire'));
    }

    public function test_admin_can_approve_a_transitaire_registration(): void
    {
        Notification::fake();
        Role::create(['name' => 'admin', 'guard_name' => 'web']);

        $admin = User::create([
            'name' => 'Admin',
            'email' => 'admin@example.com',
            'password' => 'Password1!',
            'email_verified_at' => now(),
            'statut' => User::STATUS_APPROVED,
        ]);
        $admin->assignRole('admin');

        $transitaire = Transitaire::create([
            'email' => 'transit@example.com',
            'nom' => 'BOKO',
            'prenom' => 'Akossiwa',
            'raisonsociale' => 'Lagune Transit SARL',
            'telephone' => '+228 90 00 00 00',
            'statut' => Transitaire::STATUS_PENDING,
        ]);

        $registration = Inscription::create([
            'email' => 'transit@example.com',
            'statut' => Inscription::STATUS_PENDING,
            'token' => 'token',
            'idtransitaire' => $transitaire->id,
        ]);

        $user = User::create([
            'name' => 'Lagune Transit SARL',
            'email' => 'transit@example.com',
            'password' => 'Password1!',
            'email_verified_at' => now(),
            'statut' => User::STATUS_PENDING,
            'idtransitaire' => $transitaire->id,
        ]);
        $user->assignRole(Role::findOrCreate('transitaire', 'web'));

        $this->actingAs($admin)
            ->post(route('admin.registrations.approve', $registration))
            ->assertRedirect()
            ->assertSessionHas('success');

        $this->assertSame(Inscription::STATUS_APPROVED, $registration->fresh()->statut);
        $this->assertSame(Transitaire::STATUS_APPROVED, $transitaire->fresh()->statut);
        $this->assertSame(User::STATUS_APPROVED, $user->fresh()->statut);
        Notification::assertSentTo($user, RegistrationApproved::class);
    }

    public function test_transitaire_registration_status_can_be_found_by_phone(): void
    {
        $transitaire = Transitaire::create([
            'email' => 'transit@example.com',
            'raisonsociale' => 'Lagune Transit SARL',
            'telephone' => '+228 90 00 00 00',
            'statut' => Transitaire::STATUS_PENDING,
        ]);

        $registration = Inscription::create([
            'email' => 'transit@example.com',
            'statut' => Inscription::STATUS_PENDING,
            'token' => 'token',
            'idtransitaire' => $transitaire->id,
        ]);

        $this->get(route('registration.status.search', [
            'contact' => $transitaire->telephone,
            'numero_dossier' => $registration->numero_dossier,
        ]))->assertOk()->assertInertia(fn (Assert $page) => $page
            ->component('Registration/Status')
            ->where('registration.numero_dossier', $registration->numero_dossier)
            ->where('registration.identity.1.value', 'Lagune Transit SARL'));
    }

    public function test_registration_with_separate_identity_country_and_phone_country(): void
    {
        Storage::fake('local');
        Notification::fake();

        $togo = Pays::create(['code' => 'TG', 'nom' => 'Togo', 'indicatif' => '+228']);
        $benin = Pays::create(['code' => 'BJ', 'nom' => 'Bénin', 'indicatif' => '+229']);
        $piece = $this->createPiece();

        $payload = [
            'user_type' => 'societe',
            'idpays' => $togo->id,
            'phone_pays_id' => $benin->id,
            'raison_sociale' => 'Benin Togo Transport',
            'nif' => 'TG1000999999',
            'rccm' => 'TG-LOM 2024 B 9999',
            'representant_nom' => 'KOFFI',
            'representant_prenom' => 'Jean',
            'fonction_representant' => 'Directeur',
            'telephone' => '90 12 34 56',
            'adresse' => 'Zone Portuaire',
            'ville' => 'Lomé',
            'email' => 'benin-togo@example.com',
            'password' => 'Password1!Long',
            'password_confirmation' => 'Password1!Long',
            'documents' => [
                $piece->id => UploadedFile::fake()->create('cfe.pdf', 100, 'application/pdf'),
            ],
        ];

        $response = $this->post('/register', $payload);
        $response->assertRedirect(route('login'));

        $user = User::where('email', 'benin-togo@example.com')->firstOrFail();
        $this->assertSame($togo->id, $user->idpays);
        // The indicatif from phone_pays_id (+229) should be prepended to the phone number
        $this->assertSame('+22990123456', $user->telephone);
    }

    private function createRejectedRegistration(): Inscription
    {
        $transporteur = Transporteur::create([
            'email' => 'acme@example.com',
            'nom' => 'Doe',
            'prenom' => 'Jane',
            'raisonsociale' => 'Acme Transport',
            'typetransporteur' => PieceAFournir::TYPE_SOCIETE,
            'telephone' => '+228 90 00 00 00',
            'statut' => 'rejected',
        ]);

        $registration = Inscription::create([
            'email' => 'acme@example.com',
            'statut' => Inscription::STATUS_REJECTED,
            'token' => 'token',
            'idtransporteur' => $transporteur->id,
        ]);

        User::create([
            'name' => 'Acme Transport',
            'email' => 'acme@example.com',
            'password' => 'Password1!',
            'email_verified_at' => now(),
            'statut' => User::STATUS_REJECTED,
            'idtransporteur' => $transporteur->id,
        ]);

        return $registration;
    }
}
