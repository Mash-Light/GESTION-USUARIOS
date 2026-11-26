<?php

namespace App\Domain\People\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ManagedPersonResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $user = $this->user;

        return [
            'id' => $this->id,
            'first_name' => $this->first_name,
            'middle_names' => $this->middle_names,
            'first_surname' => $this->first_surname,
            'second_surname' => $this->second_surname,
            'identification' => $this->identification,
            'birth_date' => $this->birth_date?->toDateString(),
            'user' => [
                'id' => $user->id,
                'username' => $user->username,
                'email' => $user->email,
                'status' => $user->status,
                'role' => $user->roles->first()?->slug,
                'locked_at' => $user->locked_at?->toIso8601String(),
                'last_login_at' => $user->last_login_at?->toIso8601String(),
            ],
        ];
    }
}
