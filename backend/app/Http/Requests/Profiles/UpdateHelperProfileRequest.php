<?php

namespace App\Http\Requests\Profiles;

use Illuminate\Foundation\Http\FormRequest;

class UpdateHelperProfileRequest extends FormRequest
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
            'photo' => ['sometimes', 'image', 'max:2048'],
            'date_of_birth' => ['sometimes', 'date', 'before:-18 years'],
            'gender' => ['sometimes', 'in:male,female,other'],
            'state' => ['sometimes', 'string', 'max:100'],
            'city' => ['sometimes', 'string', 'max:100'],
            'address_line' => ['nullable', 'string', 'max:255'],
            'nin' => ['sometimes', 'digits:11'],
            'skills' => ['sometimes', 'array'],
            'skills.*' => ['integer', 'exists:skills,id'],
            'years_experience' => ['sometimes', 'integer', 'min:0', 'max:60'],
            'availability' => ['sometimes', 'in:immediate,within_1_week,within_2_weeks,within_1_month,negotiable'],
            'employment_type' => ['sometimes', 'in:full_time,part_time,live_in,any'],
            'expected_salary_min' => ['sometimes', 'integer', 'min:0'],
            'expected_salary_max' => ['nullable', 'integer', 'gte:expected_salary_min'],
            'bio' => ['nullable', 'string', 'max:1000'],
            'is_public' => ['sometimes', 'boolean'],
        ];
    }
}
