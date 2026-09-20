<?php

namespace Database\Seeders;

use App\Services\CommunityExperienceDefaults;
use Illuminate\Database\Seeder;

class CommunityExperienceSeeder extends Seeder
{
    public function run(CommunityExperienceDefaults $defaults): void
    {
        $defaults->ensure();
    }
}
