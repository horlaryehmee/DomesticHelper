<?php

namespace App\Services;

use App\Models\Evidence;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class EvidenceService
{
    private const ALLOWED_MIME = [
        'image/jpeg' => ['jpg', 'jpeg'],
        'image/png' => ['png'],
        'image/webp' => ['webp'],
        'application/pdf' => ['pdf'],
        'text/plain' => ['txt'],
        'application/msword' => ['doc'],
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document' => ['docx'],
    ];

    private const MAX_SIZE_KB = 10240; // 10 MB

    public function store(UploadedFile $file, object $evidenceable, User $uploader): Evidence
    {
        $this->validate($file);

        $uuid = (string) Str::uuid();
        $path = $file->storeAs("evidence/{$uuid}", $file->getClientOriginalName(), 'private');

        return Evidence::create([
            'uuid' => $uuid,
            'evidenceable_type' => $evidenceable->getMorphClass(),
            'evidenceable_id' => $evidenceable->getKey(),
            'uploader_id' => $uploader->id,
            'original_name' => $file->getClientOriginalName(),
            'path' => $path,
            'mime_type' => $file->getMimeType(),
            'size' => $file->getSize(),
            'sha256' => hash_file('sha256', $file->getRealPath()),
        ]);
    }

    private function validate(UploadedFile $file): void
    {
        $mime = strtolower((string) $file->getMimeType());

        if (! array_key_exists($mime, self::ALLOWED_MIME)) {
            throw ValidationException::withMessages(['file' => 'This file type is not allowed.']);
        }

        if (! in_array(strtolower($file->getClientOriginalExtension()), self::ALLOWED_MIME[$mime], true)) {
            throw ValidationException::withMessages(['file' => 'File extension does not match its content.']);
        }

        if ($file->getSize() / 1024 > self::MAX_SIZE_KB) {
            throw ValidationException::withMessages(['file' => 'File is too large. Maximum size is 10MB.']);
        }
    }

    /**
     * Stream an evidence file from the private disk. Authorization happens
     * upstream in the controller/policy — this never returns public URLs.
     */
    public function stream(Evidence $evidence)
    {
        abort_unless(Storage::disk('private')->exists($evidence->path), 404);

        return Storage::disk('private')->download($evidence->path, $evidence->original_name);
    }
}
