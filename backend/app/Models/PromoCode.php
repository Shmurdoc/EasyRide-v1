<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PromoCode extends Model
{
    use HasFactory, HasUuids;

    protected $keyType = 'string';

    public $incrementing = false;

    protected $fillable = [
        'tenant_id', 'code', 'type', 'value', 'min_ride_amount', 'max_discount',
        'max_uses', 'used_count', 'max_uses_per_user', 'starts_at', 'expires_at', 'is_active',
    ];

    protected function casts(): array
    {
        return [
            'value' => 'decimal:2',
            'min_ride_amount' => 'decimal:2',
            'max_discount' => 'decimal:2',
            'starts_at' => 'datetime',
            'expires_at' => 'datetime',
            'is_active' => 'boolean',
        ];
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }
}
