<?php

namespace Database\Seeders;

use App\Models\PieceAFournir;
use Illuminate\Database\Seeder;

class PieceAFournirSeeder extends Seeder
{
    public function run(): void
    {
        $pieces = [
            // Pièces exigées pour les demandes de rendez-vous camion
            [
                'code' => 'bc',
                'libelle' => 'Bon de chargement',
                'description' => "Ordre d'enlèvement ou de chargement du conteneur",
                'type_de_piece' => PieceAFournir::TYPE_RDV,
                'isrequired' => true,
                'extension' => 'pdf,jpg,jpeg,png',
                'post' => 1,
                'short' => 'Chargement',
                'icon' => 'file-text',
                'hint' => "Ordre d'enlèvement ou de chargement du conteneur",
            ],
            [
                'code' => 'bf',
                'libelle' => 'Bon de fret',
                'description' => "Document de fret de la marchandise",
                'type_de_piece' => PieceAFournir::TYPE_RDV,
                'isrequired' => true,
                'extension' => 'pdf,jpg,jpeg,png',
                'post' => 2,
                'short' => 'Fret',
                'icon' => 'package',
                'hint' => "Document de fret de la marchandise",
            ],
            [
                'code' => 'as',
                'libelle' => 'Assurance',
                'description' => "Attestation d'assurance du camion en cours de validité",
                'type_de_piece' => PieceAFournir::TYPE_RDV,
                'isrequired' => true,
                'extension' => 'pdf,jpg,jpeg,png',
                'post' => 3,
                'short' => 'Assurance',
                'icon' => 'shield-check',
                'hint' => "Attestation d'assurance du camion en cours de validité",
            ],
            [
                'code' => 'vt',
                'libelle' => 'Visite technique',
                'description' => "Certificat de visite technique du camion",
                'type_de_piece' => PieceAFournir::TYPE_RDV,
                'isrequired' => true,
                'extension' => 'pdf,jpg,jpeg,png',
                'post' => 4,
                'short' => 'Visite tech.',
                'icon' => 'gauge',
                'hint' => "Certificat de visite technique du camion",
            ],
            [
                'code' => 'gp',
                'libelle' => 'Gate pass',
                'description' => "Laissez-passer délivré par le terminal",
                'type_de_piece' => PieceAFournir::TYPE_RDV,
                'isrequired' => true,
                'extension' => 'pdf,jpg,jpeg,png',
                'post' => 5,
                'short' => 'Gate pass',
                'icon' => 'stamp',
                'hint' => "Laissez-passer délivré par le terminal",
            ],
            [
                'code' => 'ta',
                'libelle' => 'Accès terminal',
                'description' => "Autorisation d'accès au terminal",
                'type_de_piece' => PieceAFournir::TYPE_RDV,
                'isrequired' => true,
                'extension' => 'pdf,jpg,jpeg,png',
                'post' => 6,
                'short' => 'Accès terminal',
                'icon' => 'key-round',
                'hint' => "Autorisation d'accès au terminal",
            ],
        ];

        foreach ($pieces as $piece) {
            PieceAFournir::updateOrCreate(
                [
                    'code' => $piece['code'],
                ],
                [
                    'libelle' => $piece['libelle'],
                    'type_de_piece' => $piece['type_de_piece'],
                    'description' => $piece['description'],
                    'isrequired' => $piece['isrequired'],
                    'extension' => $piece['extension'] ?? 'pdf,jpg,jpeg,png',
                    'post' => $piece['post'] ?? null,
                    'short' => $piece['short'] ?? null,
                    'icon' => $piece['icon'] ?? null,
                    'hint' => $piece['hint'] ?? null,
                    'statut' => PieceAFournir::STATUS_ACTIVE,
                ]
            );
        }
    }
}
