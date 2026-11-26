<?php

namespace Tests\Feature;

use App\Domain\People\Models\Person;
use App\Models\User;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class DatabaseConstraintsTest extends TestCase
{
    use RefreshDatabase;

    public function test_postgresql_rejects_usernames_that_only_differ_by_case(): void
    {
        $this->assertSame('pgsql', DB::getDriverName());
        User::factory()->create(['username' => 'CaseUser1', 'email' => 'first@example.test']);

        $this->expectException(QueryException::class);
        User::factory()->create(['username' => 'CASEUSER1', 'email' => 'second@example.test']);
    }

    public function test_postgresql_rejects_emails_that_only_differ_by_case(): void
    {
        $this->assertSame('pgsql', DB::getDriverName());
        User::factory()->create(['username' => 'FirstUser1', 'email' => 'person@example.test']);

        $this->expectException(QueryException::class);
        User::factory()->create(['username' => 'SecondUser1', 'email' => 'PERSON@example.test']);
    }

    public function test_postgresql_rejects_identification_with_four_repeated_digits(): void
    {
        $this->assertSame('pgsql', DB::getDriverName());

        $this->expectException(QueryException::class);
        Person::factory()->create(['identification' => '1111222233']);
    }
}
