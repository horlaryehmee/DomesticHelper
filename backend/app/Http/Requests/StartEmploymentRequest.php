<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StartEmploymentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'helper_uuid' => ['required', 'string', 'exists:users,uuid'],
            'job_role' => ['required', 'string', 'max:120'],
            'start_date' => ['required', 'date', 'before_or_equal:today'],
            'salary' => ['nullable', 'integer', 'min:0'],
            'employment_type' => ['required', 'in:full_time,part_time,live_in,other'],
            'location' => ['nullable', 'string', 'max:255'],
        ];
    }
}
