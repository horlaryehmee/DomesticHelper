<?php

namespace App\Enums;

enum VerificationReportStatus: string
{
    case PendingPayment = 'pending_payment';
    case Paid = 'paid';
    case Generated = 'generated';
    case Failed = 'failed';
}
