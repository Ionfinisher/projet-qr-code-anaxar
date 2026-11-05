<?php

namespace Database\Factories;

use App\Models\PieceAFournir;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\User>
 */
class UserFactory extends Factory
{
    /**
     * The current password being used by the factory.
     */
    protected static ?string $password;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'name' => fake()->name(),
            'email' => fake()->unique()->safeEmail(),
            'email_verified_at' => now(),
            'password' => static::$password ??= Hash::make('password'),
            'remember_token' => Str::random(10),
        ];
    }

    /**
     * Indicate that the model's email address should be unverified.
     */
    public function unverified(): static
    {
        return $this->state(fn (array $attributes) => [
            'email_verified_at' => null,
        ]);
    }

    public function transporteur(string $type = PieceAFournir::TYPE_SOCIETE): static
    {
        return $this->state(fn () => [
            'user_type' => $type,
            'statut' => User::STATUS_APPROVED,
            'email_verified_at' => now(),
        ]);
    }

    public function pending(): static
    {
        return $this->state(fn () => [
            'statut' => User::STATUS_PENDING,
        ]);
    }
}
