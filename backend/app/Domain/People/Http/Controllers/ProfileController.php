<?php

namespace App\Domain\People\Http\Controllers;

use App\Domain\Audit\Services\AuditLogger;
use App\Domain\Users\Services\GeneratedEmail;
use App\Http\Controllers\Controller;
use App\Http\Resources\UserResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class ProfileController extends Controller
{
    public function update(Request $request, GeneratedEmail $emails, AuditLogger $audit): JsonResponse
    {
        abort_unless($request->user()->hasPermission('profile.update-own'), 403);

        $data = $request->validate([
            'first_name' => ['sometimes', 'required', 'string', 'max:60', 'regex:/^[\pL\pM][\pL\pM\'’ -]*$/u'],
            'middle_names' => ['sometimes', 'nullable', 'string', 'max:120', 'regex:/^[\pL\pM][\pL\pM\'’ -]*$/u'],
            'first_surname' => ['sometimes', 'required', 'string', 'max:60', 'regex:/^[\pL\pM][\pL\pM\'’ -]*$/u'],
            'second_surname' => ['sometimes', 'required', 'string', 'max:60', 'regex:/^[\pL\pM][\pL\pM\'’ -]*$/u'],
            'birth_date' => ['sometimes', 'nullable', 'date', 'before:today'],
            'identification' => ['prohibited'],
            'username' => ['prohibited'],
            'email' => ['prohibited'],
            'password' => ['prohibited'],
            'status' => ['prohibited'],
            'role' => ['prohibited'],
        ]);

        $user = DB::transaction(function () use ($request, $data, $emails, $audit) {
            $user = $request->user()->newQuery()->whereKey($request->user()->id)->lockForUpdate()->firstOrFail();
            $person = $user->person()->lockForUpdate()->first();
            if (! $person) {
                throw ValidationException::withMessages(['profile' => 'La cuenta no tiene un perfil personal asociado.']);
            }

            $person->fill($data)->save();
            $changed = array_keys($person->getChanges());
            if (array_intersect(['first_name', 'first_surname', 'second_surname'], $changed)) {
                $user->email = $emails->forPerson($person, $user->id);
                $user->save();
                $changed[] = 'email';
            }

            $audit->record($request, 'profile.updated', 'success', $user, $user, [
                'changed_fields' => array_values(array_unique($changed)),
            ]);

            return $user->fresh()->load(['person', 'roles.permissions']);
        }, attempts: 3);

        return response()->json(['data' => ['user' => (new UserResource($user))->resolve($request)]]);
    }
}
