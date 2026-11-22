<?php

namespace Database\Seeders;

use App\Models\Terminal;
use Illuminate\Database\Seeder;

class TerminalSeeder extends Seeder
{
    public function run(): void
    {
        $terminals = [
            [
                'code' => 'LCT',
                'short' => 'LCT',
                'label' => 'Lomé Container Terminal',
                'statut' => 'active',
            ],
            [
                'code' => 'TGT',
                'short' => 'TGT',
                'label' => 'Togo Terminal',
                'statut' => 'active',
            ],
            [
                'code' => 'QCV',
                'short' => 'Quai conv.',
                'label' => 'Quai conventionnel',
                'statut' => 'active',
            ],
        ];

        foreach ($terminals as $t) {
            Terminal::firstOrCreate(
                ['code' => $t['code']],
                [
                    'short' => $t['short'],
                    'label' => $t['label'],
                    'statut' => $t['statut'],
                ]
            );
        }
    }
}

