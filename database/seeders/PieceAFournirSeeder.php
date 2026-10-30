<?php

namespace Database\Seeders;

use App\Models\PieceAFournir;
use Illuminate\Database\Seeder;

class PieceAFournirSeeder extends Seeder
{
    public function run(): void
    {
        $pieces = [
            [
                'libelle' => 'CFE',
                'description' => "Document CFE de l'entreprise (Centre de Formalités des Entreprises).",
                'type_de_piece' => PieceAFournir::TYPE_SOCIETE,
                'isrequired' => true,
            ],
            [
                'libelle' => 'CNI',
                'description' => "Carte nationale d'identité du demandeur.",
                'type_de_piece' => PieceAFournir::TYPE_PARTICULIER,
                'isrequired' => true,
            ],
        ];

        foreach ($pieces as $piece) {
            PieceAFournir::updateOrCreate(
                [
                    'libelle' => $piece['libelle'],
                    'type_de_piece' => $piece['type_de_piece'],
                ],
                [
                    'description' => $piece['description'],
                    'isrequired' => $piece['isrequired'],
                    'extension' => 'pdf,jpg,jpeg,png',
                    'statut' => PieceAFournir::STATUS_ACTIVE,
                ]
            );
        }
    }
}
