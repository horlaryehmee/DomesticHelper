<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class PurchaseVerificationReportRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'helper_uuid' => ['required', 'string', 'exists:users,uuid'],
            'provider' => ['nullable', 'in:paystack,flutterwave,sandbox'],
        ];
    }
}
