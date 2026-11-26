<?php

namespace Database\Factories;

use App\Domain\People\Models\Person;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

/** @extends Factory<User> */
class UserFactory extends Factory
{
    protected static ?string $password = null;

    public function definition(): array
    {
        return [
            'person_id' => Person::factory(),
            'username' => fake()->unique()->regexify('[A-Z][a-z]{6}[0-9]'),
            'email' => fake()->unique()->safeEmail(),
            'password' => static::$password ??= Hash::make('Password1!'),
            'status' => 'active',
            'remember_token' => Str::random(10),
        ];
    }
}
