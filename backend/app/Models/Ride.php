<?php

namespace App\Models;

use App\Enums\RideStatus;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class Ride extends Model
{
    use HasFactory, HasUuids;

    protected $keyType = 'string';

    public $incrementing = false;

    protected $fillable = [
        'tenant_id', 'rider_id', 'driver_id', 'pickup_latitude', 'pickup_longitude',
        'dropoff_latitude', 'dropoff_longitude', 'pickup_address', 'dropoff_address',
        'status', 'category', 'distance_km', 'duration_minutes',
        'base_fare', 'per_km_fare', 'surge_multiplier', 'total_fare',
        'promo_code_id', 'discount_amount', 'payment_method', 'payment_status',
        'driver_eta', 'started_at', 'completed_at', 'cancelled_at', 'cancelled_by',
        'route_polyline', 'cancellation_reason', 'status_history',
        'cancellation_fee', 'cancelled_by_system', 'rider_en_route_to_pickup',
        'search_radius_km', 'driver_notified_at', 'arrived_at',
        'waiting_started_at', 'no_show_at', 'cancellation_requested_at',
        'cancellation_request_reason', 'estimated_arrival_seconds',
        'pickup_reached_at', 'dropoff_reached_at',
    ];

    private const VALID_TRANSITIONS = [
        'searching'                => ['driver_assigned', 'cancelled'],
        'driver_assigned'          => ['accepted', 'cancelled', 'no_show'],
        'accepted'                 => ['driver_en_route', 'cancelled'],
        'driver_en_route'          => ['arrived', 'cancelled'],
        'arrived'                  => ['waiting_for_rider', 'in_progress', 'cancelled'],
        'waiting_for_rider'        => ['in_progress', 'cancelled', 'no_show'],
        'in_progress'              => ['near_drop_off', 'completed', 'cancelled'],
        'near_drop_off'            => ['completed', 'cancelled'],
        'completed'                => [],
        'cancelled'                => [],
        'cancellation_requested'   => ['cancelled'],
        'no_show'                  => [],
    ];

    protected function casts(): array
    {
        return [
            'status' => RideStatus::class,
            'pickup_latitude' => 'decimal:7',
            'pickup_longitude' => 'decimal:7',
            'dropoff_latitude' => 'decimal:7',
            'dropoff_longitude' => 'decimal:7',
            'distance_km' => 'decimal:3',
            'duration_minutes' => 'decimal:1',
            'base_fare' => 'decimal:2',
            'per_km_fare' => 'decimal:2',
            'surge_multiplier' => 'decimal:2',
            'total_fare' => 'decimal:2',
            'cancellation_fee' => 'decimal:2',
            'driver_eta' => 'integer',
            'search_radius_km' => 'decimal:2',
            'estimated_arrival_seconds' => 'integer',
            'started_at' => 'datetime',
            'completed_at' => 'datetime',
            'cancelled_at' => 'datetime',
            'driver_notified_at' => 'datetime',
            'arrived_at' => 'datetime',
            'waiting_started_at' => 'datetime',
            'no_show_at' => 'datetime',
            'cancellation_requested_at' => 'datetime',
            'pickup_reached_at' => 'datetime',
            'dropoff_reached_at' => 'datetime',
            'status_history' => 'array',
            'rider_en_route_to_pickup' => 'boolean',
            'cancelled_by_system' => 'boolean',
        ];
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function rider(): BelongsTo
    {
        return $this->belongsTo(User::class, 'rider_id');
    }

    public function driver(): BelongsTo
    {
        return $this->belongsTo(User::class, 'driver_id');
    }

    public function payment(): HasOne
    {
        return $this->hasOne(Payment::class);
    }

    public function payments(): HasMany
    {
        return $this->hasMany(Payment::class);
    }

    public function rating(): HasOne
    {
        return $this->hasOne(Rating::class);
    }

    public function delivery(): HasOne
    {
        return $this->hasOne(Delivery::class);
    }

    public function statusHistory(): HasMany
    {
        return $this->hasMany(RideStatusHistory::class);
    }

    public function transitionTo(string $newStatus, ?string $actorId = null, ?string $reason = null): bool
    {
        $currentStatus = $this->status instanceof RideStatus
            ? $this->status->value
            : $this->status;

        if (! isset(self::VALID_TRANSITIONS[$currentStatus])) {
            Log::warning('Ride has no valid transitions from terminal state', [
                'ride_id' => $this->id,
                'current_status' => $currentStatus,
                'attempted' => $newStatus,
            ]);

            return false;
        }

        if (! in_array($newStatus, self::VALID_TRANSITIONS[$currentStatus], true)) {
            Log::warning('Invalid ride status transition', [
                'ride_id' => $this->id,
                'from' => $currentStatus,
                'to' => $newStatus,
                'actor_id' => $actorId,
            ]);

            return false;
        }

        $updateData = ['status' => $newStatus];

        if ($newStatus === 'cancelled') {
            $updateData['cancelled_at'] = now();
            $updateData['cancelled_by'] = $actorId ?? 'system';
            $updateData['cancellation_reason'] = $reason;
        } elseif ($newStatus === 'in_progress') {
            $updateData['started_at'] = now();
        } elseif ($newStatus === 'completed') {
            $updateData['completed_at'] = now();
        } elseif ($newStatus === 'arrived') {
            $updateData['arrived_at'] = now();
        } elseif ($newStatus === 'waiting_for_rider') {
            $updateData['waiting_started_at'] = now();
        } elseif ($newStatus === 'no_show') {
            $updateData['no_show_at'] = now();
        } elseif ($newStatus === 'cancellation_requested') {
            $updateData['cancellation_requested_at'] = now();
            $updateData['cancellation_request_reason'] = $reason;
        }

        DB::transaction(function () use ($updateData, $currentStatus, $newStatus, $actorId, $reason) {
            $this->update($updateData);

            RideStatusHistory::create([
                'ride_id' => $this->id,
                'from_status' => $currentStatus,
                'to_status' => $newStatus,
                'actor_id' => $actorId,
                'reason' => $reason,
            ]);
        });

        return true;
    }

    public function isActive(): bool
    {
        return $this->status instanceof RideStatus
            ? $this->status->isActive()
            : ! in_array($this->status, ['completed', 'cancelled', 'no_show']);
    }

    public function isTerminal(): bool
    {
        return $this->status instanceof RideStatus
            ? $this->status->isTerminal()
            : in_array($this->status, ['completed', 'cancelled', 'no_show']);
    }
}
