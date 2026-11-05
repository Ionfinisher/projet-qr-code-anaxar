<?php

namespace Database\Factories;

use App\Models\Creneau;
use App\Models\DemandeRdv;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\DemandeRdv>
 */
class DemandeRdvFactory extends Factory
{
    protected $model = DemandeRdv::class;

    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'creneau_id' => Creneau::factory(),
            'status' => DemandeRdv::STATUS_PENDING,
            'operation' => 'IMP',
            'terminal' => 'LCT',
            'trucks_count' => 1,
            'submitted_at' => now(),
        ];
    }

    public function approved(): static
    {
        return $this->state(fn () => [
            'status' => DemandeRdv::STATUS_APPROVED,
            'decided_at' => now(),
        ]);
    }

    public function rejected(): static
    {
        return $this->state(fn () => [
            'status' => DemandeRdv::STATUS_REJECTED,
            'decided_at' => now(),
            'rejection_reason' => 'Conteneur non libéré',
        ]);
    }

    public function forUser(User $user): static
    {
        return $this->state(fn () => ['user_id' => $user->id]);
    }

    public function forCreneau(Creneau $creneau): static
    {
        return $this->state(fn () => ['creneau_id' => $creneau->id]);
    }
}
