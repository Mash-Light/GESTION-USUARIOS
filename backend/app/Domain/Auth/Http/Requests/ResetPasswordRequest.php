<?php

namespace App\Domain\Auth\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class ResetPasswordRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'email' => ['required', 'string', 'email:rfc', 'max:254'],
            'token' => ['required', 'string', 'max:255'],
            'password' => [
                'required',
                'string',
                'min:8',
                'max:255',
                'regex:/[A-Z]/',
                'regex:/[^A-Za-z0-9\s]/',
                'not_regex:/\s/',
                'confirmed',
            ],
        ];
    }
}
