<?php

namespace App\Http\Controllers\Api\Auth;

use App\Http\Controllers\Controller;
use App\Http\Resources\UserResource;
use App\Services\EmailVerificationService;
use Illuminate\Http\Request;

class EmailVerificationController extends Controller
{
    public function send(Request $request, EmailVerificationService $verification)
    {
        $verification->send($request->user());

        return response()->json(['message' => 'A verification code has been sent to your email.']);
    }

    public function verify(Request $request, EmailVerificationService $verification)
    {
        $data = $request->validate(['code' => ['required', 'string', 'regex:/^[0-9]{6}$/']]);
        $verification->verify($request->user(), $data['code']);

        return response()->json(['user' => new UserResource($request->user()->fresh()), 'message' => 'Email verified.']);
    }
}
