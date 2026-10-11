<?php

namespace App\Http\Requests\Auth;

use Illuminate\Foundation\Http\FormRequest;

class RegisterEmployerRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'first_name' => ['required', 'string', 'max:60'],
            'last_name' => ['required', 'string', 'max:60'],
            'email' => ['required', 'email', 'max:120', 'unique:users,email'],
            'phone' => ['required', 'string', 'max:20', 'regex:/^\+?[0-9]{10,15}$/', 'unique:users,phone'],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
            'address_line' => ['required', 'string', 'max:255'],
            'nin' => ['required', 'digits:11'],
            'guarantor_name' => ['required', 'string', 'max:120'],
            'guarantor_phone' => ['required', 'string', 'regex:/^\+?[0-9]{10,15}$/'],
            'guarantor_relationship' => ['required', 'string', 'max:80'],
            'address_proof' => ['required', 'file', 'mimes:pdf,jpg,jpeg,png,webp', 'max:5120'],
            'city' => ['required', 'string', 'max:100'],
            'state' => ['required', 'string', 'max:100'],
            'profile_type' => ['required', 'in:individual,agency'],
            'agency_name' => ['required_if:profile_type,agency', 'nullable', 'string', 'max:120'],
        ];
    }
}
