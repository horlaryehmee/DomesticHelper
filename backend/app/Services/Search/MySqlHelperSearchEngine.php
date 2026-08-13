<?php

namespace App\Services\Search;

use App\Enums\UserStatus;
use App\Enums\UserType;
use App\Models\User;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\DB;

/**
 * MySQL-backed helper search. Uses indexes on users/helper_profiles and
 * aggregate subqueries for rating. All inputs are parameterized.
 */
class MySqlHelperSearchEngine implements HelperSearchEngine
{
    public function search(array $filters, string $sort, int $perPage): LengthAwarePaginator
    {
        $query = User::query()
            ->where('user_type', UserType::Helper)
            ->where('status', UserStatus::Active)
            ->whereHas('helperProfile', fn ($q) => $q->where('is_public', true))
            ->with(['helperProfile.skills', 'helperProfile.trustScore'])
            ->withAvg(['reviewsReceived' => fn ($q) => $q->where('status', 'approved')], 'rating')
            ->withCount(['reviewsReceived as reviews_count' => fn ($q) => $q->where('status', 'approved')]);

        $this->applyTextFilter($query, $filters['q'] ?? null);
        $this->applyFilters($query, $filters);
        $this->applySort($query, $sort);

        return $query->paginate($perPage);
    }

    private function applyTextFilter(Builder $query, ?string $q): void
    {
        if (! $q) {
            return;
        }

        // Natural-language query support: strip filler words, then match any
        // remaining token against name / bio / location / skills.
        $stopwords = ['with', 'in', 'for', 'a', 'an', 'the', 'of', 'and', 'or', 'to', 'who',
            'has', 'have', 'is', 'are', 'that', 'this', 'i', 'need', 'looking', 'want', 'clean', 'record'];
        $tokens = collect(preg_split('/\s+/', mb_strtolower(trim($q))) ?: [])
            ->filter(fn ($t) => $t !== '' && ! in_array($t, $stopwords, true))
            ->values();

        if ($tokens->isEmpty()) {
            return;
        }

        $query->where(function (Builder $b) use ($tokens) {
            foreach ($tokens as $token) {
                $b->orWhere(function (Builder $inner) use ($token) {
                    // Stem prefix for skill matching: "driver" -> "Driving",
                    // "cleaner" -> "Cleaning", "nannies" -> "Nanny".
                    $prefix = mb_substr($token, 0, 4);
                    $inner->whereRaw('LOWER(CONCAT(first_name, " ", last_name)) LIKE ?', ['%'.$token.'%'])
                        ->orWhereHas('helperProfile', function ($p) use ($token, $prefix) {
                            $p->whereRaw('LOWER(bio) LIKE ?', ['%'.$token.'%'])
                                ->orWhereRaw('LOWER(state) LIKE ?', ['%'.$token.'%'])
                                ->orWhereRaw('LOWER(city) LIKE ?', ['%'.$token.'%'])
                                ->orWhereHas('skills', fn ($s) => $s
                                    ->whereRaw('LOWER(skills.name) LIKE ?', ['%'.$token.'%'])
                                    ->orWhereRaw('LOWER(skills.name) LIKE ?', [$prefix.'%']));
                        });
                });
            }
        });
    }

    private function applyFilters(Builder $query, array $f): void
    {
        $query->whereHas('helperProfile', function (Builder $p) use ($f) {
            if (! empty($f['state'])) {
                $p->where('state', $f['state']);
            }
            if (! empty($f['city'])) {
                $p->where('city', $f['city']);
            }
            if (! empty($f['gender'])) {
                $p->where('gender', $f['gender']);
            }
            if (isset($f['min_experience']) && $f['min_experience'] !== '') {
                $p->where('years_experience', '>=', (int) $f['min_experience']);
            }
            if (! empty($f['availability'])) {
                $p->whereIn('availability', (array) $f['availability']);
            }
            if (! empty($f['employment_type'])) {
                $p->whereIn('employment_type', (array) $f['employment_type']);
            }
            if (isset($f['salary_min']) && $f['salary_min'] !== '') {
                $p->where('expected_salary_max', '>=', (int) $f['salary_min']);
            }
            if (isset($f['salary_max']) && $f['salary_max'] !== '') {
                $p->where('expected_salary_min', '<=', (int) $f['salary_max']);
            }
            if (! empty($f['verification'])) {
                $p->where('verification_status', $f['verification']);
            }
            if (! empty($f['skills']) && is_array($f['skills'])) {
                $p->whereHas('skills', fn ($s) => $s->whereIn('skills.id', array_map('intval', $f['skills'])));
            }
            if (isset($f['trust_min']) && $f['trust_min'] !== '') {
                $p->whereHas('trustScore', fn ($t) => $t->where('score', '>=', (int) $f['trust_min']));
            }
            if (isset($f['trust_max']) && $f['trust_max'] !== '') {
                $p->whereHas('trustScore', fn ($t) => $t->where('score', '<=', (int) $f['trust_max']));
            }
        });
    }

    private function applySort(Builder $query, string $sort): void
    {
        switch ($sort) {
            case 'experience':
                $query->orderByRaw('(SELECT years_experience FROM helper_profiles WHERE helper_profiles.user_id = users.id LIMIT 1) DESC');
                break;
            case 'rating':
                $query->orderByDesc('reviews_received_avg_rating');
                break;
            case 'recently_active':
                $query->orderByDesc('users.last_active_at');
                break;
            case 'trust_score':
                $query->leftJoin('trust_scores', 'trust_scores.helper_id', '=', 'users.id')
                    ->select('users.*')
                    ->orderByDesc('trust_scores.score');
                break;
            default: // relevance / default: trust-first with active-recency tiebreak
                $query->leftJoin('trust_scores', 'trust_scores.helper_id', '=', 'users.id')
                    ->select('users.*')
                    ->orderByDesc('trust_scores.score')
                    ->orderByDesc('users.last_active_at');
        }
    }
}
