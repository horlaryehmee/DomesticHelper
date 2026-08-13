<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Notifications\Notification;
use Illuminate\Support\Facades\Log;

/**
 * Centralized notification dispatch. All user notifications go through
 * here so channels (database now; email; SMS/WhatsApp later) stay uniform.
 */
class NotificationService
{
    public function send(User $user, Notification $notification): void
    {
        try {
            $user->notify($notification);
        } catch (\Throwable $e) {
            Log::error('Notification dispatch failed', [
                'user' => $user->id,
                'notification' => $notification::class,
                'error' => $e->getMessage(),
            ]);
        }
    }

    public function sendToMany(iterable $users, Notification $notification): void
    {
        foreach ($users as $user) {
            $this->send($user, clone $notification);
        }
    }
}
