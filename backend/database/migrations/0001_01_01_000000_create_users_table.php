<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('people', function (Blueprint $table) {
            $table->id();
            $table->string('first_name', 60);
            $table->string('middle_names', 120)->nullable();
            $table->string('first_surname', 60);
            $table->string('second_surname', 60);
            $table->char('identification', 10)->unique();
            $table->date('birth_date')->nullable();
            $table->timestamps();
            $table->softDeletes();
        });

        Schema::create('users', function (Blueprint $table) {
            $table->id();
            $table->foreignId('person_id')->unique()->constrained('people')->restrictOnDelete();
            $table->string('username', 20)->unique();
            $table->string('email', 254)->unique();
            $table->string('password');
            $table->string('status', 20)->default('active');
            $table->unsignedTinyInteger('failed_login_attempts')->default(0);
            $table->timestamp('locked_at')->nullable();
            $table->timestamp('last_login_at')->nullable();
            $table->timestamp('password_changed_at')->nullable();
            $table->rememberToken();
            $table->timestamps();
            $table->softDeletes();
        });

        if (DB::getDriverName() === 'pgsql') {
            DB::unprepared(<<<'SQL'
                ALTER TABLE people
                    ADD CONSTRAINT people_identification_digits_check
                    CHECK (
                        identification ~ '^[0-9]{10}$'
                        AND identification !~ '([0-9])\1{3}'
                    )
                SQL);

            DB::unprepared(<<<'SQL'
                ALTER TABLE users
                    ADD CONSTRAINT users_username_format_check
                    CHECK (
                        username ~ '^[A-Za-z0-9]{8,20}$'
                        AND username ~ '[A-Z]'
                        AND username ~ '[0-9]'
                    ),
                    ADD CONSTRAINT users_status_check
                    CHECK (status IN ('active', 'inactive')),
                    ADD CONSTRAINT users_failed_login_attempts_check
                    CHECK (failed_login_attempts BETWEEN 0 AND 3)
                SQL);

            DB::statement('CREATE UNIQUE INDEX users_email_case_insensitive_unique ON users (LOWER(email))');
            DB::statement('CREATE UNIQUE INDEX users_username_case_insensitive_unique ON users (LOWER(username))');
        }

        Schema::create('password_reset_tokens', function (Blueprint $table) {
            $table->string('email')->primary();
            $table->string('token');
            $table->timestamp('created_at')->nullable();
        });

        Schema::create('sessions', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->foreignId('user_id')->nullable()->index();
            $table->string('ip_address', 45)->nullable();
            $table->text('user_agent')->nullable();
            $table->longText('payload');
            $table->integer('last_activity')->index();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (DB::getDriverName() === 'pgsql') {
            DB::statement('DROP INDEX IF EXISTS users_email_case_insensitive_unique');
            DB::statement('DROP INDEX IF EXISTS users_username_case_insensitive_unique');
        }

        Schema::dropIfExists('users');
        Schema::dropIfExists('people');
        Schema::dropIfExists('password_reset_tokens');
        Schema::dropIfExists('sessions');
    }
};
