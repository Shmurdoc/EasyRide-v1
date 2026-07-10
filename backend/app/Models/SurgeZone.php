<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SurgeZone extends Model
{
    use HasUuids;

    protected $keyType = 'string';

    public $incrementing = false;

    protected $fillable = [
        'tenant_id',
        'name',
        'center_lat',
        'center_lng',
        'radius_meters',
        'multiplier',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'center_lat' => 'decimal:7',
            'center_lng' => 'decimal:7',
            'radius_meters' => 'integer',
            'multiplier' => 'decimal:2',
            'is_active' => 'boolean',
        ];
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function scopeActive(Builder $query): Builder
    {
        return $query->where('is_active', true);
    }
}
