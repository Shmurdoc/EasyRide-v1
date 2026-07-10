<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Payment extends Model
{
    use HasFactory, HasUuids;

    protected $keyType = 'string';

    public $incrementing = false;

    const STATUS_PENDING = 'pending';

    const STATUS_COMPLETED = 'completed';

    const STATUS_FAILED = 'failed';

    const STATUS_REFUNDED = 'refunded';

    const STATUS_PAID = 'paid';

    const STATUS_ESCROW_HELD = 'escrow_held';

    protected $fillable = [
        'ride_id', 'payer_id', 'payee_id', 'method', 'gateway', 'gateway_reference',
        'amount', 'platform_fee', 'driver_payout', 'status', 'paid_at', 'gateway_response',
        'refunded_at', 'refund_reason', 'refund_amount', 'refunded_by',
        'escrow_released', 'escrow_released_at', 'dispute_hold', 'dispute_hold_shortfall',
        'held_until', 'idempotency_key',
        'cash_received', 'cash_discrepancy', 'cash_settled_at', 'cash_reconciled',
    ];

    protected function casts(): array
    {
        return [
            'amount' => 'decimal:2',
            'platform_fee' => 'decimal:2',
            'driver_payout' => 'decimal:2',
            'refund_amount' => 'decimal:2',
            'dispute_hold_shortfall' => 'decimal:2',
            'cash_received' => 'decimal:2',
            'cash_discrepancy' => 'decimal:2',
            'paid_at' => 'datetime',
            'refunded_at' => 'datetime',
            'escrow_released_at' => 'datetime',
            'cash_settled_at' => 'datetime',
            'escrow_released' => 'boolean',
            'dispute_hold' => 'boolean',
            'cash_reconciled' => 'boolean',
            'gateway_response' => 'array',
        ];
    }

    public function ride(): BelongsTo
    {
        return $this->belongsTo(Ride::class);
    }

    public function payer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'payer_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'payer_id');
    }

    public function payee(): BelongsTo
    {
        return $this->belongsTo(User::class, 'payee_id');
    }

    public function dispute(): HasOne
    {
        return $this->hasOne(Dispute::class);
    }
}
