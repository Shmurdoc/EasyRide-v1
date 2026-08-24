<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DriverViolation extends Model
{
    use HasUuids;

    protected $keyType = 'string';

    public $incrementing = false;

    public const STATUS_PENDING = 'pending';

    public const STATUS_PAID = 'paid';

    public const STATUS_WAIVED = 'waived';

    public const STATUS_DISPUTED = 'disputed';

    public const TYPE_CANCEL_AFTER_PICKUP = 'cancel_after_pickup';

    public const TYPE_CANCEL_NEAR_DROPOFF = 'cancel_near_dropoff';

    public const TYPE_COLLUSION_FLAG = 'collusion_flag';

    public const TYPE_FOOD_CANCEL_AFTER_PICKUP = 'food_cancel_after_pickup';

    public const TYPE_FOOD_CANCEL_NEAR_DROPOFF = 'food_cancel_near_dropoff';

    public const TYPE_PARCEL_CANCEL_AFTER_PICKUP = 'parcel_cancel_after_pickup';

    public const TYPE_PARCEL_CANCEL_NEAR_DROPOFF = 'parcel_cancel_near_dropoff';

    public const TYPE_OTHER = 'other';

    protected $fillable = [
        'tenant_id', 'driver_id', 'rider_id', 'ride_id', 'food_order_id', 'delivery_id',
        'violation_type', 'fine_amount', 'status', 'distance_to_dropoff_km',
        'reason', 'evidence', 'decided_by', 'decided_at',
    ];

    protected function casts(): array
    {
        return [
            'fine_amount' => 'decimal:2',
            'distance_to_dropoff_km' => 'decimal:2',
            'evidence' => 'array',
            'decided_at' => 'datetime',
        ];
    }

    public function driver(): BelongsTo
    {
        return $this->belongsTo(User::class, 'driver_id');
    }

    public function rider(): BelongsTo
    {
        return $this->belongsTo(User::class, 'rider_id');
    }

    public function ride(): BelongsTo
    {
        return $this->belongsTo(Ride::class);
    }

    public function foodOrder(): BelongsTo
    {
        return $this->belongsTo(FoodOrder::class);
    }

    public function delivery(): BelongsTo
    {
        return $this->belongsTo(Delivery::class);
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }
}