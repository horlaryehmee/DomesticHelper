<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreDisputeRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'disputable_type' => ['required', 'in:review,report,trust_score_event,identity_verification'],
            'disputable_uuid' => ['required', 'string'],
            'reason' => ['required', 'string', 'max:200'],
            'explanation' => ['required', 'string', 'min:20', 'max:5000'],
            'evidence' => ['nullable', 'array', 'max:6'],
            'evidence.*' => ['file', 'max:10240'],
        ];
    }
}
