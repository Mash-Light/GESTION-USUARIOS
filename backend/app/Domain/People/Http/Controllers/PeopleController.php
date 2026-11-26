<?php

namespace App\Domain\People\Http\Controllers;

use App\Domain\People\Http\Requests\StorePersonRequest;
use App\Domain\People\Http\Requests\UpdatePersonRequest;
use App\Domain\People\Http\Resources\ManagedPersonResource;
use App\Domain\People\Models\Person;
use App\Domain\People\Services\PersonManagementService;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class PeopleController extends Controller
{
    private const SORTS = [
        'name' => "LOWER(CONCAT_WS(' ', people.first_name, people.middle_names, people.first_surname, people.second_surname))",
        'identification' => 'people.identification',
        'username' => 'managed_users.username',
        'email' => 'managed_users.email',
        'created_at' => 'people.created_at',
    ];

    public function index(Request $request): JsonResponse
    {
        $filters = $request->validate([
            'search' => ['sometimes', 'nullable', 'string', 'max:120'],
            'status' => ['sometimes', 'nullable', Rule::in(['active', 'inactive'])],
            'sort' => ['sometimes', 'string', Rule::in(array_keys(self::SORTS))],
            'direction' => ['sometimes', 'string', Rule::in(['asc', 'desc'])],
            'per_page' => ['sometimes', 'integer', 'min:5', 'max:50'],
        ]);
        $query = Person::query()
            ->select('people.*')
            ->join('users as managed_users', function ($join): void {
                $join->on('managed_users.person_id', '=', 'people.id')
                    ->whereNull('managed_users.deleted_at');
            })
            ->with(['user.roles'])
            ->when(isset($filters['status']), fn ($builder) => $builder->where('managed_users.status', $filters['status']))
            ->when(! empty($filters['search']), function ($builder) use ($filters): void {
                $term = '%'.mb_strtolower(trim($filters['search'])).'%';
                $builder->where(function ($nested) use ($term): void {
                    $nested->whereRaw("LOWER(COALESCE(people.first_name, '') || ' ' || COALESCE(people.middle_names, '') || ' ' || COALESCE(people.first_surname, '') || ' ' || COALESCE(people.second_surname, '')) LIKE ?", [$term])
                        ->orWhereRaw('LOWER(people.identification) LIKE ?', [$term])
                        ->orWhereRaw('LOWER(managed_users.username) LIKE ?', [$term])
                        ->orWhereRaw('LOWER(managed_users.email) LIKE ?', [$term]);
                });
            });

        $sort = $filters['sort'] ?? 'name';
        $direction = $filters['direction'] ?? 'asc';
        $paginator = $query
            ->orderByRaw(self::SORTS[$sort].' '.$direction)
            ->orderBy('people.id')
            ->paginate($filters['per_page'] ?? 10)
            ->withQueryString();

        return response()->json([
            'data' => ManagedPersonResource::collection($paginator->getCollection())->resolve(),
            'meta' => [
                'current_page' => $paginator->currentPage(),
                'last_page' => $paginator->lastPage(),
                'per_page' => $paginator->perPage(),
                'total' => $paginator->total(),
            ],
        ]);
    }

    public function show(Person $person): JsonResponse
    {
        $person->load(['user.roles']);

        return response()->json(['data' => (new ManagedPersonResource($person))->resolve()]);
    }

    public function store(StorePersonRequest $request, PersonManagementService $people): JsonResponse
    {
        $user = $people->create($request, $request->validated());
        $person = $user->person->load(['user.roles']);

        return response()->json(['data' => (new ManagedPersonResource($person))->resolve($request)], 201);
    }

    public function update(UpdatePersonRequest $request, Person $person, PersonManagementService $people): JsonResponse
    {
        $user = $people->update($request, $person, $request->validated());
        $person = $user->person->load(['user.roles']);

        return response()->json(['data' => (new ManagedPersonResource($person))->resolve($request)]);
    }

    public function destroy(Request $request, Person $person, PersonManagementService $people): JsonResponse
    {
        $people->delete($request, $person);

        return response()->json(null, 204);
    }

    public function unlock(Request $request, Person $person, PersonManagementService $people): JsonResponse
    {
        $user = $people->unlock($request, $person);
        $person = $user->person->load(['user.roles']);

        return response()->json(['data' => (new ManagedPersonResource($person))->resolve($request)]);
    }
}
