<?php

namespace App\Domain\People\Services;

use App\Domain\Audit\Services\AuditLogger;
use App\Domain\People\Models\Person;
use App\Domain\Users\Services\GeneratedEmail;
use App\Models\User;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class PersonManagementService
{
    public function __construct(
        private readonly GeneratedEmail $generatedEmail,
        private readonly AuditLogger $auditLogger,
    ) {}

    public function create(Request $request, array $data): User
    {
        return DB::transaction(function () use ($request, $data): User {
            $this->assertUnique('people', 'identification', $data['identification'], 'identification');
            $this->assertUnique('users', 'username', $data['username'], 'username');
            $person = Person::query()->create($this->personAttributes($data));
            $user = User::query()->create([
                'person_id' => $person->id,
                'username' => $data['username'],
                'email' => $this->generatedEmail->forPerson($person),
                'password' => $data['password'],
                'status' => $data['status'] ?? 'active',
            ]);
            $this->syncRole($user, $data['role']);

            $this->auditLogger->record($request, 'people.created', 'success', $request->user(), $user, [
                'changed_fields' => ['person', 'username', 'email', 'status', 'role'],
            ]);

            return $user->load(['person', 'roles']);
        }, attempts: 3);
    }

    public function update(Request $request, Person $person, array $data): User
    {
        return DB::transaction(function () use ($request, $person, $data): User {
            $person = Person::query()->whereKey($person->id)->lockForUpdate()->firstOrFail();
            $user = $person->user()->lockForUpdate()->first();
            if (! $user) {
                throw (new ModelNotFoundException)->setModel(User::class);
            }
            if ($request->user()->is($user)) {
                abort(409, 'No puedes cambiar tu propia cuenta desde este formulario.');
            }

            if (isset($data['identification']) && $data['identification'] !== $person->identification) {
                $this->assertUnique('people', 'identification', $data['identification'], 'identification', $person->id);
            }
            if (isset($data['username']) && Str::lower($data['username']) !== Str::lower($user->username)) {
                $this->assertUnique('users', 'username', $data['username'], 'username', $user->id);
            }

            $person->fill($this->personAttributes($data))->save();
            $changedFields = array_keys($person->getChanges());
            $userChanges = [];

            foreach (['username', 'status'] as $field) {
                if (array_key_exists($field, $data)) {
                    $userChanges[$field] = $data[$field];
                }
            }
            if (array_key_exists('password', $data) && $data['password'] !== '') {
                $userChanges['password'] = $data['password'];
                $userChanges['password_changed_at'] = now();
                $changedFields[] = 'password';
            }
            if (array_intersect(['first_name', 'middle_names', 'first_surname', 'second_surname'], array_keys($person->getChanges()))) {
                $userChanges['email'] = $this->generatedEmail->forPerson($person, $user->id);
                $changedFields[] = 'email';
            }
            $user->fill($userChanges)->save();
            $changedFields = [...$changedFields, ...array_keys($user->getChanges())];

            if (isset($data['role'])) {
                $this->syncRole($user, $data['role']);
                $changedFields[] = 'role';
            }
            if (($userChanges['status'] ?? null) === 'inactive' || array_key_exists('password', $userChanges)) {
                $this->revokeSessions($user);
            }

            $this->auditLogger->record($request, 'people.updated', 'success', $request->user(), $user, [
                'changed_fields' => array_values(array_unique($changedFields)),
            ]);

            return $user->fresh()->load(['person', 'roles']);
        }, attempts: 3);
    }

    public function delete(Request $request, Person $person): void
    {
        DB::transaction(function () use ($request, $person): void {
            $person = Person::query()->whereKey($person->id)->lockForUpdate()->firstOrFail();
            $user = $person->user()->lockForUpdate()->first();
            if (! $user) {
                throw (new ModelNotFoundException)->setModel(User::class);
            }
            if ($request->user()->is($user)) {
                abort(409, 'No puedes eliminar tu propia cuenta.');
            }

            $this->auditLogger->record($request, 'people.deleted', 'success', $request->user(), $user, [
                'changed_fields' => ['deleted_at'],
            ]);
            $this->revokeSessions($user);
            $user->delete();
            $person->delete();
        });
    }

    public function unlock(Request $request, Person $person): User
    {
        return DB::transaction(function () use ($request, $person): User {
            $user = $person->user()->lockForUpdate()->first();
            if (! $user) {
                throw (new ModelNotFoundException)->setModel(User::class);
            }
            if ($request->user()->is($user)) {
                abort(409, 'No puedes desbloquear tu propia cuenta desde este formulario.');
            }

            $user->forceFill(['failed_login_attempts' => 0, 'locked_at' => null])->save();
            $this->auditLogger->record($request, 'users.unlocked', 'success', $request->user(), $user, [
                'changed_fields' => ['failed_login_attempts', 'locked_at'],
            ]);

            return $user->fresh()->load(['person', 'roles']);
        });
    }

    private function personAttributes(array $data): array
    {
        return array_intersect_key($data, array_flip([
            'first_name', 'middle_names', 'first_surname', 'second_surname', 'identification', 'birth_date',
        ]));
    }

    private function syncRole(User $user, string $roleSlug): void
    {
        $roleId = DB::table('roles')->where('slug', $roleSlug)->value('id');
        if ($roleId === null) {
            abort(422, 'El rol solicitado no existe.');
        }
        $user->roles()->sync([(int) $roleId]);
    }

    private function revokeSessions(User $user): void
    {
        $user->activeSession()->delete();
        DB::table('sessions')->where('user_id', $user->id)->delete();
    }

    private function assertUnique(string $table, string $column, string $value, string $field, ?int $exceptId = null): void
    {
        $normalized = in_array($column, ['username', 'email'], true) ? Str::lower($value) : $value;
        if (DB::getDriverName() === 'pgsql') {
            DB::select('SELECT pg_advisory_xact_lock(hashtextextended(?, 0))', ["unique:{$table}:{$column}:{$normalized}"]);
        }

        $query = DB::table($table)->where($column, $normalized);
        if (in_array($column, ['username', 'email'], true)) {
            $query->whereRaw("LOWER({$column}) = ?", [$normalized]);
        }
        $exists = $query->when($exceptId !== null, fn ($builder) => $builder->where('id', '!=', $exceptId))->exists();

        if ($exists) {
            throw ValidationException::withMessages([$field => 'El valor ya está registrado.']);
        }
    }
}
