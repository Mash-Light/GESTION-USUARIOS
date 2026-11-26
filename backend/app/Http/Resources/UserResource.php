<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class UserResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->fullName(),
            'username' => $this->username,
            'email' => $this->email,
            'status' => $this->status,
            'failed_login_attempts' => $this->failed_login_attempts,
            'profile' => $this->whenLoaded('person', fn () => [
                'first_name' => $this->person->first_name,
                'middle_names' => $this->person->middle_names,
                'first_surname' => $this->person->first_surname,
                'second_surname' => $this->person->second_surname,
                'identification' => $this->person->identification,
                'birth_date' => $this->person->birth_date?->toDateString(),
            ]),
            'roles' => $this->whenLoaded('roles', fn () => $this->roles->pluck('slug')->values()),
            'permissions' => $this->whenLoaded('roles', fn () => $this->roles
                ->flatMap(fn ($role) => $role->permissions->pluck('slug'))
                ->unique()->values()),
            'last_login_at' => $this->last_login_at?->toIso8601String(),
        ];
    }
}
