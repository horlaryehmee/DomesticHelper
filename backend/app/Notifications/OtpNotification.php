<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class OtpNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(public string $code, public string $purpose = 'verification')
    {
    }

    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        return (new MailMessage)
            ->subject('Your verification code')
            ->line("Your Domestic Helper {$this->purpose} code is:")
            ->line("**{$this->code}**")
            ->line('This code expires in 10 minutes. If you did not request this, you can safely ignore this message.');
    }
}
