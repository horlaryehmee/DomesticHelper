<?php

namespace App\Policies;

use App\Models\Payment;
use App\Models\User;

class PaymentPolicy
{
    public function view(User $user, Payment $payment): bool
    {
        return $user->isAdmin() || $user->id === $payment->user_id;
    }

    public function refund(User $user): bool
    {
        return $user->isAdmin() && $user->hasPermission('payments.refund');
    }
}
