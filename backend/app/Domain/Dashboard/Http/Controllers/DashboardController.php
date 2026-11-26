<?php

namespace App\Domain\Dashboard\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

class DashboardController
{
    public function __invoke(): JsonResponse
    {
        $summary = DB::selectOne('SELECT * FROM dashboard_security_summary()');

        $recentEvents = DB::table('audit_events')
            ->select(['event_type', 'result', 'occurred_at'])
            ->orderByDesc('occurred_at')
            ->limit(5)
            ->get()
            ->map(fn (object $event): array => [
                'event' => $event->event_type,
                'result' => $event->result,
                'occurred_at' => $event->occurred_at,
            ]);

        return response()->json([
            'data' => [
                'accounts' => [
                    'total' => (int) $summary->total_accounts,
                    'active' => (int) $summary->active_accounts,
                ],
                'active_sessions' => (int) $summary->active_sessions,
                'failed_attempts_24h' => (int) $summary->failed_attempts_24h,
                'recent_events' => $recentEvents,
                'generated_at' => now()->toIso8601String(),
            ],
        ]);
    }
}
