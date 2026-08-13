<?php

namespace Database\Seeders;

use App\Models\Setting;
use Illuminate\Database\Seeder;

class SettingSeeder extends Seeder
{
    public function run(): void
    {
        $settings = [
            ['key' => 'verification_report_price', 'value' => '5000', 'group' => 'payments', 'label' => 'Verification report price (₦)'],
            ['key' => 'reference_check_price', 'value' => '7500', 'group' => 'payments', 'label' => 'Reference check price (₦)'],
            ['key' => 'platform_fee_percent', 'value' => '5', 'group' => 'payments', 'label' => 'Platform fee (%)'],
            ['key' => 'otp_expiry_minutes', 'value' => '10', 'group' => 'security', 'label' => 'OTP expiry (minutes)'],
            ['key' => 'trust_score_base', 'value' => '50', 'group' => 'trust', 'label' => 'Trust score base'],
            ['key' => 'require_nin_for_public', 'value' => '1', 'group' => 'verification', 'label' => 'Require NIN verification for public profiles'],
            ['key' => 'support_email', 'value' => 'support@domestichelper.test', 'group' => 'general', 'label' => 'Support email'],
            ['key' => 'support_phone', 'value' => '+2348000000000', 'group' => 'general', 'label' => 'Support phone'],
        ];

        foreach ($settings as $setting) {
            Setting::setValue($setting['key'], $setting['value'], $setting['group'], $setting['label']);
        }
    }
}
