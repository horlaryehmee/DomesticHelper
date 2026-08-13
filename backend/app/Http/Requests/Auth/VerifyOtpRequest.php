<?php

namespace App\Http\Requests\Auth;

use Illuminate\Foundation\Http\FormRequest;

class VerifyOtpRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'recipient' => ['required', 'string', 'max:255'],
            'purpose' => ['required', 'in:register_phone,verify_phone,login,reset_password'],
            'code' => ['required', 'digits:6'],
        ];
    }
}
