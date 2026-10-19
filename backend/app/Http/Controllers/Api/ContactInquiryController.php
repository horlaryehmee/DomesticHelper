<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\SmtpConfiguration;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Illuminate\Validation\Rule;

class ContactInquiryController extends Controller
{
    public function store(Request $request, SmtpConfiguration $smtp): JsonResponse
    {
        $data = $request->validate([
            'audience' => ['required', Rule::in(['employer', 'helper', 'visitor', 'business'])],
            'topic' => ['required', Rule::in(['hiring', 'jobs', 'account', 'verification', 'payment', 'safety', 'privacy', 'partnership', 'other'])],
            'name' => ['required', 'string', 'min:2', 'max:120'],
            'email' => ['required', 'email', 'max:255'],
            'phone' => ['nullable', 'string', 'max:30'],
            'subject' => ['required', 'string', 'min:3', 'max:160'],
            'message' => ['required', 'string', 'min:15', 'max:5000'],
            'website' => ['nullable', 'max:0'],
        ]);

        unset($data['website']);
        $data['status'] = 'new';
        $id = DB::table('contact_inquiries')->insertGetId($data + [
            'created_at' => now(), 'updated_at' => now(),
        ]);

        if ($smtp->publicSettings()['enabled']) {
            try {
                $smtp->apply();
                Mail::purge('smtp');
                Mail::raw("New Hire Safe contact inquiry HS-{$id}\n\nFrom: {$data['name']} <{$data['email']}>\nTopic: {$data['topic']}\nSubject: {$data['subject']}\n\n{$data['message']}", fn ($mail) => $mail
                    ->to('info@hiresafe.ng')
                    ->replyTo($data['email'], $data['name'])
                    ->subject("Hire Safe contact inquiry HS-{$id}"));
            } catch (\Throwable $error) {
                report($error);
            }
        }

        return response()->json(['message' => 'Your message has been received.', 'reference' => 'HS-'.$id], 201);
    }

    public function index(): JsonResponse
    {
        return response()->json(['data' => DB::table('contact_inquiries')->orderByDesc('created_at')->paginate(25)]);
    }

    public function update(Request $request, int $inquiry): JsonResponse
    {
        $data = $request->validate(['status' => ['required', Rule::in(['new', 'in_progress', 'resolved'])]]);
        abort_unless(DB::table('contact_inquiries')->where('id', $inquiry)->update($data + ['updated_at' => now()]), 404);

        return response()->json(['message' => 'Inquiry updated.']);
    }
}
