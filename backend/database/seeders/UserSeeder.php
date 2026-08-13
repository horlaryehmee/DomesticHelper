<?php

namespace Database\Seeders;

use App\Enums\IdentityVerificationStatus;
use App\Enums\IdentityVerificationType;
use App\Models\IdentityVerification;
use App\Models\Role;
use App\Models\Skill;
use App\Models\User;
use App\Services\TrustScoreService;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\Storage;

class UserSeeder extends Seeder
{
    /**
     * Fictional seed data only — no real people.
     */
    private array $employers = [
        ['first' => 'Adaeze', 'last' => 'Okafor', 'city' => 'Lekki', 'state' => 'Lagos', 'type' => 'individual'],
        ['first' => 'Tunde', 'last' => 'Balogun', 'city' => 'Ikeja', 'state' => 'Lagos', 'type' => 'individual'],
        ['first' => 'Ngozi', 'last' => 'Eze', 'city' => 'Wuse', 'state' => 'FCT Abuja', 'type' => 'individual'],
        ['first' => 'Femi', 'last' => 'Adeyemi', 'city' => 'Yaba', 'state' => 'Lagos', 'type' => 'individual'],
        ['first' => 'Blessing', 'last' => 'Johnson', 'city' => 'Port Harcourt', 'state' => 'Rivers', 'type' => 'individual'],
        ['first' => 'Chinedu', 'last' => 'Obi', 'city' => 'Surulere', 'state' => 'Lagos', 'type' => 'individual'],
        ['first' => 'Amina', 'last' => 'Bello', 'city' => 'Kano', 'state' => 'Kano', 'type' => 'individual'],
        ['first' => 'Rotimi', 'last' => 'Ogunlesi', 'city' => 'Ibadan', 'state' => 'Oyo', 'type' => 'individual'],
        ['first' => 'Chiamaka', 'last' => 'Nwosu', 'city' => 'Ajah', 'state' => 'Lagos', 'type' => 'individual'],
        ['first' => 'Ebuka', 'last' => 'Anyanwu', 'city' => 'Benin City', 'state' => 'Edo', 'type' => 'individual'],
    ];

    private array $helpers = [
        // name, gender, city, state, skills, experience, salary
        ['Grace', 'Adamu', 'female', 'Lekki', 'Lagos', ['Nanny', 'Child Care', 'Cooking'], 6, 90000],
        ['Mary', 'Okon', 'female', 'Ikeja', 'Lagos', ['Housekeeping', 'Laundry'], 4, 70000],
        ['Esther', 'Chukwu', 'female', 'Victoria Island', 'Lagos', ['Cooking', 'Housekeeping'], 8, 110000],
        ['John', 'Musa', 'male', 'Yaba', 'Lagos', ['Driving', 'Security'], 5, 85000],
        ['Blessing', 'Adewale', 'female', 'Surulere', 'Lagos', ['Cleaning', 'Laundry', 'Housekeeping'], 3, 60000],
        ['Daniel', 'Eze', 'male', 'Ajah', 'Lagos', ['Driving', 'Personal Assistant'], 7, 100000],
        ['Ruth', 'Abubakar', 'female', 'Ikoyi', 'Lagos', ['Caregiving', 'Elderly Care'], 9, 120000],
        ['Samuel', 'Osei', 'male', 'Gbagada', 'Lagos', ['Gardening', 'Security'], 4, 65000],
        ['Joy', 'Uche', 'female', 'Magodo', 'Lagos', ['Nanny', 'Cooking', 'Child Care'], 5, 95000],
        ['Victor', 'Okoro', 'male', 'Wuse', 'FCT Abuja', ['Driving', 'Security'], 6, 90000],
        ['Mercy', 'Bala', 'female', 'Garki', 'FCT Abuja', ['Housekeeping', 'Cooking'], 7, 80000],
        ['David', 'Suleiman', 'male', 'Maitama', 'FCT Abuja', ['Gardening', 'Security'], 8, 75000],
        ['Patience', 'Dike', 'female', 'Asokoro', 'FCT Abuja', ['Caregiving', 'Housekeeping'], 6, 105000],
        ['Joseph', 'Nwachukwu', 'male', 'Port Harcourt', 'Rivers', ['Driving', 'Personal Assistant'], 4, 85000],
        ['Gift', 'Ekong', 'female', 'GRA Phase 2', 'Rivers', ['Nanny', 'Child Care'], 5, 90000],
        ['Emeka', 'Ibe', 'male', 'Trans Amadi', 'Rivers', ['Security', 'Gardening'], 7, 70000],
        ['Sarah', 'Yusuf', 'female', 'Ibadan', 'Oyo', ['Housekeeping', 'Laundry', 'Cleaning'], 3, 55000],
        ['Peter', 'Olawale', 'male', 'Bodija', 'Oyo', ['Driving', 'Security'], 10, 95000],
        ['Hannah', 'Igwe', 'female', 'Ring Road', 'Oyo', ['Cooking', 'Housekeeping'], 8, 75000],
        ['Michael', 'Danjuma', 'male', 'Abeokuta', 'Ogun', ['Driving', 'Gardening'], 5, 70000],
        ['Deborah', 'Femi', 'female', 'Mowe', 'Ogun', ['Cleaning', 'Laundry'], 2, 50000],
        ['Solomon', 'Akin', 'male', 'Kano', 'Kano', ['Security', 'Driving'], 6, 80000],
        ['Aisha', 'Ibrahim', 'female', 'Nassarawa', 'Kano', ['Cooking', 'Housekeeping'], 4, 60000],
        ['Janet', 'Omoregie', 'female', 'Benin City', 'Edo', ['Caregiving', 'Elderly Care', 'Housekeeping'], 9, 110000],
        ['Kelechi', 'Amadi', 'male', 'Ugbowo', 'Edo', ['Driving', 'Personal Assistant'], 5, 85000],
        ['Comfort', 'Danladi', 'female', 'Kaduna', 'Kaduna', ['Housekeeping', 'Cooking', 'Laundry'], 6, 65000],
        ['Ibrahim', 'Sani', 'male', 'Barnawa', 'Kaduna', ['Gardening', 'Security'], 4, 55000],
        ['Linda', 'Okoro', 'female', 'Lekki', 'Lagos', ['Personal Assistant', 'Cooking'], 3, 75000],
        ['Anthony', 'Agu', 'male', 'Surulere', 'Lagos', ['Driving'], 12, 105000],
        ['Victoria', 'Effiong', 'female', 'Yaba', 'Lagos', ['Child Care', 'Nanny', 'Cooking'], 7, 100000],
    ];

    public function run(TrustScoreService $trustScore): void
    {
        // --- Staff ---
        $super = User::create([
            'first_name' => 'Platform', 'last_name' => 'Administrator',
            'email' => 'admin@domestichelper.test', 'password' => 'password',
            'user_type' => 'admin', 'email_verified_at' => now(), 'phone_verified_at' => now(),
        ]);
        $super->roles()->attach(Role::where('slug', 'super-admin')->first());

        $verifier = User::create([
            'first_name' => 'Tola', 'last_name' => 'Verification',
            'email' => 'verifier@domestichelper.test', 'password' => 'password',
            'user_type' => 'admin', 'email_verified_at' => now(),
        ]);
        $verifier->roles()->attach(Role::where('slug', 'verification-officer')->first());

        User::create([
            'first_name' => 'Kemi', 'last_name' => 'Moderator',
            'email' => 'moderator@domestichelper.test', 'password' => 'password',
            'user_type' => 'admin', 'email_verified_at' => now(),
        ])->roles()->attach(Role::where('slug', 'moderator')->first());

        // --- Employers ---
        $employerUsers = [];
        foreach ($this->employers as $i => $e) {
            $user = User::create([
                'first_name' => $e['first'], 'last_name' => $e['last'],
                'email' => 'employer'.($i + 1).'@domestichelper.test',
                'phone' => '0803'.sprintf('%07d', 1000000 + $i),
                'password' => 'password',
                'user_type' => 'employer',
                'phone_verified_at' => now(), 'email_verified_at' => now(),
                'last_active_at' => now()->subDays(random_int(0, 14)),
            ]);
            $user->employerProfile()->create([
                'profile_type' => $e['type'],
                'city' => $e['city'], 'state' => $e['state'],
                'address_line' => null,
                'profile_completed' => true,
            ]);
            $employerUsers[] = $user;
        }
        $this->command?->info('Created 10 employers.');

        // --- Helpers ---
        $helperUsers = [];
        $skills = Skill::where('category', 'helper')->get()->keyBy('name');

        foreach ($this->helpers as $i => $h) {
            [$first, $last, $gender, $city, $state, $helperSkills, $years, $salary] = $h;

            $verified = $i < 15; // 15 verified helpers

            $user = User::create([
                'first_name' => $first, 'last_name' => $last,
                'email' => 'helper'.($i + 1).'@domestichelper.test',
                'phone' => '0812'.sprintf('%07d', 2000000 + $i),
                'password' => 'password',
                'user_type' => 'helper',
                'phone_verified_at' => now(), 'email_verified_at' => now(),
                'last_active_at' => now()->subDays(random_int(0, 20)),
            ]);

            $nin = '12345'.sprintf('%06d', 678901 + $i);

            $photoPath = $this->makeAvatar($user, $first, $last);

            $user->helperProfile()->create([
                'date_of_birth' => now()->subYears(random_int(22, 48))->subMonths(random_int(0, 11)),
                'gender' => $gender,
                'state' => $state, 'city' => $city,
                'nin_encrypted' => Crypt::encryptString($nin),
                'nin_hash' => hash('sha256', $nin),
                'nin_last4' => substr($nin, -4),
                'photo_path' => $photoPath,
                'bio' => $this->bio($first, $helperSkills, $years),
                'years_experience' => $years,
                'availability' => ['immediate', 'within_1_week', 'within_2_weeks', 'within_1_month', 'negotiable'][array_rand([0, 1, 2, 3, 4])],
                'employment_type' => ['full_time', 'part_time', 'live_in', 'any'][array_rand([0, 1, 2, 3])],
                'expected_salary_min' => $salary - 10000,
                'expected_salary_max' => $salary + 15000,
                'is_public' => true,
                'verification_status' => $verified ? 'verified' : 'unverified',
                'profile_completed' => true,
            ]);

            $user->helperProfile->skills()->attach(
                collect($helperSkills)->map(fn ($s) => $skills[$s]->id ?? null)->filter(),
            );

            if ($verified) {
                foreach (['photo', 'nin'] as $type) {
                    IdentityVerification::create([
                        'user_id' => $user->id,
                        'type' => IdentityVerificationType::from($type),
                        'status' => IdentityVerificationStatus::Approved,
                        'verified_at' => now()->subDays(random_int(10, 200)),
                        'reviewed_by' => $verifier->id,
                        'reviewed_at' => now()->subDays(random_int(10, 200)),
                    ]);
                }
            }

            $helperUsers[] = $user;
        }

        $this->command?->info('Created 30 helpers (15 verified).');

        // Store for the next seeders via static properties.
        static::$employerUsers = $employerUsers;
        static::$helperUsers = $helperUsers;
    }

    public static array $employerUsers = [];
    public static array $helperUsers = [];

    private function bio(string $first, array $skills, int $years): string
    {
        $list = strtolower(implode(', ', array_slice($skills, 0, 3)));

        return "Hi, I'm {$first}. I have {$years} years of experience in {$list}. I am reliable, hardworking and treat every home with respect. I am available to start work and can provide references on request.";
    }

    /**
     * Deterministic SVG avatar (initials on a colored block) — no binary assets.
     */
    private function makeAvatar(User $user, string $first, string $last): string
    {
        $colors = ['0F766E', '1D4ED8', 'B45309', '9D174D', '4D7C0F', '7C2D12', '4338CA', '0E7490'];
        $color = $colors[crc32($user->email) % count($colors)];
        $initials = strtoupper($first[0].$last[0]);

        $svg = <<<SVG
<svg xmlns="http://www.w3.org/2000/svg" width="240" height="240">
  <rect width="240" height="240" fill="#{$color}"/>
  <text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle"
        font-family="Arial, sans-serif" font-size="88" font-weight="700" fill="#ffffff">{$initials}</text>
</svg>
SVG;

        $path = 'profiles/'.str($user->email)->before('@').'.svg';
        Storage::disk('public')->put($path, $svg);

        return $path;
    }
}
