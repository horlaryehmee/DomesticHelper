<?php

namespace App\Enums;

enum InterviewMode: string
{
    case InPerson = 'in_person';
    case Phone = 'phone';
    case Video = 'video';

    public function label(): string
    {
        return match ($this) {
            self::InPerson => 'In person',
            self::Phone => 'Phone',
            self::Video => 'Video',
        };
    }
}
