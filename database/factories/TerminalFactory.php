<?php

namespace Database\Factories;

use App\Models\Terminal;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Terminal>
 */
class TerminalFactory extends Factory
{
    protected $model = Terminal::class;

    public function definition(): array
    {
        $code = strtoupper(fake()->unique()->lexify('???'));

        return [
            'label' => "Terminal {$code}",
            'short' => $code,
            'code' => $code,
            'statut' => 'active',
        ];
    }

    public function inactive(): static
    {
        return $this->state(fn () => [
            'statut' => 'inactive',
        ]);
    }
}

