<?php

namespace App\Services;

use App\Enums\TrustCategory;
use App\Models\TrustScore;
use App\Models\TrustScoreEvent;
use App\Models\TrustScoreRule;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * Centralized trust score engine.
 *
 * The score is ALWAYS computed from immutable, auditable TrustScoreEvents
 * against the active TrustScoreRules — never from direct writes, and never
 * from employer input. Base score is 50 (neutral); verified events add or
 * subtract points; the result is clamped to 0–100.
 */
class TrustScoreService
{
    public const BASE_SCORE = 50;

    /**
     * Record a verified trust score event and recompute the helper's score.
     * Points are resolved from the active rule matching $eventType unless
     * $points is provided explicitly (manual admin adjustments only).
     */
    public function recordEvent(
        User $helper,
        string $eventType,
        ?int $points = null,
        ?Model $source = null,
        ?string $note = null,
        ?User $createdBy = null,
    ): TrustScoreEvent {
        return DB::transaction(function () use ($helper, $eventType, $points, $source, $note, $createdBy) {
            $rule = null;

            if ($points === null) {
                $rule = TrustScoreRule::query()
                    ->where('event_type', $eventType)
                    ->where('active', true)
                    ->first();

                abort_unless($rule, 422, "No active trust score rule for event type [{$eventType}].");
                $points = $rule->points;
            }

            $event = TrustScoreEvent::create([
                'helper_id' => $helper->id,
                'rule_id' => $rule?->id,
                'event_type' => $eventType,
                'points' => $points,
                'source_type' => $source ? $source->getMorphClass() : null,
                'source_id' => $source ? $source->getKey() : null,
                'note' => $note,
                'created_by' => $createdBy?->id,
            ]);

            $this->recalculate($helper);

            AuditLogService::log('trust_score.event_created', $event, null, [
                'event_type' => $eventType,
                'points' => $points,
                'source' => $source ? $source->getMorphClass().'#'.$source->getKey() : null,
            ]);

            Log::info('Trust score event recorded', [
                'helper_id' => $helper->id,
                'event_type' => $eventType,
                'points' => $points,
            ]);

            return $event;
        });
    }

    /**
     * Recompute a helper's trust score from their event history.
     */
    public function recalculate(User $helper): TrustScore
    {
        // Points come from the CURRENT active rule configuration (manual
        // events without a rule keep their stored points). Changing a rule
        // in the admin panel therefore re-scores existing events.
        $total = (int) TrustScoreEvent::query()
            ->where('trust_score_events.helper_id', $helper->id)
            ->leftJoin('trust_score_rules', 'trust_score_rules.id', '=', 'trust_score_events.rule_id')
            ->where(function ($q) {
                $q->whereNull('trust_score_events.rule_id')
                    ->orWhere('trust_score_rules.active', true);
            })
            ->sum(DB::raw('COALESCE(trust_score_rules.points, trust_score_events.points)'));

        $eventsCount = TrustScoreEvent::query()->where('helper_id', $helper->id)->count();
        $score = (int) min(100, max(0, self::BASE_SCORE + $total));

        $trustScore = TrustScore::query()->firstOrNew(['helper_id' => $helper->id]);
        $old = ['score' => $trustScore->score, 'category' => $trustScore->category?->value];
        $new = ['score' => $score, 'category' => TrustCategory::fromScore($score)->value];

        $trustScore->forceFill([
            'score' => $score,
            'category' => TrustCategory::fromScore($score),
            'events_count' => $eventsCount,
            'calculated_at' => now(),
        ])->save();

        if ($old['score'] !== $new['score'] || $old['category'] !== $new['category']) {
            AuditLogService::log('trust_score.recalculated', $helper, $old, $new);
        }

        return $trustScore;
    }

    /**
     * Recalculate every helper's score (after admin changes a rule).
     */
    public function recalculateAll(): int
    {
        $count = 0;
        User::query()->where('user_type', 'helper')->chunkById(100, function ($helpers) use (&$count) {
            foreach ($helpers as $helper) {
                $this->recalculate($helper);
                $count++;
            }
        });
        return $count;
    }

    /**
     * Reverse a previous trust score event (used when a dispute is upheld).
     */
    public function reverseEvent(TrustScoreEvent $event, ?User $admin, string $reason): TrustScoreEvent
    {
        return $this->recordEvent(
            $event->helper,
            'manual_reversal',
            -$event->points,
            $event,
            "Reversal: {$reason}",
            $admin,
        );
    }
}
