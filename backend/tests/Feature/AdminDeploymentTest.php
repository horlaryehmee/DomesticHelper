<?php

namespace Tests\Feature;

use App\Jobs\RunDeployment;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Queue;
use Tests\TestCase;

class AdminDeploymentTest extends TestCase
{
    use RefreshDatabase;

    public function test_only_super_admin_can_request_an_update_and_duplicate_requests_are_blocked(): void
    {
        Queue::fake();
        config(['queue.default' => 'database']);
        $this->getJson('/api/admin/deployment')->assertUnauthorized();

        $admin = User::factory()->create(['user_type' => 'admin']);
        $this->actingAs($admin, 'sanctum');
        $this->getJson('/api/admin/deployment')->assertForbidden();
        $this->postJson('/api/admin/deployment')->assertForbidden();

        $role = Role::create(['name' => 'Super Admin', 'slug' => 'super-admin']);
        $admin->roles()->attach($role);

        $this->getJson('/api/admin/deployment')->assertOk()->assertJsonPath('data', null);
        $this->postJson('/api/admin/deployment')->assertAccepted()
            ->assertJsonPath('data.status', 'queued');
        Queue::assertPushed(RunDeployment::class, 1);
        $this->postJson('/api/admin/deployment')->assertStatus(409);
        $this->assertSame(1, DB::table('deployments')->count());
    }
}
