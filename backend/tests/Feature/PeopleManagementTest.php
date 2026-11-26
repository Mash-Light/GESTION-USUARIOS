<?php

namespace Tests\Feature;

use App\Domain\Access\Models\Role;
use App\Domain\Auth\Models\ActiveSession;
use App\Models\User;
use Database\Seeders\AccessControlSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Hash;
use PhpOffice\PhpSpreadsheet\Shared\Date as ExcelDate;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
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
            ->assertJsonPath('data.recent_events.0.event', 'auth.login')
            ->assertJsonPath('data.activity_by_day.6.successful', 1)
            ->assertJsonPath('data.recent_users.0.id', $admin->id);

        $admin->roles()->sync([Role::query()->where('slug', 'member')->value('id')]);

        $this->getJson('/api/dashboard')->assertForbidden();
    }

    public function test_administrator_can_import_csv_rows_and_repeated_upload_is_idempotent(): void
    {
        $admin = $this->admin();
        $this->signIn($admin);
        $contents = implode("\n", [
            'first_name,middle_names,first_surname,second_surname,identification,birth_date,username,password,status',
            'Lucía,,Vega,Luna,1234567890,1990-05-10,Lucia1234,StrongPass123!,active',
            'Mateo,,Paz,Rey,1234567890,1992-02-11,Mateo1234,StrongPass123!,active',
        ]);
        $file = UploadedFile::fake()->createWithContent('people.csv', $contents);

        $response = $this->post('/api/imports', ['file' => $file], ['Accept' => 'application/json'])
            ->assertCreated()
            ->assertJsonPath('data.status', 'partial')
            ->assertJsonPath('data.total_rows', 2)
            ->assertJsonPath('data.success_rows', 1)
            ->assertJsonPath('data.error_rows', 1)
            ->assertJsonPath('data.rows.1.status', 'failed')
            ->assertJsonMissingPath('data.rows.0.identification')
            ->assertJsonMissingPath('data.rows.0.user_id');

        $this->assertDatabaseHas('people', ['identification' => '1234567890']);
        $this->assertTrue(Hash::check('StrongPass123!', User::query()->where('username', 'Lucia1234')->value('password')));
        $this->assertDatabaseHas('import_batches', [
            'id' => $response->json('data.id'),
            'created_by' => $admin->id,
            'status' => 'partial',
        ]);
        $this->assertDatabaseHas('audit_events', ['event_type' => 'imports.completed', 'result' => 'success']);

        $this->post('/api/imports', ['file' => UploadedFile::fake()->createWithContent('people.csv', $contents)], ['Accept' => 'application/json'])
            ->assertStatus(409)
            ->assertJsonPath('data.id', $response->json('data.id'));
    }

    public function test_user_without_import_permission_cannot_submit_a_file(): void
    {
        $member = User::factory()->create();
        $member->roles()->sync([Role::query()->where('slug', 'member')->value('id')]);
        $this->signIn($member);

        $this->post('/api/imports', [
            'file' => UploadedFile::fake()->createWithContent('people.csv', 'first_name'),
        ], ['Accept' => 'application/json'])->assertForbidden();
    }

    public function test_csv_import_rejects_passwords_with_whitespace(): void
    {
        $admin = $this->admin();
        $this->signIn($admin);
        $contents = implode("\n", [
            'first_name,middle_names,first_surname,second_surname,identification,birth_date,username,password,status',
            'Lucía,,Vega,Luna,1234567890,1990-05-10,Lucia1234,Strong Pass123!,active',
        ]);

        $this->post('/api/imports', [
            'file' => UploadedFile::fake()->createWithContent('people.csv', $contents),
        ], ['Accept' => 'application/json'])
            ->assertCreated()
            ->assertJsonPath('data.success_rows', 0)
            ->assertJsonPath('data.error_rows', 1)
            ->assertJsonPath('data.rows.0.status', 'failed');

        $this->assertDatabaseMissing('users', ['username' => 'Lucia1234']);
    }

    public function test_administrator_can_import_xlsx_with_excel_date_cells(): void
    {
        $admin = $this->admin();
        $this->signIn($admin);
        $temporaryPath = tempnam(sys_get_temp_dir(), 'people-import-');
        $spreadsheet = new Spreadsheet;
        $sheet = $spreadsheet->getActiveSheet();
        $sheet->fromArray([[
            'first_name', 'middle_names', 'first_surname', 'second_surname', 'identification',
            'birth_date', 'username', 'password', 'status',
        ], [
            'Elena', '', 'Sol', 'Ríos', '1234567889', '1991-04-12', 'Elena1234', 'StrongPass123!', 'active',
        ]]);
        $sheet->setCellValue('F2', ExcelDate::PHPToExcel(new \DateTimeImmutable('1991-04-12')));
        $sheet->getStyle('F2')->getNumberFormat()->setFormatCode('yyyy-mm-dd');
        (new Xlsx($spreadsheet))->save($temporaryPath);
        $spreadsheet->disconnectWorksheets();

        try {
            $file = new UploadedFile(
                $temporaryPath,
                'people.xlsx',
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                null,
                true,
            );

            $this->post('/api/imports', ['file' => $file], ['Accept' => 'application/json'])
                ->assertCreated()
                ->assertJsonPath('data.success_rows', 1)
                ->assertJsonPath('data.rows.0.status', 'imported');
            $this->assertDatabaseHas('people', ['identification' => '1234567889', 'birth_date' => '1991-04-12']);
        } finally {
            @unlink($temporaryPath);
        }
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
        $locked->roles()->sync([Role::query()->where('slug', 'member')->value('id')]);
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

    public function test_administrator_cannot_create_privileged_account_or_change_another_administrator(): void
    {
        $admin = $this->admin();
        $this->signIn($admin);

        $this->postJson('/api/people', [...$this->validPerson(), 'role' => 'admin'])
            ->assertUnprocessable()->assertJsonValidationErrors(['role']);

        $otherAdmin = $this->admin();
        $otherAdmin->roles()->sync(Role::query()->whereIn('slug', ['admin', 'member'])->pluck('id'));
        $personId = $otherAdmin->person_id;
        $this->patchJson("/api/people/{$personId}", ['status' => 'inactive'])->assertForbidden();
        $this->deleteJson("/api/people/{$personId}")->assertForbidden();
        $this->postJson("/api/people/{$personId}/unlock")->assertForbidden();
        $this->assertSame('active', $otherAdmin->fresh()->status);
    }

    public function test_member_can_update_only_their_own_profile_and_welcome_data_is_returned(): void
    {
        $member = User::factory()->create();
        $member->roles()->sync([Role::query()->where('slug', 'member')->value('id')]);
        $this->signIn($member);

        $this->getJson('/api/user')->assertOk()
            ->assertJsonPath('data.user.profile.identification', $member->person->identification)
            ->assertJsonPath('data.user.failed_login_attempts', 0);

        $this->patchJson('/api/profile', ['first_name' => 'Lucía', 'birth_date' => '1998-03-02'])
            ->assertOk()->assertJsonPath('data.user.profile.first_name', 'Lucía')
            ->assertJsonPath('data.user.profile.birth_date', '1998-03-02');
        $this->assertDatabaseHas('audit_events', ['event_type' => 'profile.updated', 'result' => 'success']);

        $this->patchJson('/api/profile', ['status' => 'inactive', 'role' => 'admin'])
            ->assertUnprocessable()->assertJsonValidationErrors(['status', 'role']);
        $this->assertSame('active', $member->fresh()->status);
        $this->assertSame('member', $member->fresh()->roles()->value('slug'));
    }

    public function test_account_password_rejects_whitespace(): void
    {
        $admin = $this->admin();
        $this->signIn($admin);

        $this->postJson('/api/people', [...$this->validPerson(), 'password' => 'Strong Pass123!'])
            ->assertUnprocessable()->assertJsonValidationErrors(['password']);
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
