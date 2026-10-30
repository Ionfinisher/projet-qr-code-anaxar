<?php

namespace Tests\Feature;

use App\Models\PieceAFournir;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class RegistrationWorkflowTest extends TestCase
{
    use RefreshDatabase;

    public function test_dynamic_registration_creates_a_pending_account_and_case(): void
    {
        Storage::fake('local');
        $piece = PieceAFournir::create([
            'nom' => 'Extrait CFE',
            'user_type' => 'societe',
            'obligatoire' => true,
        ]);

        $response = $this->post('/register', [
            'user_type' => 'societe',
            'country' => 'Togo',
            'raison_sociale' => 'Acme Transport',
            'email' => 'acme@example.com',
            'password' => 'Password1!',
            'password_confirmation' => 'Password1!',
            'documents' => [
                $piece->id => UploadedFile::fake()->create('cfe.pdf', 100, 'application/pdf'),
            ],
        ]);

        $response->assertRedirect(route('login'));
        $this->assertGuest();
        $this->assertDatabaseHas('users', ['email' => 'acme@example.com', 'statut' => 'pending']);
        $this->assertDatabaseHas('inscription', ['email' => 'acme@example.com', 'statut' => 'pending']);
        $this->assertDatabaseHas('piece_inscription', ['idpieceafournir' => $piece->id]);
    }
}
