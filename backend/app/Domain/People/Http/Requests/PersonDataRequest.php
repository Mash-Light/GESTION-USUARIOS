<?php

namespace App\Domain\People\Http\Requests;

use App\Domain\People\Models\Person;
use Illuminate\Database\Query\Builder;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\Rules\Password;
use Illuminate\Validation\Validator;

abstract class PersonDataRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->hasPermission('people.manage') ?? false;
    }

    protected function prepareForValidation(): void
    {
        $normalized = [];
        foreach (['first_name', 'middle_names', 'first_surname', 'second_surname', 'identification', 'username'] as $field) {
            if ($this->has($field) && is_string($this->input($field))) {
                $normalized[$field] = trim($this->input($field));
            }
        }
        $this->merge($normalized);
    }

    public function rules(): array
    {
        $updating = in_array(strtoupper($this->getMethod()), ['PATCH', 'PUT'], true);

        return [
            'first_name' => [$updating ? 'sometimes' : 'required', 'string', 'max:60', 'regex:/^[\pL\pM][\pL\pM\'’ -]*$/u'],
            'middle_names' => ['sometimes', 'nullable', 'string', 'max:120', 'regex:/^[\pL\pM][\pL\pM\'’ -]*$/u'],
            'first_surname' => [$updating ? 'sometimes' : 'required', 'string', 'max:60', 'regex:/^[\pL\pM][\pL\pM\'’ -]*$/u'],
            'second_surname' => [$updating ? 'sometimes' : 'required', 'string', 'max:60', 'regex:/^[\pL\pM][\pL\pM\'’ -]*$/u'],
            'identification' => [$updating ? 'sometimes' : 'required', 'string', 'regex:/^(?!.*([0-9])\\1{3})[0-9]{10}$/'],
            'birth_date' => ['sometimes', 'nullable', 'date', 'before:today'],
            'username' => [$updating ? 'sometimes' : 'required', 'string', 'min:8', 'max:20', 'regex:/^(?=.*[A-Z])(?=.*[0-9])[A-Za-z0-9]+$/'],
            'password' => [$updating ? 'sometimes' : 'required', 'string', Password::min(10)->mixedCase()->numbers()->symbols()],
            'status' => ['sometimes', 'in:active,inactive'],
            'role' => [$updating ? 'sometimes' : 'required', 'string', 'exists:roles,slug'],
        ];
    }

    public function after(): array
    {
        return [function (Validator $validator): void {
            $person = $this->route('person');
            $personId = $person instanceof Person ? $person->id : null;
            $userId = $person instanceof Person ? $person->user()->value('id') : null;

            $identification = $this->input('identification');
            if (is_string($identification) && $identification !== '') {
                $exists = DB::table('people')->where('identification', $identification)
                    ->when($personId, fn (Builder $query) => $query->where('id', '!=', $personId))
                    ->exists();
                if ($exists) {
                    $validator->errors()->add('identification', 'La identificación ya está registrada.');
                }
            }

            $username = $this->input('username');
            if (is_string($username) && $username !== '') {
                $exists = DB::table('users')->whereRaw('LOWER(username) = ?', [Str::lower($username)])
                    ->when($userId, fn (Builder $query) => $query->where('id', '!=', $userId))
                    ->exists();
                if ($exists) {
                    $validator->errors()->add('username', 'El nombre de usuario ya está registrado.');
                }
            }
        }];
    }
}
