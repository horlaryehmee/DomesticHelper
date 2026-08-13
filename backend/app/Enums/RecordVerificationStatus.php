<?php

namespace App\Enums;

enum RecordVerificationStatus: string
{
    case Unverified = 'unverified';
    case Verified = 'verified';
    case Rejected = 'rejected';
}
