<?php

namespace App\Domain\Imports\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreImportRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->hasPermission('imports.manage') ?? false;
    }

    public function rules(): array
    {
        return [
            'file' => ['required', 'file', 'max:10240', 'mimes:csv,txt,xlsx'],
        ];
    }
}
