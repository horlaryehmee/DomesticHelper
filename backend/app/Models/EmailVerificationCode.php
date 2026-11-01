<?php

namespace App\Models;

class EmailVerificationCode extends Otp
{
    protected $table = 'email_verification_codes';
}
