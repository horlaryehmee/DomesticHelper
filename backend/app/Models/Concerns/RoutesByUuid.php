<?php

namespace App\Models\Concerns;

trait RoutesByUuid
{
    /**
     * Public API routes bind these models by uuid — sequential IDs are
     * never exposed in URLs.
     */
    public function getRouteKeyName(): string
    {
        return 'uuid';
    }
}
