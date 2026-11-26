<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use PDO;
use Tests\TestCase;

class PostgresConcurrencyTest extends TestCase
{
    use RefreshDatabase;

    public function test_unique_username_constraint_rejects_a_concurrent_duplicate(): void
    {
        [$first, $pgSecond] = $this->connections();
        $salt = bin2hex(random_bytes(4));
        $username = 'Race'.strtoupper($salt).'1';
        $emailOne = "race-one-{$salt}@test.local";
        $emailTwo = "race-two-{$salt}@test.local";
        $personOne = $this->createPerson($first, $salt.'1');
        $personTwo = $this->createPerson($first, $salt.'2');
        $insertUser = $first->prepare('INSERT INTO users (person_id, username, email, password, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, NOW(), NOW())');

        try {
            $first->beginTransaction();
            $insertUser->execute([$personOne, $username, $emailOne, password_hash('StrongPass123!', PASSWORD_BCRYPT, ['cost' => 4]), 'active']);

            $sent = pg_send_query_params(
                $pgSecond,
                'INSERT INTO users (person_id, username, email, password, status, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, NOW(), NOW())',
                [$personTwo, $username, $emailTwo, password_hash('StrongPass123!', PASSWORD_BCRYPT, ['cost' => 4]), 'active'],
            );
            $this->assertTrue($sent);

            $first->commit();
            $result = pg_get_result($pgSecond);

            $this->assertNotFalse($result);
            $this->assertSame('23505', pg_result_error_field($result, PGSQL_DIAG_SQLSTATE));
        } finally {
            if ($first->inTransaction()) {
                $first->rollBack();
            }
            $first->prepare('DELETE FROM users WHERE username = ?')->execute([$username]);
            $first->prepare('DELETE FROM people WHERE id IN (?, ?)')->execute([$personOne, $personTwo]);
            pg_close($pgSecond);
        }
    }

    public function test_generated_email_advisory_lock_is_exclusive_until_transaction_commits(): void
    {
        [$first, $pgSecond] = $this->connections();
        $key = 'generated-email:concurrency-test-'.bin2hex(random_bytes(8));

        try {
            $first->beginTransaction();
            $first->prepare('SELECT pg_advisory_xact_lock(hashtextextended(?, 0))')->execute([$key]);

            $blocked = pg_query_params($pgSecond, 'SELECT pg_try_advisory_xact_lock(hashtextextended($1, 0)) AS acquired', [$key]);
            $this->assertNotFalse($blocked);
            $this->assertSame('f', pg_fetch_result($blocked, 0, 'acquired'));

            $first->commit();
            $released = pg_query_params($pgSecond, 'SELECT pg_try_advisory_xact_lock(hashtextextended($1, 0)) AS acquired', [$key]);
            $this->assertNotFalse($released);
            $this->assertSame('t', pg_fetch_result($released, 0, 'acquired'));
        } finally {
            if ($first->inTransaction()) {
                $first->rollBack();
            }
            pg_close($pgSecond);
        }
    }

    public function test_parallel_login_waits_for_the_first_locked_attempt_and_observes_its_session(): void
    {
        [$first, $pgSecond] = $this->connections();
        $salt = bin2hex(random_bytes(5));
        $personId = $this->createPerson($first, 'login'.$salt);
        $username = 'Login'.strtoupper($salt);
        $sessionHash = hash('sha256', 'concurrent-session-'.$salt);
        $createUser = $first->prepare('INSERT INTO users (person_id, username, email, password, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, NOW(), NOW()) RETURNING id');
        $createUser->execute([$personId, $username, $salt.'@test.local', 'hash', 'active']);
        $userId = (int) $createUser->fetchColumn();

        try {
            $first->beginTransaction();
            $first->prepare('SELECT id FROM users WHERE id = ? FOR UPDATE')->execute([$userId]);

            $this->assertSame(0, (int) $first->query('SELECT COUNT(*) FROM active_sessions WHERE user_id = '.$userId)->fetchColumn());
            $sent = pg_send_query_params($pgSecond, 'SELECT id FROM users WHERE id = $1 FOR UPDATE', [$userId]);
            $this->assertTrue($sent);

            $first->prepare('INSERT INTO active_sessions (user_id, session_hash, expires_at, created_at, updated_at) VALUES (?, ?, NOW() + INTERVAL \'2 hours\', NOW(), NOW())')
                ->execute([$userId, $sessionHash]);
            $first->commit();

            $lockResult = pg_get_result($pgSecond);
            $this->assertNotFalse($lockResult);
            $this->assertSame((string) $userId, pg_fetch_result($lockResult, 0, 'id'));

            $visibleSession = pg_query_params(
                $pgSecond,
                'SELECT EXISTS (SELECT 1 FROM active_sessions WHERE user_id = $1 AND expires_at > NOW()) AS active',
                [$userId],
            );
            $this->assertNotFalse($visibleSession);
            $this->assertSame('t', pg_fetch_result($visibleSession, 0, 'active'));
        } finally {
            if ($first->inTransaction()) {
                $first->rollBack();
            }
            $first->prepare('DELETE FROM active_sessions WHERE user_id = ?')->execute([$userId]);
            $first->prepare('DELETE FROM users WHERE id = ?')->execute([$userId]);
            $first->prepare('DELETE FROM people WHERE id = ?')->execute([$personId]);
            pg_close($pgSecond);
        }
    }

    /** @return array{PDO, resource} */
    private function connections(): array
    {
        $config = config('database.connections.pgsql');
        $dsn = sprintf('pgsql:host=%s;port=%d;dbname=%s', $config['host'], $config['port'], $config['database']);
        $first = new PDO($dsn, $config['username'], $config['password'], [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);
        $connectionString = collect([
            'host' => $config['host'],
            'port' => $config['port'],
            'dbname' => $config['database'],
            'user' => $config['username'],
            'password' => $config['password'],
        ])->map(fn ($value): string => "'".str_replace(['\\', "'"], ['\\\\', "\\'"], (string) $value)."'")
            ->map(fn (string $value, string $key): string => "{$key}={$value}")
            ->implode(' ');
        $second = pg_connect($connectionString, PGSQL_CONNECT_FORCE_NEW);

        $this->assertNotFalse($second);

        return [$first, $second];
    }

    private function createPerson(PDO $connection, string $suffix): int
    {
        $identification = $this->validIdentification();
        $statement = $connection->prepare('INSERT INTO people (first_name, first_surname, second_surname, identification, created_at, updated_at) VALUES (?, ?, ?, ?, NOW(), NOW()) RETURNING id');
        $statement->execute(['Concurrent', 'Test', $suffix, $identification]);

        return (int) $statement->fetchColumn();
    }

    private function validIdentification(): string
    {
        do {
            $identification = collect(range(1, 5))
                ->map(fn (): string => (string) random_int(1, 9))
                ->implode('');
            $identification = implode('', array_map(fn (string $digit): string => $digit.$digit, str_split($identification)));
        } while (preg_match('/([0-9])\1{3}/', $identification) === 1);

        return $identification;
    }
}
