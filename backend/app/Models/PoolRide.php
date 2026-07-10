<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class PoolRide extends Model
{
    use HasFactory, HasUuids;

    protected $keyType = 'string';

    public $incrementing = false;

    protected $fillable = [
        'ride_id', 'driver_id', 'status', 'max_passengers',
        'current_passengers', 'total_fare', 'route_polyline',
    ];

    protected function casts(): array
    {
        return [
            'total_fare' => 'decimal:2',
            'max_passengers' => 'integer',
            'current_passengers' => 'integer',
            'route_polyline' => 'array',
        ];
    }

    public function ride(): BelongsTo
    {
        return $this->belongsTo(Ride::class);
    }

    public function driver(): BelongsTo
    {
        return $this->belongsTo(User::class, 'driver_id');
    }

    public function passengers(): HasMany
    {
        return $this->hasMany(PoolPassenger::class, 'pool_ride_id');
    }

    public function hasCapacity(): bool
    {
        return $this->current_passengers < $this->max_passengers;
    }
}
