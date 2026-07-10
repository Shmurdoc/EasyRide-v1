<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PoolPassenger extends Model
{
    use HasFactory, HasUuids;

    protected $keyType = 'string';

    public $incrementing = false;

    protected $fillable = [
        'pool_ride_id', 'ride_id', 'user_id', 'fare_share',
        'pickup_order', 'dropoff_order', 'status',
    ];

    protected function casts(): array
    {
        return [
            'fare_share' => 'decimal:2',
            'pickup_order' => 'integer',
            'dropoff_order' => 'integer',
        ];
    }

    public function poolRide(): BelongsTo
    {
        return $this->belongsTo(PoolRide::class, 'pool_ride_id');
    }

    public function ride(): BelongsTo
    {
        return $this->belongsTo(Ride::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
