<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Delivery extends Model
{
    use HasFactory, HasUuids;

    protected $keyType = 'string';

    public $incrementing = false;

    public const VALID_TRANSITIONS = [
        'pending' => ['accepted', 'cancelled', 'failed'],
        'accepted' => ['at_pickup', 'cancelled'],
        'at_pickup' => ['picked_up', 'cancelled'],
        'picked_up' => ['in_transit', 'failed', 'cancelled'],
        'in_transit' => ['at_dropoff', 'failed', 'cancelled'],
        'at_dropoff' => ['delivered', 'failed'],
        'delivered' => [],
        'failed' => [],
        'cancelled' => [],
    ];

    protected $fillable = [
        'tenant_id', 'ride_id', 'sender_id', 'driver_id', 'type', 'description',
        'item_description', 'item_value',
        'sender_name', 'sender_phone', 'recipient_name', 'recipient_phone',
        'recipient_address', 'recipient_latitude', 'recipient_longitude',
        'pickup_address', 'pickup_lat', 'pickup_lng',
        'dropoff_address', 'dropoff_lat', 'dropoff_lng',
        'pickup_notes', 'delivery_notes', 'package_size', 'package_weight_kg',
        'estimated_value', 'requires_signature', 'is_fragile', 'status',
        'payment_method', 'payment_status', 'fare_amount', 'distance_km', 'notes',
        'is_available',
        'picked_up_at', 'delivered_at',
        'accepted_at', 'cancelled_by', 'cancelled_at', 'cancellation_reason',
        'weight_tier', 'pod_photo_url', 'pod_photo_received_at', 'status_history',
    ];

    protected function casts(): array
    {
        return [
            'recipient_latitude' => 'decimal:7',
            'recipient_longitude' => 'decimal:7',
            'pickup_lat' => 'decimal:7',
            'pickup_lng' => 'decimal:7',
            'dropoff_lat' => 'decimal:7',
            'dropoff_lng' => 'decimal:7',
            'item_value' => 'decimal:2',
            'package_weight_kg' => 'decimal:2',
            'estimated_value' => 'decimal:2',
            'fare_amount' => 'decimal:2',
            'distance_km' => 'decimal:2',
            'is_available' => 'boolean',
            'sender_name' => 'encrypted',
            'sender_phone' => 'encrypted',
            'recipient_name' => 'encrypted',
            'recipient_phone' => 'encrypted',
            'recipient_address' => 'encrypted',
            'pickup_address' => 'encrypted',
            'dropoff_address' => 'encrypted',
            'requires_signature' => 'boolean',
            'is_fragile' => 'boolean',
            'picked_up_at' => 'datetime',
            'delivered_at' => 'datetime',
            'accepted_at' => 'datetime',
            'cancelled_at' => 'datetime',
            'pod_photo_received_at' => 'datetime',
            'status_history' => 'array',
        ];
    }

    public function canTransitionTo(string $newStatus): bool
    {
        $current = $this->status;

        return in_array($newStatus, self::VALID_TRANSITIONS[$current] ?? [], true);
    }

    public function transitionTo(string $newStatus, ?string $actorId = null, ?string $reason = null): bool
    {
        if (! $this->canTransitionTo($newStatus)) {
            return false;
        }

        $timestamps = match ($newStatus) {
            'accepted' => ['accepted_at' => now()],
            'picked_up' => ['picked_up_at' => now()],
            'delivered' => ['delivered_at' => now()],
            'cancelled' => ['cancelled_at' => now(), 'cancelled_by' => $actorId, 'cancellation_reason' => $reason],
            default => [],
        };

        $this->update([
            'status' => $newStatus,
            'status_history' => array_merge(
                $this->status_history ?? [],
                [[
                    'status' => $newStatus,
                    'at' => now()->toISOString(),
                    'by' => $actorId,
                    'reason' => $reason,
                ]]
            ),
            ...$timestamps,
        ]);

        return true;
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function ride(): BelongsTo
    {
        return $this->belongsTo(Ride::class);
    }

    public function sender(): BelongsTo
    {
        return $this->belongsTo(User::class, 'sender_id');
    }

    public function driver(): BelongsTo
    {
        return $this->belongsTo(User::class, 'driver_id');
    }
}
