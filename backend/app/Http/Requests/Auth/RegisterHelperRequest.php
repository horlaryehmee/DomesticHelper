<?php

namespace App\Http\Requests\Auth;

use App\Services\PlatformFeatures;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class RegisterHelperRequest extends FormRequest
{
    public function authorize(): bool
    {
        return ! $this->user() || ($this->user()->user_type->value === 'helper' && $this->user()->email_verified_at && $this->user()->details_confirmed_at && in_array($this->user()->approval_status, ['draft', 'rejected']));
    }

    protected function prepareForValidation(): void
    {
        if ($user = $this->user()) {
            $this->merge($user->only(['first_name', 'last_name', 'email', 'phone']));
        }
    }

    public function rules(): array
    {
        $directory = app(PlatformFeatures::class)->enabled('helper_directory');

        return [
            'first_name' => ['required', 'string', 'max:60'],
            'last_name' => ['required', 'string', 'max:60'],
            'email' => ['required', 'email', 'max:120', Rule::unique('users', 'email')->ignore($this->user()?->id)],
            'phone' => ['required', 'string', 'max:20', 'regex:/^\+?[0-9]{10,15}$/', Rule::unique('users', 'phone')->ignore($this->user()?->id)],
            'password' => [$this->user() ? 'nullable' : 'required', 'string', 'min:8', 'confirmed'],
            'photo' => [$directory ? 'nullable' : 'prohibited', 'image', 'max:2048'],
            'intro_video' => [$directory ? 'nullable' : 'prohibited', 'file', 'mimetypes:video/mp4,video/webm,video/quicktime', 'max:20480'],
            'date_of_birth' => ['required', 'date', 'before:-18 years'],
            'gender' => ['required', 'in:male,female,other'],
            'state' => ['required', 'string', 'max:100'],
            'city' => ['required', 'string', 'max:100'],
            'address_line' => ['required', 'string', 'max:255'],
            'nin' => ['required', 'digits:11'],
            'guarantor_name' => ['required', 'string', 'max:120'],
            'guarantor_phone' => ['required', 'string', 'regex:/^\+?[0-9]{10,15}$/'],
            'guarantor_relationship' => ['required', 'string', 'max:80'],
            'guarantor_2_name' => ['required', 'string', 'max:120'],
            'guarantor_2_phone' => ['required', 'string', 'regex:/^\+?[0-9]{10,15}$/', 'different:guarantor_phone'],
            'guarantor_2_relationship' => ['required', 'string', 'max:80'],
            'address_proof' => ['required', 'file', 'mimes:pdf,jpg,jpeg,png,webp', 'max:5120'],
            'skills' => [$directory ? 'required' : 'prohibited', 'array', 'min:1'],
            'skills.*' => ['integer', 'exists:skills,id'],
            'years_experience' => [$directory ? 'required' : 'prohibited', 'integer', 'min:0', 'max:60'],
            'availability' => [$directory ? 'required' : 'prohibited', 'in:immediate,within_1_week,within_2_weeks,within_1_month,negotiable'],
            'employment_type' => [$directory ? 'nullable' : 'prohibited', 'in:full_time,part_time,live_in,any'],
            'expected_salary_min' => [$directory ? 'required' : 'prohibited', 'integer', 'min:0'],
            'expected_salary_max' => [$directory ? 'nullable' : 'prohibited', 'integer', 'gte:expected_salary_min'],
            'bio' => [$directory ? 'nullable' : 'prohibited', 'string', 'max:1000'],
            'employment_history' => [$directory ? 'nullable' : 'prohibited', 'array'],
            'employment_history.*.job_role' => ['required_with:employment_history', 'string', 'max:120'],
            'employment_history.*.employer_name' => ['nullable', 'string', 'max:120'],
            'employment_history.*.start_date' => ['nullable', 'date'],
            'employment_history.*.end_date' => ['nullable', 'date', 'after_or_equal:employment_history.*.start_date'],
        ];
    }
}
