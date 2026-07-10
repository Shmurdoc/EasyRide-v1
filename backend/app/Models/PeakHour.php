<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PeakHour extends Model
{
    use HasUuids;

    protected $keyType = 'string';

    public $incrementing = false;

    protected $fillable = [
        'tenant_id',
        'name',
        'day_of_week',
        'start_time',
        'end_time',
        'multiplier',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'day_of_week' => 'integer',
            'start_time' => 'datetime:H:i',
            'end_time' => 'datetime:H:i',
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

    public function scopeForDay(Builder $query, int $dayOfWeek): Builder
    {
        return $query->where('day_of_week', $dayOfWeek);
    }
}
