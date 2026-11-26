<?php

namespace Database\Factories;

use App\Domain\People\Models\Person;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<Person> */
class PersonFactory extends Factory
{
    protected $model = Person::class;

    public function definition(): array
    {
        do {
            $identification = fake()->unique()->numerify('##########');
        } while (preg_match('/(\d)\1{3}/', $identification));

        return [
            'first_name' => fake()->firstName(),
            'middle_names' => fake()->optional()->firstName(),
            'first_surname' => fake()->lastName(),
            'second_surname' => fake()->lastName(),
            'identification' => $identification,
            'birth_date' => fake()->optional()->dateTimeBetween('-75 years', '-18 years')?->format('Y-m-d'),
        ];
    }
}
