<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreInterviewRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'helper_uuid' => ['required', 'string', 'exists:users,uuid'],
            'job_uuid' => ['nullable', 'string', 'exists:jobs,uuid'],
            'mode' => ['required', 'in:in_person,phone,video'],
            'scheduled_at' => ['required', 'date', 'after:now'],
            'location' => ['nullable', 'string', 'max:255'],
            'notes' => ['nullable', 'string', 'max:2000'],
        ];
    }
}
