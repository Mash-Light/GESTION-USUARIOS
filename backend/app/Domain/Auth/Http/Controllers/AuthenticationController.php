<?php

namespace App\Domain\Auth\Http\Controllers;

use App\Domain\Auth\DTOs\LoginResult;
use App\Domain\Auth\Http\Requests\LoginRequest;
use App\Domain\Auth\Services\AuthenticationService;
use App\Http\Controllers\Controller;
use App\Http\Resources\UserResource;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AuthenticationController extends Controller
{
    public function login(LoginRequest $request, AuthenticationService $authentication): JsonResponse
    {
        $result = $authentication->login(
            $request,
            $request->string('login')->toString(),
            $request->string('password')->toString(),
        );

        if ($result->status !== 'success') {
            return $this->loginFailure($result);
        }

        $result->user->load(['person', 'roles.permissions']);

        return response()->json([
            'data' => ['user' => (new UserResource($result->user))->resolve($request)],
        ]);
    }

    public function current(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();
        $user->load(['person', 'roles.permissions']);

        return response()->json([
            'data' => ['user' => (new UserResource($user))->resolve($request)],
        ]);
    }

    public function logout(Request $request, AuthenticationService $authentication): JsonResponse
    {
        $authentication->logout($request, $request->user());

        return response()->json(null, 204);
    }

    private function loginFailure(LoginResult $result): JsonResponse
    {
        return match ($result->status) {
            'locked' => response()->json(['message' => 'La cuenta está bloqueada. Contacta a un administrador.'], 423),
            'inactive' => response()->json(['message' => 'La cuenta no está habilitada para iniciar sesión.'], 403),
            'session_active' => response()->json(['message' => 'Ya existe una sesión activa para esta cuenta.'], 409),
            'rate_limited' => response()->json(['message' => 'Demasiados intentos. Espera un minuto y vuelve a intentarlo.'], 429, ['Retry-After' => '60']),
            default => response()->json(['message' => 'El correo o usuario y la contraseña no coinciden.'], 401),
        };
    }
}
