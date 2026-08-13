<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreReviewRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'helper_uuid' => ['required', 'string', 'exists:users,uuid'],
            'employment_record_uuid' => ['required', 'string', 'exists:employment_records,uuid'],
            'rating' => ['required', 'integer', 'between:1,5'],
            'work_type' => ['nullable', 'string', 'max:120'],
            'duration_worked' => ['nullable', 'string', 'max:80'],
            'feedback' => ['required', 'string', 'min:10', 'max:2000'],
        ];
    }
}
