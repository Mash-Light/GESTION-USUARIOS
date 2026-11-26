<?php

namespace App\Http\Middleware;

use App\Domain\Audit\Services\AuditLogger;
use App\Domain\Auth\Models\ActiveSession;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

class EnsureActiveSession
{
    public function __construct(private readonly AuditLogger $auditLogger) {}

    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();
        if ($user === null || ! $request->hasSession()) {
            return response()->json(['message' => 'La sesión venció. Inicia sesión de nuevo.'], 401);
        }

        $session = ActiveSession::query()
            ->where('user_id', $user->id)
            ->where('session_hash', hash('sha256', $request->session()->getId()))
            ->where('expires_at', '>', now())
            ->first();

        if ($session === null) {
            $this->auditLogger->record($request, 'auth.session_rejected', 'failed', subject: $user, metadata: [
                'reason' => 'session_expired_or_revoked',
            ]);
            Auth::guard('web')->logout();
            $request->session()->invalidate();
            $request->session()->regenerateToken();

            return response()->json(['message' => 'La sesión venció. Inicia sesión de nuevo.'], 401);
        }

        $session->forceFill([
            'expires_at' => now()->addMinutes((int) config('session.lifetime', 120)),
        ])->save();

        return $next($request);
    }
}
