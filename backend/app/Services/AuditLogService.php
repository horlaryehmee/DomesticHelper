<?php

namespace App\Services;

use App\Models\AuditLog;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Auth;

class AuditLogService
{
    /**
     * Record a sensitive action in the central audit trail.
     */
    public static function log(
        string $action,
        Model|string|null $entity = null,
        ?array $oldValues = null,
        ?array $newValues = null,
    ): AuditLog {
        $entityType = null;
        $entityId = null;

        if ($entity instanceof Model) {
            $entityType = $entity->getMorphClass();
            $entityId = (string) ($entity->getKey() ?? $entity->uuid ?? null);
        } elseif (is_string($entity)) {
            $entityType = $entity;
        }

        return AuditLog::create([
            'user_id' => Auth::id(),
            'action' => $action,
            'entity_type' => $entityType,
            'entity_id' => $entityId,
            'old_values' => $oldValues,
            'new_values' => $newValues,
            'ip_address' => request()->ip(),
            'user_agent' => (string) request()->userAgent(),
        ]);
    }
}
