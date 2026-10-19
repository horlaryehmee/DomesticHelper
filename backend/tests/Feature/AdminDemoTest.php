<?php

namespace Tests\Feature;

use App\Models\Role;
use App\Models\Skill;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AdminDemoTest extends TestCase
{
    use RefreshDatabase;

    public function test_master_admin_can_fill_and_clear_demo_without_deleting_real_users(): void
    {
        $role = Role::create(['slug' => 'super-admin', 'name' => 'Super Admin']);
        $master = User::factory()->create(['user_type' => 'admin']);
        $master->roles()->attach($role);
        $real = User::factory()->create(['user_type' => 'employer']);
        Skill::create(['slug' => 'housekeeping', 'name' => 'Housekeeping', 'category' => 'helper', 'active' => true]);

        $this->actingAs($master, 'sanctum')->postJson('/api/admin/demo/fill')
            ->assertOk()->assertJsonPath('data.users', 4)->assertJsonPath('data.jobs', 1);
        $this->postJson('/api/admin/demo/fill')->assertOk()->assertJsonPath('data.users', 4);
        $this->postJson('/api/admin/demo/clear', ['confirmation' => 'wrong'])->assertUnprocessable();
        $this->postJson('/api/admin/demo/clear', ['confirmation' => 'CLEAR DEMO'])
            ->assertOk()->assertJsonPath('data.users', 0)->assertJsonPath('data.jobs', 0);

        $this->assertDatabaseHas('users', ['id' => $real->id]);
        $this->assertDatabaseHas('users', ['id' => $master->id]);
    }

    public function test_regular_admin_cannot_manage_demo(): void
    {
        $staff = User::factory()->create(['user_type' => 'admin']);
        $this->actingAs($staff, 'sanctum')->postJson('/api/admin/demo/fill')->assertForbidden();
        $this->getJson('/api/admin/demo')->assertForbidden();
    }

    public function test_clear_removes_legacy_seeded_demo_accounts(): void
    {
        $role = Role::create(['slug' => 'super-admin', 'name' => 'Super Admin']);
        $master = User::factory()->create(['user_type' => 'admin', 'email' => 'info@hiresafe.ng']);
        $master->roles()->attach($role);
        User::factory()->create(['user_type' => 'helper', 'email' => 'helper1@domestichelper.test']);
        User::factory()->create(['user_type' => 'helper', 'email' => 'real@example.com']);

        $this->actingAs($master, 'sanctum')->getJson('/api/admin/demo')->assertJsonPath('data.users', 1);
        $this->postJson('/api/admin/demo/clear', ['confirmation' => 'CLEAR DEMO'])->assertOk();

        $this->assertDatabaseMissing('users', ['email' => 'helper1@domestichelper.test']);
        $this->assertDatabaseHas('users', ['email' => 'real@example.com']);
        $this->assertDatabaseHas('users', ['email' => 'info@hiresafe.ng']);
    }
}
