<?php

namespace App\Services\Search;

use Illuminate\Contracts\Pagination\LengthAwarePaginator;

/**
 * Search engine abstraction so Meilisearch/Elasticsearch can replace the
 * default MySQL implementation without touching controllers.
 */
interface HelperSearchEngine
{
    /**
     * @param  array<string, mixed>  $filters
     */
    public function search(array $filters, string $sort, int $perPage): LengthAwarePaginator;
}
