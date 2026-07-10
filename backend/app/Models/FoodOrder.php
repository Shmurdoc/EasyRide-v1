<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class FoodOrder extends Model
{
    use HasFactory, HasUuids;

    protected $keyType = 'string';

    public $incrementing = false;

    protected $fillable = [
        'tenant_id', 'restaurant_id', 'customer_id', 'driver_id',
        'delivery_id', 'status', 'subtotal', 'delivery_fee',
        'service_fee', 'tip_amount', 'total_amount',
        'delivery_address', 'delivery_latitude', 'delivery_longitude',
        'delivery_notes', 'estimated_delivery_at', 'actual_delivery_at',
        'cancelled_at', 'cancelled_by', 'cancellation_reason',
        'payment_method', 'payment_status', 'payment_id',
        'rating', 'rating_comment',
    ];

    protected function casts(): array
    {
        return [
            'delivery_latitude' => 'decimal:7',
            'delivery_longitude' => 'decimal:7',
            'delivery_address' => 'encrypted',
            'subtotal' => 'decimal:2',
            'delivery_fee' => 'decimal:2',
            'service_fee' => 'decimal:2',
            'tip_amount' => 'decimal:2',
            'total_amount' => 'decimal:2',
            'estimated_delivery_at' => 'datetime',
            'actual_delivery_at' => 'datetime',
            'cancelled_at' => 'datetime',
            'rating' => 'integer',
        ];
    }

    public function restaurant(): BelongsTo
    {
        return $this->belongsTo(Restaurant::class);
    }

    public function customer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'customer_id');
    }

    public function driver(): BelongsTo
    {
        return $this->belongsTo(User::class, 'driver_id');
    }

    public function delivery(): BelongsTo
    {
        return $this->belongsTo(Delivery::class);
    }

    public function payment(): HasOne
    {
        return $this->hasOne(Payment::class, 'ride_id');
    }

    public function items(): HasMany
    {
        return $this->hasMany(FoodOrderItem::class);
    }
}
