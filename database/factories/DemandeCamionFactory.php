<?php

namespace Database\Factories;

use App\Models\DemandeCamion;
use App\Models\DemandeRdv;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\DemandeCamion>
 */
class DemandeCamionFactory extends Factory
{
    protected $model = DemandeCamion::class;

    public function definition(): array
    {
        return [
            'demande_rdv_id' => DemandeRdv::factory(),
            'position' => 1,
            'driver_first' => fake()->firstName(),
            'driver_last' => strtoupper(fake()->lastName()),
            'driver_phone' => '+22890123456',
            'driver_license' => 'LIC12345',
            'vehicle_country' => 'TG',
            'vehicle_tractor' => 'TG 1234 AB',
            'vehicle_trailer' => null,
            'container_number' => 'MSCU4829130',
            'container_iso' => '45G1',
            'container_bl' => 'BL123456',
            'container_goods' => 'Marchandise',
            'container_vgm' => null,
        ];
    }

    public function forDemande(DemandeRdv $demande, int $position = 1): static
    {
        return $this->state(fn () => [
            'demande_rdv_id' => $demande->id,
            'position' => $position,
        ]);
    }
}
