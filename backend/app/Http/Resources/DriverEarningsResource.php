<?php

declare(strict_types=1);

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Stable earnings payload for the driver app.
 *
 * Wraps the normalized array from DriverService::getEarnings(). All money is
 * float in PHP (PG decimals serialize as strings like "51.00" and crash mobile
 * `.toFixed()` calls); on the wire they are always JSON numbers (whole amounts
 * encode as `51`, still a JS number — `.toFixed()`-safe). All counts are int. Missing keys fall back to
 * documented defaults so the shape never drifts.
 *
 * JSON:
 * {
 *   "total_earnings": 0.0, "today_earnings": 0.0, "pending_payout": 0.0,
 *   "total_trips": 0, "rating": 0.0, "rating_count": 0,
 *   "hours_online": 0.0, "period": "today",
 *   "recent_transactions": [
 *     {"id","wallet_id","type","amount":0.0,"balance_after":0.0|null,
 *      "description","created_at": "ISO8601"|null}
 *   ]
 * }
 */
class DriverEarningsResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        /** @var array<string, mixed> $e */
        $e = $this->resource ?? [];
        /** @var array<int, array<string, mixed>> $txs */
        $txs = $e['recent_transactions'] ?? [];

        return [
            'total_earnings' => (float) ($e['total_earnings'] ?? 0),
            'today_earnings' => (float) ($e['today_earnings'] ?? 0),
            'pending_payout' => (float) ($e['pending_payout'] ?? 0),
            'total_trips' => (int) ($e['total_trips'] ?? 0),
            'rating' => (float) ($e['rating'] ?? 0),
            'rating_count' => (int) ($e['rating_count'] ?? 0),
            'hours_online' => (float) ($e['hours_online'] ?? 0),
            'period' => $e['period'] ?? 'today',
            'recent_transactions' => collect($txs)
                ->map(fn (array $tx) => [
                    'id' => $tx['id'] ?? null,
                    'wallet_id' => $tx['wallet_id'] ?? null,
                    'type' => $tx['type'] ?? null,
                    'amount' => (float) ($tx['amount'] ?? 0),
                    'balance_after' => array_key_exists('balance_after', $tx) && $tx['balance_after'] !== null
                        ? (float) $tx['balance_after']
                        : null,
                    'description' => $tx['description'] ?? null,
                    'created_at' => $tx['created_at'] ?? null,
                ])
                ->all(),
        ];
    }
}
