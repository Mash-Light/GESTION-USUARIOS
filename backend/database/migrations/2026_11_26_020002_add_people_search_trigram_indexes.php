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

        DB::statement('CREATE EXTENSION IF NOT EXISTS pg_trgm');
        DB::statement("CREATE INDEX people_full_name_trgm_idx ON people USING gin ((LOWER(COALESCE(first_name, '') || ' ' || COALESCE(middle_names, '') || ' ' || COALESCE(first_surname, '') || ' ' || COALESCE(second_surname, ''))) gin_trgm_ops) WHERE deleted_at IS NULL");
        DB::statement('CREATE INDEX people_identification_trgm_idx ON people USING gin (LOWER(identification) gin_trgm_ops) WHERE deleted_at IS NULL');
        DB::statement('CREATE INDEX users_username_trgm_idx ON users USING gin (LOWER(username) gin_trgm_ops) WHERE deleted_at IS NULL');
        DB::statement('CREATE INDEX users_email_trgm_idx ON users USING gin (LOWER(email) gin_trgm_ops) WHERE deleted_at IS NULL');
    }

    public function down(): void
    {
        if (DB::getDriverName() !== 'pgsql') {
            return;
        }

        DB::statement('DROP INDEX IF EXISTS people_full_name_trgm_idx');
        DB::statement('DROP INDEX IF EXISTS people_identification_trgm_idx');
        DB::statement('DROP INDEX IF EXISTS users_username_trgm_idx');
        DB::statement('DROP INDEX IF EXISTS users_email_trgm_idx');
    }
};
