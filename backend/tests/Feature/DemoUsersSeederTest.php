<?php

namespace Tests\Feature;

use App\Domain\Auth\Models\ActiveSession;
use App\Models\User;
use Database\Seeders\AccessControlSeeder;
use Database\Seeders\DemoUsersSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class DemoUsersSeederTest extends TestCase
{
    use RefreshDatabase;

    public function test_reseeding_demo_accounts_revokes_previous_sessions(): void
    {
        $this->seed(AccessControlSeeder::class);
        $this->seed(DemoUsersSeeder::class);

        $user = User::query()->where('username', 'Admin001')->firstOrFail();
        ActiveSession::query()->create([
            'user_id' => $user->id,
            'session_hash' => hash('sha256', 'seeded-demo-session'),
            'expires_at' => now()->addHour(),
        ]);
        DB::table('sessions')->insert([
            'id' => 'seeded-demo-session',
            'user_id' => $user->id,
            'ip_address' => '127.0.0.1',
            'user_agent' => 'test',
            'payload' => 'session-payload',
            'last_activity' => now()->timestamp,
        ]);

        $this->seed(DemoUsersSeeder::class);

        $this->assertDatabaseMissing('active_sessions', ['user_id' => $user->id]);
        $this->assertDatabaseMissing('sessions', ['user_id' => $user->id]);
        $this->assertTrue(User::query()->whereKey($user->id)->exists());
    }
}
