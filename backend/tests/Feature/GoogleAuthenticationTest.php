<?php

namespace Tests\Feature;

use App\Models\Setting;
use App\Models\User;
use App\Services\GoogleAccountService;
use App\Services\GoogleOAuthConfiguration;
use GuzzleHttp\Client;
use GuzzleHttp\Handler\MockHandler;
use GuzzleHttp\HandlerStack;
use GuzzleHttp\Psr7\Response;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Validation\ValidationException;
use Laravel\Socialite\Facades\Socialite;
use Laravel\Socialite\Two\GoogleProvider;
use Laravel\Socialite\Two\User as GoogleUser;
use Symfony\Component\HttpKernel\Exception\HttpException;
use Tests\MakesUsers;
use Tests\TestCase;

class GoogleAuthenticationTest extends TestCase
{
    use MakesUsers,RefreshDatabase;

    private function configure(): void
    {
        app(GoogleOAuthConfiguration::class)->save(['enabled' => true, 'client_id' => 'example.apps.googleusercontent.com', 'client_secret' => 'private-google-secret', 'frontend_url' => 'http://localhost:5174']);
    }

    private function profile(string $email = 'person@gmail.com', string $id = 'google-person', array $extra = []): GoogleUser
    {
        $raw = array_merge(['sub' => $id, 'email' => $email, 'email_verified' => true, 'given_name' => 'Ada', 'family_name' => 'Obi'], $extra);

        return (new GoogleUser)->setRaw($raw)->map(['id' => $id, 'email' => $email, 'name' => 'Ada Obi']);
    }

    private function mockProvider(array $profile): void
    {
        Socialite::shouldReceive('buildProvider')->andReturnUsing(function ($class, $settings) use ($profile) {
            $handler = new MockHandler([new Response(200, [], json_encode(['access_token' => 'test-access-token', 'expires_in' => 3600])), new Response(200, [], json_encode($profile))]);

            return (new GoogleProvider(app('request'), $settings['client_id'], $settings['client_secret'], $settings['redirect']))->setHttpClient(new Client(['handler' => HandlerStack::create($handler)]));
        });
    }

    public function test_master_admin_can_save_masked_encrypted_configuration_and_keep_secret(): void
    {
        $this->actingAs($this->makeAdmin('super-admin'), 'sanctum')->putJson('/api/admin/settings/google', ['enabled' => true, 'client_id' => 'example.apps.googleusercontent.com', 'client_secret' => 'private-google-secret', 'frontend_url' => 'http://localhost:5174'])->assertOk()->assertJsonPath('data.client_secret_set', true)->assertJsonMissing(['client_secret' => 'private-google-secret']);
        $stored = Setting::getValue('google_oauth_client_secret');
        $this->assertNotEquals('private-google-secret', $stored);
        $this->assertEquals('private-google-secret', Crypt::decryptString($stored));
        $this->getJson('/api/admin/settings')->assertOk()->assertJsonMissing(['key' => 'google_oauth_client_secret']);
        $this->putJson('/api/admin/settings', ['settings' => [['key' => 'google_oauth_client_secret', 'value' => 'exposed']]])->assertUnprocessable();
        $this->putJson('/api/admin/settings/google', ['enabled' => true, 'client_id' => 'example.apps.googleusercontent.com', 'frontend_url' => 'http://localhost:5174'])->assertOk();
        $this->assertEquals($stored, Setting::getValue('google_oauth_client_secret'));
        $this->getJson('/api/auth/google/status')->assertExactJson(['enabled' => true]);
    }

    public function test_non_master_admin_cannot_access_credentials_and_enabling_requires_complete_config(): void
    {
        $this->actingAs($this->makeAdmin(), 'sanctum')->getJson('/api/admin/settings/google')->assertForbidden();
        $this->putJson('/api/admin/settings/google', ['enabled' => false])->assertForbidden();
        $this->actingAs($this->makeAdmin('super-admin'), 'sanctum')->putJson('/api/admin/settings/google', ['enabled' => true, 'client_id' => 'example.apps.googleusercontent.com', 'frontend_url' => 'http://localhost:5174'])->assertUnprocessable();
        $this->getJson('/api/auth/google/status')->assertExactJson(['enabled' => false]);
    }

    public function test_start_uses_state_and_pkce_and_rejects_privileged_registration(): void
    {
        $this->configure();
        $response = $this->get('/api/auth/google/redirect?'.http_build_query(['intent' => 'register', 'user_type' => 'helper', 'terms' => '1', 'challenge' => str_repeat('a', 64)]))->assertRedirect();
        $query = [];
        parse_str(parse_url($response->headers->get('Location'), PHP_URL_QUERY), $query);
        $this->assertNotEmpty($query['state']);
        $this->assertNotEmpty($query['code_challenge']);
        $this->assertEquals('S256', $query['code_challenge_method']);
        $this->assertEquals('http://localhost:5174/api/auth/google/callback', $query['redirect_uri']);
        $this->getJson('/api/auth/google/redirect?'.http_build_query(['intent' => 'register', 'user_type' => 'admin', 'terms' => '1', 'challenge' => str_repeat('a', 64)]))->assertUnprocessable();
    }

    public function test_callback_registers_verified_helper_and_exchanges_one_time_code_bound_to_browser(): void
    {
        $this->configure();
        $this->mockProvider(['sub' => 'google-person', 'email' => 'person@gmail.com', 'email_verified' => true, 'given_name' => 'Ada', 'family_name' => 'Obi']);
        $verifier = str_repeat('v', 64);
        $response = $this->withSession(['state' => 'oauth-state', 'code_verifier' => 'pkce-value', 'google_login' => ['intent' => 'register', 'user_type' => 'helper', 'challenge' => hash('sha256', $verifier), 'created_at' => time()]])->get('/api/auth/google/callback?state=oauth-state&code=google-code')->assertRedirect();
        $location = $response->headers->get('Location');
        $this->assertStringStartsWith('http://localhost:5174/auth/google/callback#code=', $location);
        $code = substr($location, strpos($location, '#code=') + 6);
        $user = User::where('google_id', 'google-person')->firstOrFail();
        $this->assertEquals('draft', $user->approval_status);
        $this->assertNotNull($user->email_verified_at);
        $this->assertNull($user->password);
        $this->postJson('/api/auth/google/exchange', ['code' => $code, 'verifier' => str_repeat('x', 64)])->assertUnprocessable();
        $result = $this->postJson('/api/auth/google/exchange', ['code' => $code, 'verifier' => $verifier])->assertOk()->assertJsonPath('user.user_type', 'helper')->assertJsonPath('user.email_verified', true);
        $this->postJson('/api/auth/google/exchange', ['code' => $code, 'verifier' => $verifier])->assertUnprocessable();
        $this->actingAs($user, 'sanctum')->getJson('/api/dashboard')->assertForbidden();
        $this->postJson('/api/onboarding/contact', ['phone' => '08033334444', 'first_name' => 'Ada', 'last_name' => 'Obi'])->assertOk()->assertJsonPath('user.phone', '08033334444');
    }

    public function test_invalid_oauth_state_creates_no_account(): void
    {
        $this->configure();
        $this->mockProvider(['sub' => 'google-person', 'email' => 'person@gmail.com', 'email_verified' => true]);
        $response = $this->withSession(['state' => 'expected-state', 'google_login' => ['intent' => 'register', 'user_type' => 'helper', 'challenge' => str_repeat('a', 64), 'created_at' => time()]])->get('/api/auth/google/callback?state=wrong-state&code=google-code')->assertRedirect();
        $this->assertStringContainsString('#error=', $response->headers->get('Location'));
        $this->assertDatabaseMissing('users', ['google_id' => 'google-person']);
    }

    public function test_new_third_party_google_email_requires_separate_email_verification(): void
    {
        $user = app(GoogleAccountService::class)->resolve($this->profile('person@example.com'), 'register', 'employer');
        $this->assertNull($user->email_verified_at);
        $this->actingAs($user, 'sanctum')->postJson('/api/onboarding/contact', ['phone' => '08033334444'])->assertForbidden();
    }

    public function test_existing_verified_google_hosted_email_links_without_changing_role(): void
    {
        $user = $this->makeEmployer(['email' => 'person@gmail.com']);
        $linked = app(GoogleAccountService::class)->resolve($this->profile(), 'login', 'helper');
        $this->assertEquals($user->id, $linked->id);
        $this->assertEquals('employer', $linked->user_type->value);
        $this->assertEquals($linked->id, app(GoogleAccountService::class)->resolve($this->profile(), 'login', null)->id);
    }

    public function test_unverified_existing_account_is_not_automatically_linked(): void
    {
        $user = $this->makeEmployer(['email' => 'person@gmail.com', 'email_verified_at' => null]);
        try {
            app(GoogleAccountService::class)->resolve($this->profile(), 'register', 'helper');
            $this->fail('Unverified existing account must not be linked.');
        } catch (ValidationException $e) {
            $this->assertNull($user->fresh()->google_id);
        }
    }

    public function test_suspended_linked_account_and_unknown_login_are_rejected(): void
    {
        $user = $this->makeEmployer(['email' => 'person@gmail.com', 'status' => 'suspended']);
        $user->forceFill(['google_id' => 'google-person'])->save();
        try {
            app(GoogleAccountService::class)->resolve($this->profile(), 'login', null);
            $this->fail('Suspended account must not sign in.');
        } catch (HttpException $e) {
            $this->assertEquals(403, $e->getStatusCode());
        }
        $this->expectException(ValidationException::class);
        app(GoogleAccountService::class)->resolve($this->profile('new@gmail.com', 'new-person'), 'login', null);
    }

    public function test_existing_verified_admin_can_use_google_without_changing_privileges(): void
    {
        $admin = $this->makeAdmin('super-admin');
        $admin->update(['email' => 'person@gmail.com']);
        $linked = app(GoogleAccountService::class)->resolve($this->profile(), 'login', null);
        $this->assertEquals($admin->id, $linked->id);
        $this->assertTrue($linked->isSuperAdmin());
    }

    public function test_disabled_provider_blocks_signin_and_expired_handoff_cannot_issue_token(): void
    {
        $this->get('/api/auth/google/redirect?intent=login&challenge='.str_repeat('a', 64))->assertStatus(503);
        $this->configure();
        $user = $this->makeEmployer();
        $verifier = str_repeat('v', 64);
        $code = str_repeat('c', 64);
        Cache::put('google-handoff:'.hash('sha256', $code), ['user_id' => $user->id, 'challenge' => hash('sha256', $verifier)], now()->addMinutes(2));
        $this->travel(3)->minutes();
        $this->postJson('/api/auth/google/exchange', ['code' => $code, 'verifier' => $verifier])->assertUnprocessable();
        $this->assertEquals(0, $user->tokens()->count());
    }

    public function test_non_google_authoritative_email_cannot_link_an_existing_account(): void
    {
        $user = $this->makeEmployer(['email' => 'person@example.com']);
        $this->expectException(ValidationException::class);
        app(GoogleAccountService::class)->resolve($this->profile('person@example.com'),'login',null);
    }
    public function test_existing_google_subject_is_not_replaced_by_a_matching_email(): void
    {
        $user = $this->makeEmployer(['email' => 'person@gmail.com']);
        $user->forceFill(['google_id' => 'original-google-subject'])->save();
        try {
            app(GoogleAccountService::class)->resolve($this->profile(), 'login', null);
            $this->fail('A Google subject must never be overwritten by an email match.');
        } catch (ValidationException $e) {
            $this->assertEquals('original-google-subject', $user->fresh()->google_id);
        }
    }
}
