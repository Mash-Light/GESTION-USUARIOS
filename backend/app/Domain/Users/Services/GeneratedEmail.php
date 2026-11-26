<?php

namespace App\Domain\Users\Services;

use App\Domain\People\Models\Person;
use App\Models\User;
use Illuminate\Support\Str;

class GeneratedEmail
{
    public function forPerson(Person $person, ?int $excludingUserId = null): string
    {
        $firstInitial = $this->letters($person->first_name)[0] ?? '';
        $surname = $this->letters($person->first_surname);
        $secondInitial = $this->letters($person->second_surname)[0] ?? '';
        $base = Str::lower($firstInitial . $surname . $secondInitial);

        if ($base === '') {
            throw new \InvalidArgumentException('No se puede generar un correo con nombres vacíos.');
        }

        $domain = Str::lower((string) config('users.email_domain', 'mail.com'));

        for ($suffix = 0; $suffix < 10000; $suffix++) {
            $localPart = $base . ($suffix === 0 ? '' : $suffix);
            $candidate = $localPart . '@' . $domain;

            $exists = User::withTrashed()
                ->whereRaw('LOWER(email) = ?', [$candidate])
                ->when($excludingUserId !== null, fn ($query) => $query->whereKeyNot($excludingUserId))
                ->exists();

            if (! $exists) {
                return $candidate;
            }
        }

        throw new \RuntimeException('No se pudo reservar un correo único para esta persona.');
    }

    private function letters(string $value): string
    {
        return preg_replace('/[^A-Za-z]/', '', Str::ascii(trim($value))) ?? '';
    }
}
