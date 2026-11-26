<?php

namespace Tests\Feature;

use App\Domain\Access\Models\Role;
use App\Domain\Auth\Models\ActiveSession;
use App\Models\User;
use Database\Seeders\AccessControlSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class PeopleManagementTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->withHeader('Origin', 'http://localhost:5173');
        $this->seed(AccessControlSeeder::class);
    }

    public function test_administrator_can_create_person_and_get_generated_email(): void
    {
        $admin = $this->admin();
        $this->signIn($admin);

        $response = $this->postJson('/api/people', $this->validPerson());

        $response->assertCreated()
            ->assertJsonPath('data.first_name', 'Pablo')
            ->assertJsonPath('data.user.username', 'Pablo1234')
            ->assertJsonPath('data.user.email', 'priveras@mail.com');

        $this->assertDatabaseHas('people', ['identification' => '1122334455']);
        $this->assertDatabaseHas('audit_events', ['event_type' => 'people.created', 'result' => 'success']);
    }

    public function test_user_without_people_permission_cannot_open_management_api(): void
    {
        $member = User::factory()->create();
        $member->roles()->sync([Role::query()->where('slug', 'member')->value('id')]);
        $this->signIn($member);

        $this->getJson('/api/people')->assertForbidden();
    }

    public function test_dashboard_returns_database_security_summary_for_administrator_only(): void
    {
        $admin = $this->admin();
        $this->signIn($admin);

        $this->getJson('/api/dashboard')
            ->assertOk()
            ->assertJsonPath('data.accounts.total', 1)
            ->assertJsonPath('data.accounts.active', 1)
            ->assertJsonPath('data.active_sessions', 1)
            ->assertJsonPath('data.recent_events.0.event', 'auth.login');

        $admin->roles()->sync([Role::query()->where('slug', 'member')->value('id')]);

        $this->getJson('/api/dashboard')->assertForbidden();
    }

    public function test_administrator_can_search_and_filter_people_with_pagination(): void
    {
        $admin = $this->admin();
        $this->signIn($admin);
        $this->postJson('/api/people', $this->validPerson())->assertCreated();

        $this->getJson('/api/people?search=Pablo&status=active&sort=username&direction=desc&per_page=5')
            ->assertOk()
            ->assertJsonPath('meta.total', 1)
            ->assertJsonPath('data.0.identification', '1122334455');
    }

    public function test_generated_email_adds_a_suffix_for_repeated_names(): void
    {
        $admin = $this->admin();
        $this->signIn($admin);
        $first = $this->validPerson();
        $this->postJson('/api/people', $first)->assertCreated()
            ->assertJsonPath('data.user.email', 'priveras@mail.com');

        $second = [...$first, 'identification' => '2233445566', 'username' => 'Pablo5678'];
        $this->postJson('/api/people', $second)->assertCreated()
            ->assertJsonPath('data.user.email', 'priveras1@mail.com');
    }

    public function test_duplicate_username_is_rejected_without_case_sensitivity(): void
    {
        $admin = $this->admin();
        $this->signIn($admin);
        $this->postJson('/api/people', $this->validPerson())->assertCreated();
        $duplicate = [...$this->validPerson(), 'identification' => '2233445566', 'username' => 'pABLO1234'];

        $this->postJson('/api/people', $duplicate)
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['username']);
    }

    public function test_invalid_identification_and_username_are_rejected(): void
    {
        $admin = $this->admin();
        $this->signIn($admin);
        $invalid = [...$this->validPerson(), 'identification' => '1111222233', 'username' => 'pablo'];

        $this->postJson('/api/people', $invalid)
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['identification', 'username']);
    }

    public function test_administrator_can_update_status_and_audit_the_change(): void
    {
        $admin = $this->admin();
        $this->signIn($admin);
        $created = $this->postJson('/api/people', $this->validPerson())->assertCreated();
        $personId = $created->json('data.id');

        $this->patchJson("/api/people/{$personId}", ['status' => 'inactive'])
            ->assertOk()
            ->assertJsonPath('data.user.status', 'inactive');

        $this->assertDatabaseHas('audit_events', ['event_type' => 'people.updated', 'result' => 'success']);
    }

    public function test_administrator_can_unlock_an_account(): void
    {
        $admin = $this->admin();
        $locked = User::factory()->create(['failed_login_attempts' => 3, 'locked_at' => now()]);
        $this->signIn($admin);

        $this->postJson("/api/people/{$locked->person_id}/unlock")
            ->assertOk()
            ->assertJsonPath('data.user.locked_at', null);

        $this->assertSame(0, $locked->fresh()->failed_login_attempts);
        $this->assertDatabaseHas('audit_events', ['event_type' => 'users.unlocked', 'result' => 'success']);
    }

    public function test_changing_a_password_revokes_the_users_active_session(): void
    {
        $admin = $this->admin();
        $this->signIn($admin);
        $created = $this->postJson('/api/people', $this->validPerson())->assertCreated();
        $personId = $created->json('data.id');
        $userId = $created->json('data.user.id');
        ActiveSession::query()->create([
            'user_id' => $userId,
            'session_hash' => hash('sha256', 'old-session-id'),
            'expires_at' => now()->addHour(),
        ]);

        $this->patchJson("/api/people/{$personId}", ['password' => 'ChangedPass2026!'])->assertOk();

        $this->assertDatabaseMissing('active_sessions', ['user_id' => $userId]);
        $this->assertTrue(Hash::check('ChangedPass2026!', User::query()->findOrFail($userId)->password));
    }

    public function test_administrator_can_soft_delete_person_and_account(): void
    {
        $admin = $this->admin();
        $this->signIn($admin);
        $created = $this->postJson('/api/people', $this->validPerson())->assertCreated();
        $personId = $created->json('data.id');
        $userId = $created->json('data.user.id');

        $this->deleteJson("/api/people/{$personId}")->assertNoContent();

        $this->assertSoftDeleted('people', ['id' => $personId]);
        $this->assertSoftDeleted('users', ['id' => $userId]);
    }

    private function admin(): User
    {
        $admin = User::factory()->create();
        $admin->roles()->sync([Role::query()->where('slug', 'admin')->value('id')]);

        return $admin;
    }

    private function signIn(User $user): void
    {
        $response = $this->postJson('/api/login', [
            'login' => $user->username,
            'password' => 'Password1!',
        ])->assertOk();

        $sessionCookie = $response->getCookie(config('session.cookie'));
        $this->assertNotNull($sessionCookie);
        $this->withCredentials()->withCookie(config('session.cookie'), $sessionCookie->getValue());
    }

    private function validPerson(): array
    {
        return [
            'first_name' => 'Pablo',
            'middle_names' => 'Andrés',
            'first_surname' => 'Rivera',
            'second_surname' => 'Soto',
            'identification' => '1122334455',
            'birth_date' => '1995-05-20',
            'username' => 'Pablo1234',
            'password' => 'StrongPass123!',
            'role' => 'member',
            'status' => 'active',
        ];
    }
}
