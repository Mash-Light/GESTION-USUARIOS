<?php

namespace App\Domain\Auth\Services;

use App\Domain\Audit\Services\AuditLogger;
use App\Domain\Auth\DTOs\LoginResult;
use App\Domain\Auth\Models\ActiveSession;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Str;

class AuthenticationService
{
    public function __construct(private readonly AuditLogger $auditLogger) {}

    public function login(Request $request, string $identifier, string $password): LoginResult
    {
        $normalized = Str::lower(trim($identifier));
        $rateLimitKey = $this->rateLimitKey($request, $normalized);
        $loginType = str_contains($normalized, '@') ? 'email' : 'username';

        if (RateLimiter::tooManyAttempts($rateLimitKey, 10)) {
            $this->auditLogger->record($request, 'auth.login', 'failed', metadata: [
                'reason' => 'rate_limited',
                'login_type' => $loginType,
            ]);

            return LoginResult::rateLimited();
        }

        RateLimiter::hit($rateLimitKey, 60);

        $userId = User::query()
            ->whereRaw('LOWER(email) = ?', [$normalized])
            ->orWhereRaw('LOWER(username) = ?', [$normalized])
            ->value('id');

        if ($userId === null) {
            Hash::check($password, config('security.dummy_password_hash'));
            $this->auditLogger->record($request, 'auth.login', 'failed', metadata: [
                'reason' => 'invalid_credentials',
                'login_type' => $loginType,
            ]);

            return LoginResult::invalid();
        }

        $result = DB::transaction(function () use ($request, $userId, $password, $loginType): LoginResult {
            $user = User::query()->whereKey($userId)->lockForUpdate()->first();

            if ($user === null) {
                $this->auditLogger->record($request, 'auth.login', 'failed', metadata: [
                    'reason' => 'invalid_credentials',
                    'login_type' => $loginType,
                ]);

                return LoginResult::invalid();
            }

            if ($user->locked_at !== null) {
                $this->auditLogger->record($request, 'auth.login', 'failed', subject: $user, metadata: [
                    'reason' => 'account_locked',
                    'login_type' => $loginType,
                ]);

                return LoginResult::locked();
            }

            if (! Hash::check($password, $user->password)) {
                $user->failed_login_attempts = min(3, $user->failed_login_attempts + 1);
                if ($user->failed_login_attempts >= 3) {
                    $user->locked_at = now();
                }
                $user->save();

                $this->auditLogger->record($request, 'auth.login', 'failed', subject: $user, metadata: [
                    'reason' => $user->locked_at === null ? 'invalid_credentials' : 'account_locked',
                    'login_type' => $loginType,
                ]);

                return $user->locked_at === null ? LoginResult::invalid() : LoginResult::locked();
            }

            if ($user->status !== 'active') {
                $this->auditLogger->record($request, 'auth.login', 'failed', subject: $user, metadata: [
                    'reason' => 'account_inactive',
                    'login_type' => $loginType,
                ]);

                return LoginResult::inactive();
            }

            $currentSession = ActiveSession::query()->where('user_id', $user->id)->first();
            if ($currentSession !== null && $currentSession->expires_at->isFuture()) {
                $this->auditLogger->record($request, 'auth.session_conflict', 'denied', subject: $user, metadata: [
                    'reason' => 'session_already_active',
                    'login_type' => $loginType,
                ]);

                return LoginResult::sessionActive();
            }

            $currentSession?->delete();
            $user->failed_login_attempts = 0;
            $user->last_login_at = now();
            $user->save();

            Auth::guard('web')->login($user);
            $request->session()->regenerate();

            ActiveSession::query()->create([
                'user_id' => $user->id,
                'session_hash' => hash('sha256', $request->session()->getId()),
                'ip_address' => $request->ip(),
                'user_agent' => $request->userAgent() === null ? null : mb_substr($request->userAgent(), 0, 255),
                'expires_at' => now()->addMinutes((int) config('session.lifetime', 120)),
            ]);

            $this->auditLogger->record($request, 'auth.login', 'success', actor: $user, subject: $user, metadata: [
                'login_type' => $loginType,
            ]);

            return LoginResult::success($user);
        }, attempts: 3);

        if ($result->status === 'success') {
            RateLimiter::clear($rateLimitKey);
        }

        return $result;
    }

    public function logout(Request $request, User $user): void
    {
        DB::transaction(function () use ($request, $user): void {
            $this->auditLogger->record($request, 'auth.logout', 'success', actor: $user, subject: $user);
            ActiveSession::query()->where('user_id', $user->id)->delete();
        });

        Auth::guard('web')->logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();
    }

    private function rateLimitKey(Request $request, string $normalizedLogin): string
    {
        return 'login:'.hash('sha256', $request->ip().'|'.$normalizedLogin);
    }
}
