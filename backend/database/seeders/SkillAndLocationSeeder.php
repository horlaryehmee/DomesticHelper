<?php

namespace Database\Seeders;

use App\Models\Location;
use App\Models\Skill;
use Illuminate\Database\Seeder;

class SkillAndLocationSeeder extends Seeder
{
    private array $helperSkills = [
        'Housekeeping', 'Cleaning', 'Nanny', 'Cooking', 'Driving',
        'Caregiving', 'Security', 'Gardening', 'Laundry', 'Personal Assistant',
        'Elderly Care', 'Child Care',
    ];

    private array $jobCategories = [
        'Housekeeper', 'Cleaner', 'Nanny', 'Cook', 'Driver',
        'Caregiver', 'Security Guard', 'Gardener', 'Laundry Worker', 'Personal Assistant',
    ];

    private array $locations = [
        'Lagos' => ['Lekki', 'Ikeja', 'Victoria Island', 'Yaba', 'Surulere', 'Ajah', 'Ikoyi', 'Gbagada', 'Ogudu', 'Magodo'],
        'FCT Abuja' => ['Wuse', 'Garki', 'Maitama', 'Asokoro', 'Gwarinpa', 'Kubwa'],
        'Rivers' => ['Port Harcourt', 'GRA Phase 2', 'Trans Amadi', 'Rumuokoro', 'Elelenwo'],
        'Oyo' => ['Ibadan', 'Bodija', 'Ring Road', 'Challenge', 'Dugbe'],
        'Ogun' => ['Abeokuta', 'Ibafo', 'Mowe', 'Sagamu'],
        'Kano' => ['Kano', 'Nassarawa', 'Hotoro', 'Bompai'],
        'Edo' => ['Benin City', 'GRA', 'Ekiosa', 'Ugbowo'],
        'Kaduna' => ['Kaduna', 'Barnawa', 'Ungwan Rimi'],
    ];

    public function run(): void
    {
        foreach ($this->helperSkills as $name) {
            Skill::updateOrCreate(
                ['slug' => str($name)->slug()],
                ['name' => $name, 'category' => 'helper', 'active' => true],
            );
        }

        foreach ($this->jobCategories as $name) {
            Skill::updateOrCreate(
                ['slug' => str($name)->slug()],
                ['name' => $name, 'category' => 'job', 'active' => true],
            );
        }

        foreach ($this->locations as $state => $cities) {
            foreach ($cities as $city) {
                Location::updateOrCreate(
                    ['slug' => str($state.' '.$city)->slug()],
                    ['state' => $state, 'city' => $city, 'active' => true],
                );
            }
        }
    }
}
