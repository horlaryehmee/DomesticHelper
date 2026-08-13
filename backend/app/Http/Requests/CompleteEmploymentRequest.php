<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class CompleteEmploymentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'end_date' => ['required', 'date', 'before_or_equal:today'],
            'termination_reason' => ['required', 'string', 'max:255'],
            'performance_rating' => ['nullable', 'integer', 'between:1,5'],
        ];
    }
}
