<?php

namespace App\Services\Search;

use App\Services\Search\HelperSearchEngine;
use App\Services\Search\MySqlHelperSearchEngine;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

class HelperSearchService
{
    public function __construct(
        private readonly ?HelperSearchEngine $engine = null,
    ) {
    }

    private function engine(): HelperSearchEngine
    {
        // Swap for Meilisearch/Elasticsearch later by binding the interface.
        return $this->engine ?? app(HelperSearchEngine::class);
    }

    public function search(array $filters, string $sort = 'relevance', int $perPage = 12): LengthAwarePaginator
    {
        return $this->engine()->search($filters, $sort, $perPage);
    }
}
