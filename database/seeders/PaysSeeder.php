<?php

namespace Database\Seeders;

use App\Models\Pays;
use Illuminate\Database\Seeder;

class PaysSeeder extends Seeder
{
    public function run(): void
    {
        $pays = [
            ['code' => 'TG', 'nom' => 'Togo', 'indicatif' => '+228'],
            ['code' => 'BJ', 'nom' => 'Bénin', 'indicatif' => '+229'],
            ['code' => 'BF', 'nom' => 'Burkina Faso', 'indicatif' => '+226'],
            ['code' => 'CI', 'nom' => "Côte d'Ivoire", 'indicatif' => '+225'],
            ['code' => 'GH', 'nom' => 'Ghana', 'indicatif' => '+233'],
            ['code' => 'NG', 'nom' => 'Nigeria', 'indicatif' => '+234'],
            ['code' => 'SN', 'nom' => 'Sénégal', 'indicatif' => '+221'],
            ['code' => 'CM', 'nom' => 'Cameroun', 'indicatif' => '+237'],
            ['code' => 'GN', 'nom' => 'Guinée', 'indicatif' => '+224'],
            ['code' => 'ML', 'nom' => 'Mali', 'indicatif' => '+223'],
            ['code' => 'NE', 'nom' => 'Niger', 'indicatif' => '+227'],
            ['code' => 'XX', 'nom' => 'Autre', 'indicatif' => null],
        ];

        foreach ($pays as $item) {
            Pays::updateOrCreate(['code' => $item['code']], $item);
        }
    }
}
