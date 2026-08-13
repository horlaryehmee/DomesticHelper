<?php

namespace App\Listeners;

use App\Events\PaymentSucceeded;
use App\Models\VerificationReport;
use App\Services\VerificationReportService;

class HandlePaidVerificationReport
{
    public function handle(PaymentSucceeded $event): void
    {
        $payable = $event->payment->payable;

        if ($payable instanceof VerificationReport) {
            app(VerificationReportService::class)->generateAfterPayment($payable);
        }
    }
}
