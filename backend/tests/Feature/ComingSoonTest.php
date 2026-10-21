<?php

namespace Tests\Feature;

use App\Models\User;
use App\Services\ComingSoon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class ComingSoonTest extends TestCase
{
    use RefreshDatabase;

    public function test_visitor_can_join_waitlist_while_site_is_coming_soon(): void
    {
        app(ComingSoon::class)->setEnabled(true);

        $this->postJson('/api/waitlist', ['email' => 'Visitor@Example.com'])->assertOk();
        $this->postJson('/api/waitlist', ['email' => 'visitor@example.com'])->assertOk();
        $this->postJson('/api/waitlist', ['email' => 'invalid'])->assertUnprocessable();

        $this->assertSame(1, DB::table('waitlist_subscribers')->count());
        $this->assertSame('visitor@example.com', DB::table('waitlist_subscribers')->value('email'));
    }

    public function test_admin_can_enable_coming_soon_and_preview_link_grants_access(): void
    {
        $this->getJson('/api/site-status')
            ->assertOk()->assertJsonPath('enabled', false)->assertJsonPath('access', true)
            ->assertDontSee('preview_token');
        $this->getJson('/api/admin/coming-soon')->assertUnauthorized();

        $admin = User::factory()->create(['user_type' => 'admin']);
        $this->actingAs($admin, 'sanctum');

        $token = $this->getJson('/api/admin/coming-soon')
            ->assertOk()->assertJsonPath('data.enabled', false)
            ->json('data.preview_token');

        $this->putJson('/api/admin/coming-soon', ['enabled' => true])
            ->assertOk()->assertJsonPath('data.enabled', true);
        $this->getJson('/api/site-status')
            ->assertOk()->assertJsonPath('enabled', true)->assertJsonPath('access', false);
        $this->withHeader('X-Site-Preview-Token', $token)->getJson('/api/site-status')
            ->assertOk()->assertJsonPath('access', true);
        $this->getJson('/api/admin/settings')->assertDontSee($token)->assertDontSee('coming_soon_preview_nonce');

        $replacement = $this->postJson('/api/admin/coming-soon/rotate-preview-link')
            ->assertOk()->json('data.preview_token');
        $this->assertNotSame($token, $replacement);
        $this->withHeader('X-Site-Preview-Token', $token)->getJson('/api/site-status')
            ->assertJsonPath('access', false);
        $this->withHeader('X-Site-Preview-Token', $replacement)->getJson('/api/site-status')
            ->assertJsonPath('access', true);

        $this->putJson('/api/admin/coming-soon', ['enabled' => false])
            ->assertOk()->assertJsonPath('data.enabled', false);
        $this->getJson('/api/site-status')->assertJsonPath('access', true);
    }

    public function test_generic_settings_cannot_change_coming_soon_controls(): void
    {
        $admin = User::factory()->create(['user_type' => 'admin']);
        $this->actingAs($admin, 'sanctum')->putJson('/api/admin/settings', [
            'settings' => [['key' => 'coming_soon_enabled', 'value' => '1']],
        ])->assertUnprocessable();
    }

    public function test_public_content_requires_a_preview_link_while_enabled(): void
    {
        $comingSoon = app(ComingSoon::class);
        $token = $comingSoon->previewToken();
        $comingSoon->setEnabled(true);

        $this->getJson('/api/meta')->assertStatus(503);
        $this->getJson('/api/helpers')->assertStatus(503);
        $this->getJson('/api/jobs')->assertStatus(503);
        $this->postJson('/api/auth/register/employer', [])->assertStatus(503);
        $this->withHeader('X-Site-Preview-Token', $token)->getJson('/api/meta')->assertOk();

        $admin = User::factory()->create(['user_type' => 'admin']);
        $this->withHeader('X-Site-Preview-Token', '')->actingAs($admin, 'sanctum')
            ->getJson('/api/meta')->assertOk();
    }
}
