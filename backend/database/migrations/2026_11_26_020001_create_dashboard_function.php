<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        if (DB::getDriverName() !== 'pgsql') {
            return;
        }

        DB::unprepared(<<<'SQL'
            CREATE OR REPLACE FUNCTION dashboard_security_summary()
            RETURNS TABLE (
                total_accounts BIGINT,
                active_accounts BIGINT,
                active_sessions BIGINT,
                failed_attempts_24h BIGINT
            )
            LANGUAGE SQL
            STABLE
            AS $$
                SELECT
                    (SELECT COUNT(*) FROM users WHERE deleted_at IS NULL),
                    (SELECT COUNT(*) FROM users WHERE deleted_at IS NULL AND status = 'active' AND locked_at IS NULL),
                    (SELECT COUNT(*) FROM active_sessions WHERE expires_at > CURRENT_TIMESTAMP),
                    (SELECT COUNT(*) FROM audit_events WHERE event_type = 'auth.login' AND result = 'failed' AND occurred_at >= CURRENT_TIMESTAMP - INTERVAL '24 hours')
            $$
            SQL);
    }

    public function down(): void
    {
        if (DB::getDriverName() === 'pgsql') {
            DB::unprepared('DROP FUNCTION IF EXISTS dashboard_security_summary()');
        }
    }
};
