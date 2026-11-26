<?php

namespace Database\Seeders;

use App\Domain\Access\Models\Role;
use App\Domain\People\Models\Person;
use App\Domain\Users\Services\GeneratedEmail;
use App\Models\User;
use Illuminate\Database\Seeder;

class DemoUsersSeeder extends Seeder
{
    public function run(): void
    {
        $this->makeUser('Andrea', 'Marcela', 'Mora', 'Vera', '0102030405', 'Admin001', 'AdminDemo2026!', 'admin');
        $this->makeUser('Mateo', null, 'Paredes', 'Luna', '0908070605', 'Usuario1', 'UsuarioDemo2026!', 'member');
    }

    private function makeUser(
        string $firstName,
        ?string $middleNames,
        string $firstSurname,
        string $secondSurname,
        string $identification,
        string $username,
        string $password,
        string $roleSlug,
    ): User {
        $person = Person::query()->firstOrCreate(
            ['identification' => $identification],
            [
                'first_name' => $firstName,
                'middle_names' => $middleNames,
                'first_surname' => $firstSurname,
                'second_surname' => $secondSurname,
            ],
        );
        $existing = User::withTrashed()->where('person_id', $person->id)->first();
        $email = app(GeneratedEmail::class)->forPerson($person, $existing?->id);

        $user = User::query()->updateOrCreate(
            ['person_id' => $person->id],
            [
                'username' => $username,
                'email' => $email,
                'password' => $password,
                'status' => 'active',
                'failed_login_attempts' => 0,
                'locked_at' => null,
            ],
        );
        $user->roles()->sync([Role::query()->where('slug', $roleSlug)->value('id')]);

        return $user;
    }
}
