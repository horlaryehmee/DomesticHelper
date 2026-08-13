<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Setting;
use App\Services\AuditLogService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminSettingController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json(['data' => Setting::query()->orderBy('group')->orderBy('key')->get()]);
    }

    public function update(Request $request): JsonResponse
    {
        $data = $request->validate([
            'settings' => ['required', 'array'],
            'settings.*.key' => ['required', 'string', 'max:100'],
            'settings.*.value' => ['nullable', 'string'],
            'settings.*.group' => ['nullable', 'string', 'max:50'],
            'settings.*.label' => ['nullable', 'string', 'max:120'],
        ]);

        foreach ($data['settings'] as $item) {
            Setting::setValue($item['key'], $item['value'], $item['group'] ?? 'general', $item['label'] ?? null);
        }

        AuditLogService::log('settings.updated', null, null, ['keys' => collect($data['settings'])->pluck('key')]);

        return response()->json(['data' => Setting::query()->orderBy('group')->orderBy('key')->get()]);
    }
}
