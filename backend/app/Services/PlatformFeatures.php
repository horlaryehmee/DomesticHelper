<?php

namespace App\Services;

use App\Models\Setting;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class PlatformFeatures
{
    private ?array $snapshot = null;

    public function configured(): array
    {
        if ($this->snapshot !== null) {
            return $this->snapshot;
        }
        $saved = json_decode(Setting::getValue('platform_feature_switches', '{}'), true) ?: [];

        return $this->snapshot = array_map(fn ($key) => (bool) ($saved[$key] ?? config('features.default_enabled', false)), array_combine(array_keys(config('features.modules')), array_keys(config('features.modules'))));
    }

    public function enabled(string $key): bool
    {
        $values = $this->configured();
        $module = config('features.modules.'.$key);
        if (! $module || ! ($values[$key] ?? false)) {
            return false;
        }
        foreach ($module['requires'] as $required) {
            if (! $this->enabled($required)) {
                return false;
            }
        }

        return true;
    }

    public function publicSettings(): array
    {
        $enabled = [];
        $paths = [];
        foreach (config('features.modules') as $key => $module) {
            $enabled[$key] = $this->enabled($key);
            $paths[$key] = $module['paths'];
        }

        return ['enabled' => $enabled, 'paths' => $paths];
    }

    public function adminSettings(): array
    {
        return ['enabled' => $this->configured(), 'modules' => collect(config('features.modules'))->map(fn ($module, $key) => ['key' => $key, 'label' => $module['label'], 'description' => $module['description'], 'requires' => $module['requires']])->values()];
    }

    public function save(array $values): void
    {
        $keys = array_keys(config('features.modules'));
        if (array_diff(array_keys($values), $keys) || array_diff($keys, array_keys($values))) {
            throw ValidationException::withMessages(['features' => 'Submit all recognised feature switches.']);
        }
        foreach (config('features.modules') as $key => $module) {
            if ($values[$key]) {
                foreach ($module['requires'] as $required) {
                    if (! $values[$required]) {
                        throw ValidationException::withMessages(['features' => "{$module['label']} requires ".config('features.modules.'.$required.'.label').'.']);
                    }
                }
            }
        }
        Setting::setValue('platform_feature_switches', json_encode($values), 'features');
        $this->snapshot = null;
    }

    public function requirements(string $path, bool $api = true): array
    {
        // Verification stays available even when public helper profiles are off.
        if ($api && (Str::is('/helpers/me/verifications*', $path) || Str::is('/payments/webhook/*', $path))) {
            return [];
        }
        $required = [];
        foreach (config('features.modules') as $key => $module) {
            if ($api && $key === 'helper_directory' && (Str::is('/helpers/applications*', $path) || Str::is('/helpers/saved-jobs*', $path))) {
                continue;
            }
            foreach ($module[$api ? 'api_paths' : 'paths'] as $pattern) {
                if (Str::is($pattern, $path)) {
                    $required[] = $key;
                    break;
                }
            }
        }

        // Reading job details can remain live without accepting applications.
        return $required;
    }

    public function allows(string $path, bool $api = true): bool
    {
        foreach ($this->requirements($path, $api) as $key) {
            if (! $this->enabled($key)) {
                return false;
            }
        }

return true;
    }
}
