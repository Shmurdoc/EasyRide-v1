<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\DriverProfile;
use App\Models\KycVerification;
use App\Models\Rating;
use App\Models\Ride;
use App\Models\User;
use App\Models\Vehicle;
use App\Models\WalletTransaction;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Redis;

class DriverService
{
    private const LOCATION_REDIS_TTL = 300;

    private const LOCATION_UPDATE_DB_INTERVAL = 5;

    public function __construct(
        private readonly WalletService $walletService,
    ) {}

    public function registerDriver(User $user, array $data): DriverProfile
    {
        return DB::transaction(function () use ($user, $data) {
            if ($user->driverProfile()->exists()) {
                throw new \RuntimeException('User already has a driver profile.');
            }

            $profile = DriverProfile::create([
                'user_id' => $user->id,
                'license_number' => $data['license_number'],
                'license_expiry' => $data['license_expiry'],
                'id_number' => $data['id_number'],
                'date_of_birth' => $data['date_of_birth'],
                'emergency_contact_name' => $data['emergency_contact_name'] ?? null,
                'emergency_contact_phone' => $data['emergency_contact_phone'] ?? null,
                'is_verified' => false,
                'is_approved' => false,
            ]);

            if (isset($data['vehicle'])) {
                $user->vehicle()->create([
                    'user_id' => $user->id,
                    'make' => $data['vehicle']['make'],
                    'model' => $data['vehicle']['model'],
                    'year' => $data['vehicle']['year'],
                    'color' => $data['vehicle']['color'] ?? null,
                    'license_plate' => $data['vehicle']['license_plate'],
                    'category' => $data['vehicle']['category'] ?? 'standard',
                ]);
            }

            if (isset($data['phone_number'])) {
                $user->update(['phone_number' => $data['phone_number']]);
            }

            Log::info('Driver registered', [
                'user_id' => $user->id,
                'profile_id' => $profile->id,
            ]);

            return $profile->fresh(['user', 'user.vehicle']);
        });
    }

    public function listDrivers(string $tenantId, array $filters = [], int $perPage = 15): LengthAwarePaginator
    {
        return User::role('driver')
            ->where('tenant_id', $tenantId)
            ->when($filters['is_online'] ?? null, fn ($q, $v) => $q->where('is_online', filter_var($v, FILTER_VALIDATE_BOOLEAN)))
            ->when($filters['is_approved'] ?? null, fn ($q, $v) => $q->whereHas('driverProfile', fn ($qp) => $qp->where('is_approved', filter_var($v, FILTER_VALIDATE_BOOLEAN))))
            ->when($filters['search'] ?? null, fn ($q, $v) => $q->where(function ($qq) use ($v) {
                $qq->where('name', 'like', "%{$v}%");
            }))
            ->with(['driverProfile', 'vehicle'])
            ->paginate($perPage);
    }

    public function getDriver(string $driverId, User $requestUser): ?User
    {
        $driver = User::find($driverId);

        if (! $driver) {
            return null;
        }

        if ($driver->tenant_id !== $requestUser->tenant_id && ! $requestUser->hasAnyRole(['admin', 'super-admin'])) {
            return null;
        }

        $driver->load(['driverProfile', 'vehicle', 'tenant']);

        return $driver;
    }

    public function updateDriverProfile(User $user, array $data): DriverProfile
    {
        $profile = $user->driverProfile()->firstOrNew(['user_id' => $user->id]);
        $profile->fill($data);
        $profile->save();

        if (isset($data['make'], $data['model'], $data['year'], $data['license_plate'])) {
            $user->vehicle()->updateOrCreate(
                ['user_id' => $user->id],
                collect($data)->only(['make', 'model', 'year', 'color', 'license_plate', 'category'])->toArray(),
            );
        }

        if (isset($data['phone_number'])) {
            $user->update(['phone_number' => $data['phone_number']]);
        }

        $profile->load('user.vehicle');

        return $profile;
    }

    public function registerVehicle(User $user, array $data): Vehicle
    {
        return $user->vehicle()->updateOrCreate(
            ['user_id' => $user->id],
            $data,
        );
    }

    public function toggleOnline(User $driver, bool $isOnline, array $locationData = []): array
    {
        $profile = $driver->driverProfile;

        if ($profile && ! $profile->is_approved) {
            throw new \RuntimeException(
                'Your driver account has not been approved yet. You cannot go online until approved by an administrator.'
            );
        }

        $driver->update(array_merge(
            ['is_online' => $isOnline],
            $locationData ? [
                'current_latitude' => $locationData['current_latitude'] ?? $driver->current_latitude,
                'current_longitude' => $locationData['current_longitude'] ?? $driver->current_longitude,
            ] : [],
        ));

        Log::info('Driver online status toggled', [
            'driver_id' => $driver->id,
            'is_online' => $isOnline,
        ]);

        return ['is_online' => $driver->fresh()->is_online];
    }

    public function updateLocation(User $driver, float $lat, float $lng, ?string $timestamp = null): void
    {
        if ($timestamp) {
            $locationTime = \Carbon\Carbon::parse($timestamp);
            if ($locationTime->isPast() && $locationTime->diffInMinutes(now()) > 5) {
                Log::warning('Stale location update rejected', [
                    'user_id' => $driver->id,
                    'timestamp' => $timestamp,
                ]);

                throw new \RuntimeException('Location update is too old.');
            }
        }

        $redisKey = "driver:location:{$driver->id}";
        $updateCountKey = "driver:location:count:{$driver->id}";

        try {
            Redis::setex($redisKey, self::LOCATION_REDIS_TTL, json_encode([
                'latitude' => $lat,
                'longitude' => $lng,
                'updated_at' => now()->toIso8601String(),
            ]));

            $updateCount = (int) Redis::incr($updateCountKey);
            Redis::expire($updateCountKey, 60);
        } catch (\Exception $e) {
            Log::warning('Redis location update failed, falling back to DB', ['error' => $e->getMessage()]);
            $updateCount = self::LOCATION_UPDATE_DB_INTERVAL;
        }

        if ($updateCount % self::LOCATION_UPDATE_DB_INTERVAL === 0) {
            $driver->update([
                'current_latitude' => $lat,
                'current_longitude' => $lng,
                'last_location_update' => now(),
            ]);
        }
    }

    public function getEarnings(User $driver, string $period = 'today'): array
    {
        $profile = $driver->driverProfile;

        $query = Ride::where('driver_id', $driver->id)
            ->where('status', 'completed');

        match ($period) {
            'today' => $query->whereDate('completed_at', today()),
            'week' => $query->where('completed_at', '>=', now()->startOfWeek()),
            'month' => $query->where('completed_at', '>=', now()->startOfMonth()),
            default => null,
        };

        $periodEarnings = (float) $query->sum('total_fare');

        $pendingPayout = WalletTransaction::whereHas('wallet', fn ($q) => $q->where('user_id', $driver->id))
            ->where('type', 'pending_payout')
            ->sum('amount');

        $recentTransactions = WalletTransaction::whereHas('wallet', fn ($q) => $q->where('user_id', $driver->id))
            ->latest()
            ->take(20)
            ->get();

        return [
            'total_earnings' => (float) ($profile?->total_earnings ?? 0),
            'today_earnings' => $periodEarnings,
            'pending_payout' => (float) $pendingPayout,
            'total_trips' => (int) ($profile?->total_trips ?? 0),
            'recent_transactions' => $recentTransactions,
        ];
    }

    public function getTrips(User $driver, array $filters = [], int $perPage = 15): LengthAwarePaginator
    {
        return Ride::where('driver_id', $driver->id)
            ->when($filters['status'] ?? null, fn ($q, $v) => $q->where('status', $v))
            ->with(['rider', 'payment', 'rating'])
            ->latest()
            ->paginate($perPage);
    }

    public function getStats(User $driver): array
    {
        $profile = $driver->driverProfile;

        return [
            'total_rides' => Ride::where('driver_id', $driver->id)->count(),
            'completed_rides' => Ride::where('driver_id', $driver->id)->where('status', 'completed')->count(),
            'cancelled_rides' => Ride::where('driver_id', $driver->id)->where('status', 'cancelled')->count(),
            'avg_rating' => \App\Models\Rating::where('ratee_id', $driver->id)->avg('score'),
            'today_rides' => Ride::where('driver_id', $driver->id)->whereDate('created_at', today())->count(),
        ];
    }

    public function verifyDocuments(User $driver): bool
    {
        $profile = $driver->driverProfile;

        if (! $profile) {
            return false;
        }

        $requiredDocTypes = [
            KycVerification::TYPE_ID_DOCUMENT,
            KycVerification::TYPE_DRIVERS_LICENSE,
            KycVerification::TYPE_VEHICLE_REGISTRATION,
            KycVerification::TYPE_VEHICLE_INSURANCE,
            KycVerification::TYPE_PSV_LICENSE,
        ];

        $approvedDocs = KycVerification::where('user_id', $driver->id)
            ->where('status', KycVerification::STATUS_APPROVED)
            ->pluck('verification_type')
            ->unique()
            ->toArray();

        $hasAllRequired = empty(array_diff($requiredDocTypes, $approvedDocs));

        $hasValidLicense = ! empty($profile->license_number)
            && ! empty($profile->license_expiry)
            && $profile->license_expiry->isFuture();

        $hasVehicle = Vehicle::where('user_id', $driver->id)
            ->where('is_active', true)
            ->exists();

        $isComplete = $hasAllRequired && $hasValidLicense && $hasVehicle;

        if ($isComplete && ! $profile->is_verified) {
            $profile->update(['is_verified' => true]);
            Log::info('Driver documents verified', ['driver_id' => $driver->id]);
        }

        return $isComplete;
    }
}
