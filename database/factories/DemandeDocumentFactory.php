<?php

namespace Database\Factories;

use App\Models\DemandeDocument;
use App\Models\DemandeRdv;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\DemandeDocument>
 */
class DemandeDocumentFactory extends Factory
{
    protected $model = DemandeDocument::class;

    public function definition(): array
    {
        return [
            'demande_rdv_id' => DemandeRdv::factory(),
            'type' => 'bc',
            'original_name' => 'document.pdf',
            'path' => 'rendez-vous/test/'.Str::uuid().'.pdf',
            'mime' => 'application/pdf',
            'size' => 1024,
            'sha256' => hash('sha256', 'document'),
        ];
    }
}
