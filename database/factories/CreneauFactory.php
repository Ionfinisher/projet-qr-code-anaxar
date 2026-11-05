<?php

namespace Database\Factories;

use App\Models\Creneau;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Creneau>
 */
class CreneauFactory extends Factory
{
    protected $model = Creneau::class;

    public function definition(): array
    {
        $start = fake()->randomElement(['08:00', '10:00', '12:00', '14:00', '16:00']);

        return [
            'date' => now()->addDay()->format('Y-m-d'),
            'start' => $start,
            'end' => Carbon::createFromFormat('H:i', $start)->addHours(2)->format('H:i'),
            'capacity' => 40,
            'open' => true,
            'close_reason' => null,
        ];
    }

    public function past(): static
    {
        return $this->state(fn () => [
            'date' => now()->subDay()->format('Y-m-d'),
        ]);
    }

    public function closed(): static
    {
        return $this->state(fn () => [
            'open' => false,
            'close_reason' => 'Maintenance portique',
        ]);
    }

    public function capacity(int $capacity): static
    {
        return $this->state(fn () => ['capacity' => $capacity]);
    }
}
