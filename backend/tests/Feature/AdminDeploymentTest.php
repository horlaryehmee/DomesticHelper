<?php

namespace Tests\Feature;

use App\Models\Role;
use App\Models\User;
use App\Services\DeploymentRunner;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class AdminDeploymentTest extends TestCase
{
    use RefreshDatabase;

    public function test_only_super_admin_can_run_update_and_status_read_does_not_start_it(): void
    {
        $this->getJson('/api/admin/deployment')->assertUnauthorized();

        $admin = User::factory()->create(['user_type' => 'admin']);
        $this->actingAs($admin, 'sanctum');
        $this->getJson('/api/admin/deployment')->assertForbidden();
        $this->postJson('/api/admin/deployment')->assertForbidden();

        $role = Role::create(['name' => 'Super Admin', 'slug' => 'super-admin']);
        $admin->roles()->attach($role);

        $this->getJson('/api/admin/deployment')->assertOk()->assertJsonPath('data', null);
        $this->mock(DeploymentRunner::class)
            ->shouldReceive('run')->once()
            ->andReturnUsing(function (int $id) {
                DB::table('deployments')->where('id', $id)->update([
                    'status' => 'succeeded', 'step' => 'Site is up to date', 'finished_at' => now(),
                ]);
            });

        $this->postJson('/api/admin/deployment')->assertOk()
            ->assertJsonPath('data.status', 'succeeded');
        $this->getJson('/api/admin/deployment')->assertOk()
            ->assertJsonPath('data.status', 'succeeded');

        DB::table('deployments')->where('id', 1)->update(['status' => 'running']);
        $this->postJson('/api/admin/deployment')->assertStatus(409);
        $this->assertSame(1, DB::table('deployments')->count());
    }
}
