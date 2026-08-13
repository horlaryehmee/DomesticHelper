<?php

namespace App\Http\Requests\Profiles;

use Illuminate\Foundation\Http\FormRequest;

class UpdateEmployerProfileRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'first_name' => ['sometimes', 'string', 'max:60'],
            'last_name' => ['sometimes', 'string', 'max:60'],
            'phone' => ['sometimes', 'string', 'max:20', 'regex:/^\+?[0-9]{10,15}$/', 'unique:users,phone,'.$this->user()->id],
            'profile_type' => ['sometimes', 'in:individual,agency'],
            'agency_name' => ['required_if:profile_type,agency', 'nullable', 'string', 'max:120'],
            'address_line' => ['nullable', 'string', 'max:255'],
            'city' => ['nullable', 'string', 'max:100'],
            'state' => ['nullable', 'string', 'max:100'],
            'bio' => ['nullable', 'string', 'max:1000'],
            'avatar' => ['nullable', 'image', 'max:2048'],
        ];
    }
}
