<?php

namespace Tests\Feature;

use App\Models\Role;
use App\Models\Setting;
use App\Models\User;
use App\Services\SmtpConfiguration;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

class AdminSmtpSettingsTest extends TestCase
{
    use RefreshDatabase;

    public function test_only_master_admin_can_save_smtp_and_password_is_never_returned(): void
    {
        $role = Role::create(['slug' => 'super-admin', 'name' => 'Super Admin']);
        $master = User::factory()->create(['user_type' => 'admin']);
        $master->roles()->attach($role);
        $staff = User::factory()->create(['user_type' => 'admin']);

        $payload = [
            'enabled' => true,
            'host' => '127.0.0.1',
            'port' => 587,
            'scheme' => 'smtp',
            'username' => 'mailer@example.com',
            'password' => 'smtp-secret-123',
            'from_address' => 'info@hiresafe.ng',
            'from_name' => 'Hire Safe',
        ];

        $this->actingAs($staff, 'sanctum')->getJson('/api/admin/settings/smtp')->assertForbidden();
        $this->putJson('/api/admin/settings/smtp', $payload)->assertForbidden();
        $this->actingAs($master, 'sanctum')->putJson('/api/admin/settings/smtp', $payload)
            ->assertOk()->assertJsonPath('data.password_set', true)->assertDontSee('smtp-secret-123');

        $stored = Setting::where('key', 'mail_smtp_password')->firstOrFail()->value;
        $this->assertNotSame('smtp-secret-123', $stored);
        $this->assertSame('smtp-secret-123', Crypt::decryptString($stored));
        $this->putJson('/api/admin/settings/smtp', collect($payload)->except('password')->all())->assertOk();
        $this->assertSame($stored, Setting::where('key', 'mail_smtp_password')->firstOrFail()->value);

        $this->getJson('/api/admin/settings/smtp')->assertOk()->assertDontSee($stored);
        $this->getJson('/api/admin/settings')->assertOk()->assertDontSee('mail_smtp_password');
        $this->putJson('/api/admin/settings', ['settings' => [
            ['key' => 'mail_smtp_password', 'value' => 'bad'],
        ]])->assertUnprocessable();

        app(SmtpConfiguration::class)->apply();
        Mail::mailer();
        $this->assertSame('smtp', config('mail.default'));
        $this->assertSame('127.0.0.1', config('mail.mailers.smtp.host'));
    }

    public function test_master_admin_role_is_available_immediately_after_login(): void
    {
        $role = Role::create(['slug' => 'super-admin', 'name' => 'Super Admin']);
        $master = User::factory()->create(['user_type' => 'admin', 'password' => 'strong-password-123']);
        $master->roles()->attach($role);

        $this->postJson('/api/auth/login', [
            'login' => $master->email,
            'password' => 'strong-password-123',
        ])->assertOk()->assertJsonPath('user.roles.0', 'super-admin');
    }
}
