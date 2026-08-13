<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreJobRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'title' => ['required', 'string', 'max:150'],
            'work_type' => ['required', 'string', 'max:80'],
            'description' => ['required', 'string', 'min:30', 'max:8000'],
            'responsibilities' => ['nullable', 'string', 'max:8000'],
            'requirements' => ['nullable', 'string', 'max:8000'],
            'salary_min' => ['nullable', 'integer', 'min:0'],
            'salary_max' => ['nullable', 'integer', 'gte:salary_min'],
            'salary_type' => ['required', 'in:monthly,weekly,daily,negotiable'],
            'location' => ['nullable', 'string', 'max:255'],
            'state' => ['required', 'string', 'max:100'],
            'city' => ['required', 'string', 'max:100'],
            'working_hours' => ['nullable', 'string', 'max:120'],
            'accommodation_available' => ['sometimes', 'boolean'],
            'employment_type' => ['required', 'in:full_time,part_time,live_in,other'],
            'start_date' => ['nullable', 'date', 'after_or_equal:today'],
            'status' => ['sometimes', 'in:draft,active'],
        ];
    }
}
