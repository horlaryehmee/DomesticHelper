<?php

namespace Database\Seeders;

use App\Models\Permission;
use App\Models\Role;
use Illuminate\Database\Seeder;

class RoleAndPermissionSeeder extends Seeder
{
    private array $roles = [
        ['slug' => 'super-admin', 'name' => 'Super Admin', 'description' => 'Full platform control'],
        ['slug' => 'admin', 'name' => 'Admin', 'description' => 'Platform administration'],
        ['slug' => 'verification-officer', 'name' => 'Verification Officer', 'description' => 'Identity & employment verification'],
        ['slug' => 'moderator', 'name' => 'Moderator', 'description' => 'Reviews, reports and disputes moderation'],
        ['slug' => 'support-agent', 'name' => 'Support Agent', 'description' => 'Customer support'],
        ['slug' => 'employer', 'name' => 'Employer', 'description' => 'Hiring households and agencies'],
        ['slug' => 'helper', 'name' => 'Domestic Helper', 'description' => 'Verified domestic staff'],
    ];

    private array $permissions = [
        ['slug' => 'users.view', 'name' => 'View users'],
        ['slug' => 'users.suspend', 'name' => 'Suspend accounts'],
        ['slug' => 'users.assign_roles', 'name' => 'Assign staff roles'],
        ['slug' => 'verifications.review', 'name' => 'Review identity verifications'],
        ['slug' => 'employment.verify', 'name' => 'Verify employment records'],
        ['slug' => 'reference_checks.manage', 'name' => 'Manage reference checks'],
        ['slug' => 'reports.view', 'name' => 'View reports'],
        ['slug' => 'reports.decide', 'name' => 'Decide report outcomes'],
        ['slug' => 'reviews.moderate', 'name' => 'Moderate reviews'],
        ['slug' => 'disputes.view', 'name' => 'View disputes'],
        ['slug' => 'disputes.decide', 'name' => 'Resolve disputes'],
        ['slug' => 'jobs.moderate', 'name' => 'Moderate jobs'],
        ['slug' => 'payments.view', 'name' => 'View payments'],
        ['slug' => 'payments.refund', 'name' => 'Refund payments'],
        ['slug' => 'trust_scores.manage', 'name' => 'Manage trust scores'],
        ['slug' => 'audit_logs.view', 'name' => 'View audit logs'],
        ['slug' => 'settings.manage', 'name' => 'Manage platform settings'],
    ];

    public function run(): void
    {
        foreach ($this->roles as $role) {
            Role::updateOrCreate(['slug' => $role['slug']], $role);
        }

        foreach ($this->permissions as $permission) {
            Permission::updateOrCreate(['slug' => $permission['slug']], $permission);
        }

        $superAdmin = Role::where('slug', 'super-admin')->first();
        $admin = Role::where('slug', 'admin')->first();
        $verification = Role::where('slug', 'verification-officer')->first();
        $moderator = Role::where('slug', 'moderator')->first();
        $support = Role::where('slug', 'support-agent')->first();

        $superAdmin->permissions()->sync(Permission::pluck('id'));
        $admin->permissions()->sync(Permission::whereIn('slug', [
            'users.view', 'users.suspend', 'reports.view', 'reports.decide',
            'reviews.moderate', 'disputes.view', 'disputes.decide',
            'jobs.moderate', 'payments.view', 'payments.refund',
            'trust_scores.manage', 'audit_logs.view', 'settings.manage',
        ])->pluck('id'));
        $verification->permissions()->sync(Permission::whereIn('slug', [
            'users.view', 'verifications.review', 'employment.verify', 'reference_checks.manage',
        ])->pluck('id'));
        $moderator->permissions()->sync(Permission::whereIn('slug', [
            'users.view', 'reports.view', 'reports.decide', 'reviews.moderate',
            'disputes.view', 'disputes.decide',
        ])->pluck('id'));
        $support->permissions()->sync(Permission::whereIn('slug', ['users.view', 'reports.view', 'disputes.view'])->pluck('id'));
    }
}
