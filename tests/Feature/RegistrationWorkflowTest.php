<?php

namespace Tests\Feature;

use App\Models\Inscription;
use App\Models\Pays;
use App\Models\PieceAFournir;
use App\Models\PieceInscription;
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
            'telephone' => '+228 90 00 00 00',
            'adresse' => 'Lomé',
            'email' => 'acme@example.com',
            'password' => 'Password1!',
            'password_confirmation' => 'Password1!',
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
