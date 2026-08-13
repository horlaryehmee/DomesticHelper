<?php

namespace App\Http\Requests\Auth;

use Illuminate\Foundation\Http\FormRequest;

class RegisterHelperRequest extends FormRequest
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
            'photo' => ['nullable', 'image', 'max:2048'],
            'date_of_birth' => ['required', 'date', 'before:-18 years'],
            'gender' => ['required', 'in:male,female,other'],
            'state' => ['required', 'string', 'max:100'],
            'city' => ['required', 'string', 'max:100'],
            'address_line' => ['nullable', 'string', 'max:255'],
            'nin' => ['required', 'digits:11'],
            'skills' => ['required', 'array', 'min:1'],
            'skills.*' => ['integer', 'exists:skills,id'],
            'years_experience' => ['required', 'integer', 'min:0', 'max:60'],
            'availability' => ['required', 'in:immediate,within_1_week,within_2_weeks,within_1_month,negotiable'],
            'employment_type' => ['nullable', 'in:full_time,part_time,live_in,any'],
            'expected_salary_min' => ['required', 'integer', 'min:0'],
            'expected_salary_max' => ['nullable', 'integer', 'gte:expected_salary_min'],
            'bio' => ['nullable', 'string', 'max:1000'],
            'employment_history' => ['nullable', 'array'],
            'employment_history.*.job_role' => ['required_with:employment_history', 'string', 'max:120'],
            'employment_history.*.employer_name' => ['nullable', 'string', 'max:120'],
            'employment_history.*.start_date' => ['nullable', 'date'],
            'employment_history.*.end_date' => ['nullable', 'date', 'after_or_equal:employment_history.*.start_date'],
        ];
    }
}
