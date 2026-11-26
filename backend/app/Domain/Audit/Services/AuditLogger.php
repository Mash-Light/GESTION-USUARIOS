<?php

namespace App\Domain\Audit\Services;

use App\Domain\Audit\Models\AuditEvent;
use App\Models\User;
use Illuminate\Http\Request;

class AuditLogger
{
    private const SAFE_METADATA_KEYS = ['reason', 'login_type', 'changed_fields'];

    public function record(
        Request $request,
        string $eventType,
        string $result,
        ?User $actor = null,
        ?User $subject = null,
        array $metadata = [],
    ): AuditEvent {
        return AuditEvent::query()->create([
            'actor_user_id' => $actor?->getKey(),
            'subject_user_id' => $subject?->getKey(),
            'event_type' => $eventType,
            'result' => $result,
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent() === null
                ? null
                : mb_substr($request->userAgent(), 0, 255),
            'metadata' => array_intersect_key($metadata, array_flip(self::SAFE_METADATA_KEYS)),
            'occurred_at' => now(),
        ]);
    }
}
