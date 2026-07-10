<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class RideStatusHistory extends Model
{
    use HasUuids;

    protected $keyType = 'string';

    public $incrementing = false;

    protected $fillable = [
        'ride_id', 'from_status', 'to_status', 'actor_id', 'reason',
    ];

    public function ride(): BelongsTo
    {
        return $this->belongsTo(Ride::class);
    }

    public function actor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'actor_id');
    }
}
