<?php

namespace App\Models;

use App\Traits\EncryptsPii;
use App\Traits\HasTotp;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;
use Spatie\Permission\Traits\HasRoles;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, HasRoles, HasTotp, HasUuids, Notifiable, SoftDeletes, EncryptsPii;

    protected $keyType = 'string';

    public $incrementing = false;

    protected $fillable = [
        'tenant_id', 'name', 'email', 'password', 'phone_number',
        'role', 'is_active', 'is_online', 'is_approved', 'is_kyc_verified',
        'email_verified_at', 'kyc_verified_at', 'anonymized_at',
        'current_latitude', 'current_longitude',
        'last_location_update', 'current_ride_id',
    ];

    protected $hidden = [
        'password', 'remember_token', 'totp_secret',
    ];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'kyc_verified_at' => 'datetime',
            'anonymized_at' => 'datetime',
            'deleted_at' => 'datetime',
            'password' => 'hashed',
            'is_active' => 'boolean',
            'is_online' => 'boolean',
            'is_approved' => 'boolean',
            'is_kyc_verified' => 'boolean',
            'totp_enabled' => 'boolean',
            'current_latitude' => 'decimal:7',
            'current_longitude' => 'decimal:7',
            'last_location_update' => 'datetime',
        ];
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function driverProfile(): HasOne
    {
        return $this->hasOne(DriverProfile::class);
    }

    public function vehicle(): HasOne
    {
        return $this->hasOne(Vehicle::class);
    }

    public function ridesAsRider(): HasMany
    {
        return $this->hasMany(Ride::class, 'rider_id');
    }

    public function ridesAsDriver(): HasMany
    {
        return $this->hasMany(Ride::class, 'driver_id');
    }

    public function rides(): HasMany
    {
        return $this->hasMany(Ride::class);
    }

    public function wallet(): HasOne
    {
        return $this->hasOne(Wallet::class);
    }

    public function payments(): HasMany
    {
        return $this->hasMany(Payment::class, 'payer_id');
    }

    public function consentRecords(): HasMany
    {
        return $this->hasMany(ConsentRecord::class);
    }

    public function kycVerifications(): HasMany
    {
        return $this->hasMany(KycVerification::class);
    }

    public function pushTokens(): HasMany
    {
        return $this->hasMany(PushToken::class);
    }

    public function activePushTokens(): HasMany
    {
        return $this->hasMany(PushToken::class)->where('is_active', true);
    }
}
