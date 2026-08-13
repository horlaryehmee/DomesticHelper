<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;

class SmsService
{
    /**
     * Send an SMS via Termii. Config: services.termii.key / sender_id.
     */
    public function send(string $phone, string $message): void
    {
        $key = config('services.termii.key');

        Http::withJson([
            'to' => $phone,
            'from' => config('services.termii.sender_id', 'DomesticHQ'),
            'sms' => $message,
            'type' => 'plain',
            'channel' => 'generic',
            'api_key' => $key,
        ])->post('https://api.ng.termii.com/api/sms/send')->throw();
    }
}
