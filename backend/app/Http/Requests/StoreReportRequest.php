<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreReportRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'helper_uuid' => ['required', 'string', 'exists:users,uuid'],
            'employment_record_uuid' => ['nullable', 'string', 'exists:employment_records,uuid'],
            'category' => ['required', 'in:theft,misconduct,job_abandonment,poor_performance,fraud,property_damage,other'],
            'description' => ['required', 'string', 'min:20', 'max:5000'],
            'evidence' => ['nullable', 'array', 'max:6'],
            'evidence.*' => ['file', 'max:10240'],
        ];
    }
}
