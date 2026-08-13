<?php

namespace Database\Factories;

use App\Enums\UserStatus;
use App\Enums\UserType;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

class UserFactory extends Factory
{
    public function definition(): array
    {
        return [
            'uuid' => (string) Str::uuid(),
            'first_name' => fake()->firstName(),
            'last_name' => fake()->lastName(),
            'email' => fake()->unique()->safeEmail(),
            'email_verified_at' => now(),
            'phone' => '080'.fake()->unique()->numerify('########'),
            'password' => 'password',
            'user_type' => UserType::Helper,
            'status' => UserStatus::Active,
            'remember_token' => Str::random(10),
        ];
    }
}
