<?php

namespace Tests\Feature;

use App\Domain\Auth\Models\ActiveSession;
use App\Models\User;
use Illuminate\Auth\Notifications\ResetPassword as ResetPasswordNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Password;
use Tests\TestCase;

class PasswordResetTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->withHeader('Origin', 'http://localhost:5173');
    }

    public function test_forgot_password_response_does_not_reveal_whether_the_account_exists(): void
    {
        $user = User::factory()->create();
        $message = 'Si los datos corresponden a una cuenta, recibirás instrucciones para continuar.';

        $known = $this->postJson('/api/forgot-password', ['email' => strtoupper($user->email)])
            ->assertOk()
            ->assertJsonPath('message', $message);
        $unknown = $this->postJson('/api/forgot-password', ['email' => 'missing@example.test'])
            ->assertOk()
            ->assertJsonPath('message', $message);

        $this->assertSame($known->json('message'), $unknown->json('message'));
        $this->assertDatabaseHas('password_reset_tokens', ['email' => $user->email]);

        $notification = (new ResetPasswordNotification('test-reset-token'))->toMail($user);
        $this->assertStringStartsWith('http://127.0.0.1:5174/reset-password?', $notification->actionUrl);
        parse_str((string) parse_url($notification->actionUrl, PHP_URL_QUERY), $query);
        $this->assertSame('test-reset-token', $query['token']);
        $this->assertSame($user->email, $query['email']);
    }

    public function test_reset_clears_lock_and_revokes_all_previous_sessions(): void
    {
        $user = User::factory()->create([
            'failed_login_attempts' => 3,
            'locked_at' => now(),
            'last_login_at' => now()->subDay(),
        ]);
        ActiveSession::query()->create([
            'user_id' => $user->id,
            'session_hash' => hash('sha256', 'old-reset-session'),
            'expires_at' => now()->addHour(),
        ]);
        DB::table('sessions')->insert([
            'id' => 'old-reset-session',
            'user_id' => $user->id,
            'ip_address' => '127.0.0.1',
            'user_agent' => 'test',
            'payload' => 'session-payload',
            'last_activity' => now()->timestamp,
        ]);
        $token = Password::createToken($user);
        $storedToken = DB::table('password_reset_tokens')->where('email', $user->email)->value('token');
        $this->assertNotSame($token, $storedToken);
        $this->assertTrue(Hash::check($token, $storedToken));

        $credentials = [
            'email' => $user->email,
            'token' => $token,
            'password' => 'NewStrongPass2026!',
            'password_confirmation' => 'NewStrongPass2026!',
        ];
        $this->postJson('/api/reset-password', $credentials)->assertOk();

        $user->refresh();
        $this->assertTrue(Hash::check('NewStrongPass2026!', $user->password));
        $this->assertSame(0, $user->failed_login_attempts);
        $this->assertNull($user->locked_at);
        $this->assertDatabaseMissing('active_sessions', ['user_id' => $user->id]);
        $this->assertDatabaseMissing('sessions', ['user_id' => $user->id]);
        $this->assertDatabaseMissing('password_reset_tokens', ['email' => $user->email]);
        $this->assertDatabaseHas('audit_events', ['event_type' => 'auth.password_reset', 'result' => 'success']);

        $this->postJson('/api/reset-password', $credentials)
            ->assertUnprocessable()
            ->assertJsonPath('message', 'El enlace no es válido o ya venció. Solicita otro.');
        $this->assertTrue(Hash::check('NewStrongPass2026!', $user->fresh()->password));

        $this->postJson('/api/login', [
            'login' => $user->username,
            'password' => 'NewStrongPass2026!',
        ])->assertOk();
    }

    public function test_reset_rejects_invalid_and_expired_tokens(): void
    {
        $user = User::factory()->create();
        $token = Password::createToken($user);
        $originalPasswordHash = $user->password;

        $this->postJson('/api/reset-password', [
            'email' => $user->email,
            'token' => 'not-the-issued-token',
            'password' => 'NewStrongPass2026!',
            'password_confirmation' => 'NewStrongPass2026!',
        ])->assertUnprocessable()
            ->assertJsonPath('message', 'El enlace no es válido o ya venció. Solicita otro.');

        $this->travel(61)->minutes();
        $this->postJson('/api/reset-password', [
            'email' => $user->email,
            'token' => $token,
            'password' => 'NewStrongPass2026!',
            'password_confirmation' => 'NewStrongPass2026!',
        ])->assertUnprocessable()
            ->assertJsonPath('message', 'El enlace no es válido o ya venció. Solicita otro.');
        $this->travelBack();

        $this->assertSame($originalPasswordHash, $user->fresh()->password);
    }
}
