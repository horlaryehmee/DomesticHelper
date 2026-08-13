<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $this->call([
            RoleAndPermissionSeeder::class,
            SkillAndLocationSeeder::class,
            TrustScoreRuleSeeder::class,
            SettingSeeder::class,
            UserSeeder::class,
            EmploymentAndReviewSeeder::class,
            JobSeeder::class,
            ReportAndDisputeSeeder::class,
            LowScoreHelperSeeder::class,
        ]);
    }
}
