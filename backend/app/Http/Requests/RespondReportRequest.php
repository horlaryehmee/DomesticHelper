<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class RespondReportRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'response' => ['required', 'string', 'min:10', 'max:5000'],
        ];
    }
}
