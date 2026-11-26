<?php

namespace App\Domain\Auth\Http\Controllers;

use App\Domain\Audit\Services\AuditLogger;
use App\Domain\Auth\Http\Requests\ForgotPasswordRequest;
use App\Domain\Auth\Http\Requests\ResetPasswordRequest;
use App\Domain\Auth\Models\ActiveSession;
use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Auth\Events\PasswordReset;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Str;

class PasswordResetController extends Controller
{
    public function send(ForgotPasswordRequest $request, AuditLogger $auditLogger): JsonResponse
    {
        $email = Str::lower(trim($request->string('email')->toString()));
        $user = User::query()->whereRaw('LOWER(email) = ?', [$email])->first();

        if ($user !== null) {
            Password::sendResetLink(['email' => $user->email]);
        }

        $auditLogger->record(
            $request,
            'auth.password_reset_requested',
            'accepted',
            subject: $user,
        );

        return response()->json([
            'message' => 'Si los datos corresponden a una cuenta, recibirás instrucciones para continuar.',
        ]);
    }

    public function reset(ResetPasswordRequest $request, AuditLogger $auditLogger): JsonResponse
    {
        $email = Str::lower(trim($request->string('email')->toString()));
        $user = User::query()->whereRaw('LOWER(email) = ?', [$email])->first();

        $status = DB::transaction(function () use ($user, $email, $request, $auditLogger): string {
            if ($user !== null) {
                DB::table(config('auth.passwords.users.table'))
                    ->where('email', $user->getEmailForPasswordReset())
                    ->lockForUpdate()
                    ->first();
            }

            return Password::reset(
                [
                    'email' => $user?->email ?? $email,
                    'token' => $request->string('token')->toString(),
                    'password' => $request->string('password')->toString(),
                    'password_confirmation' => $request->string('password_confirmation')->toString(),
                ],
                function (User $account, string $password) use ($request, $auditLogger): void {
                    DB::transaction(function () use ($account, $password, $request, $auditLogger): void {
                        $account = User::query()->whereKey($account->id)->lockForUpdate()->firstOrFail();
                        $account->forceFill([
                            'password' => Hash::make($password),
                            'password_changed_at' => now(),
                            'failed_login_attempts' => 0,
                            'locked_at' => null,
                        ])->save();

                        ActiveSession::query()->where('user_id', $account->id)->delete();
                        DB::table('sessions')->where('user_id', $account->id)->delete();
                        $auditLogger->record($request, 'auth.password_reset', 'success', subject: $account);
                    });

                    event(new PasswordReset($account));
                },
            );
        });

        if ($status !== Password::PASSWORD_RESET) {
            $auditLogger->record($request, 'auth.password_reset', 'failed', subject: $user, metadata: [
                'reason' => 'invalid_or_expired_token',
            ]);

            return response()->json(['message' => 'El enlace no es válido o ya venció. Solicita otro.'], 422);
        }

        return response()->json(['message' => 'La contraseña se actualizó. Ya puedes iniciar sesión.']);
    }
}
