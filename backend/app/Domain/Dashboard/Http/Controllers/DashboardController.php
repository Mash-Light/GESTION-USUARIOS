<?php

namespace App\Domain\Dashboard\Http\Controllers;

use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Carbon;
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

        $dailyRows = DB::table('audit_events')
            ->selectRaw("occurred_at::date::text AS day, COUNT(*) FILTER (WHERE result = 'success') AS successful, COUNT(*) FILTER (WHERE result = 'failed') AS failed")
            ->where('event_type', 'auth.login')
            ->where('occurred_at', '>=', now()->startOfDay()->subDays(6))
            ->groupByRaw('occurred_at::date')
            ->get()
            ->keyBy('day');

        $activityByDay = collect(range(6, 0))->map(function (int $daysAgo) use ($dailyRows): array {
            $day = now()->startOfDay()->subDays($daysAgo)->toDateString();
            $row = $dailyRows->get($day);

            return [
                'day' => $day,
                'label' => Carbon::parse($day)->locale('es')->isoFormat('dd'),
                'successful' => (int) ($row->successful ?? 0),
                'failed' => (int) ($row->failed ?? 0),
            ];
        });

        $recentUsers = User::query()
            ->with(['person', 'roles'])
            ->orderByRaw('last_login_at DESC NULLS LAST')
            ->orderByDesc('id')
            ->limit(5)
            ->get()
            ->map(fn (User $user): array => [
                'id' => $user->id,
                'name' => $user->fullName(),
                'username' => $user->username,
                'email' => $user->email,
                'role' => $user->roles->first()?->slug,
                'status' => $user->status,
                'locked' => $user->locked_at !== null,
                'last_login_at' => $user->last_login_at?->toIso8601String(),
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
                'activity_by_day' => $activityByDay,
                'recent_users' => $recentUsers,
                'generated_at' => now()->toIso8601String(),
            ],
        ]);
    }
}
