<?php

namespace Tests\Feature;

use App\Domain\Auth\Models\ActiveSession;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class AuthenticationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->withHeader('Origin', 'http://localhost:5173');
    }

    public function test_user_can_sign_in_with_case_insensitive_username(): void
    {
        $user = User::factory()->create(['username' => 'Admin123']);

        $response = $this->postJson('/api/login', [
            'login' => 'admin123',
            'password' => 'Password1!',
        ]);

        $response->assertOk()
            ->assertJsonPath('data.user.username', $user->username);
        $this->assertDatabaseHas('active_sessions', ['user_id' => $user->id]);
        $this->assertNotNull($user->fresh()->last_login_at);
    }

    public function test_third_incorrect_password_locks_the_account(): void
    {
        $user = User::factory()->create();

        foreach ([401, 401, 423] as $status) {
            $this->postJson('/api/login', [
                'login' => $user->username,
                'password' => 'incorrect',
            ])->assertStatus($status);
        }

        $this->assertSame(3, $user->fresh()->failed_login_attempts);
        $this->assertNotNull($user->fresh()->locked_at);
    }

    public function test_a_second_active_session_is_rejected(): void
    {
        $user = User::factory()->create();

        $this->postJson('/api/login', [
            'login' => $user->username,
            'password' => 'Password1!',
        ])->assertOk();

        $this->postJson('/api/login', [
            'login' => $user->username,
            'password' => 'Password1!',
        ])->assertStatus(409);

        $this->assertSame(1, ActiveSession::query()->where('user_id', $user->id)->count());
    }

    public function test_an_expired_active_session_is_rejected_by_protected_endpoints(): void
    {
        $user = User::factory()->create();
        $login = $this->postJson('/api/login', [
            'login' => $user->username,
            'password' => 'Password1!',
        ])->assertOk();

        $sessionCookie = $login->getCookie(config('session.cookie'));
        $this->assertNotNull($sessionCookie);
        DB::table('active_sessions')->where('user_id', $user->id)->update([
            'expires_at' => now()->subSecond(),
        ]);

        $this->withCredentials()->withCookie(config('session.cookie'), $sessionCookie->getValue())
            ->getJson('/api/user')
            ->assertUnauthorized()
            ->assertJsonPath('message', 'La sesión venció. Inicia sesión de nuevo.');

        $this->assertDatabaseHas('audit_events', [
            'event_type' => 'auth.session_rejected',
            'subject_user_id' => $user->id,
            'result' => 'failed',
        ]);
    }

    public function test_authenticated_activity_extends_the_active_session_expiration(): void
    {
        $user = User::factory()->create();
        $login = $this->postJson('/api/login', [
            'login' => $user->username,
            'password' => 'Password1!',
        ])->assertOk();

        $sessionCookie = $login->getCookie(config('session.cookie'));
        $this->assertNotNull($sessionCookie);
        $initialExpiration = ActiveSession::query()->where('user_id', $user->id)->value('expires_at');

        $this->travel(90)->minutes();
        $this->withCredentials()->withCookie(config('session.cookie'), $sessionCookie->getValue())
            ->getJson('/api/user')
            ->assertOk()
            ->assertJsonPath('data.user.id', $user->id);

        $updatedExpiration = ActiveSession::query()->where('user_id', $user->id)->value('expires_at');
        $this->assertNotSame($initialExpiration, $updatedExpiration);
        $this->assertTrue(now()->parse($updatedExpiration)->isAfter(now()->addMinutes(119)));
    }

    public function test_inactive_account_cannot_sign_in(): void
    {
        $user = User::factory()->create(['status' => 'inactive']);

        $this->postJson('/api/login', [
            'login' => $user->username,
            'password' => 'Password1!',
        ])->assertForbidden();

        $this->assertDatabaseMissing('active_sessions', ['user_id' => $user->id]);
    }
}
