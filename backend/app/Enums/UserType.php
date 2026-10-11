<?php

namespace App\Enums;

enum UserType: string
{
    case Employer = 'employer';
    case Helper = 'helper';
    case Admin = 'admin';

    public function label(): string
    {
        return match ($this) {
            self::Employer => 'Employer',
            self::Helper => 'Hire Safe Helper',
            self::Admin => 'Administrator',
        };
    }
}
