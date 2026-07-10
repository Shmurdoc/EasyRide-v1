<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DriverProfile extends Model
{
    use HasUuids;

    protected $keyType = 'string';

    public $incrementing = false;

    protected $fillable = [
        'user_id', 'license_number', 'license_expiry', 'id_number',
        'date_of_birth', 'emergency_contact_name', 'emergency_contact_phone',
        'is_verified', 'is_approved', 'approved_by', 'approved_at',
        'total_trips', 'total_earnings', 'rating_sum', 'rating_count',
    ];

    protected function casts(): array
    {
        return [
            'license_expiry' => 'date',
            'date_of_birth' => 'encrypted',
            'is_verified' => 'boolean',
            'is_approved' => 'boolean',
            'approved_at' => 'datetime',
            'total_earnings' => 'decimal:2',
            'id_number' => 'encrypted',
            'license_number' => 'encrypted',
            'emergency_contact_name' => 'encrypted',
            'emergency_contact_phone' => 'encrypted',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function getAverageRatingAttribute(): float
    {
        return $this->rating_count > 0
            ? round($this->rating_sum / $this->rating_count, 1)
            : 0.0;
    }
}
