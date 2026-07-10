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

    protected $fillable = [
        'tenant_id', 'ride_id', 'sender_id', 'driver_id', 'type', 'description',
        'item_description', 'item_value',
        'sender_name', 'sender_phone', 'recipient_name', 'recipient_phone',
        'recipient_address', 'recipient_latitude', 'recipient_longitude',
        'pickup_address', 'pickup_lat', 'pickup_lng',
        'dropoff_address', 'dropoff_lat', 'dropoff_lng',
        'pickup_notes', 'delivery_notes', 'package_size', 'package_weight_kg',
        'estimated_value', 'requires_signature', 'is_fragile', 'status',
        'payment_method', 'payment_status', 'fare_amount', 'notes',
        'picked_up_at', 'delivered_at',
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
        ];
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
