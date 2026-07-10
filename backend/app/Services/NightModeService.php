<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\Ride;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Support\Facades\Log;

class NightModeService
{
    private const NIGHT_START_HOUR = 22;
    private const NIGHT_END_HOUR = 5;

    public function isNightModeActive(): bool
    {
        $hour = Carbon::now()->hour;
        return $hour >= self::NIGHT_START_HOUR || $hour < self::NIGHT_END_HOUR;
    }

    public function canRequestRide(User $rider): bool
    {
        if (!$this->isNightModeActive()) {
            return true;
        }

        return $this->isVerifiedDriverAvailable();
    }

    public function enforceNightMode(Ride $ride): array
    {
        if (!$this->isNightModeActive()) {
            return ['enforced' => false, 'reason' => 'Night mode not active'];
        }

        $driver = $ride->driver;
        if (!$driver) {
            return ['enforced' => false, 'reason' => 'No driver assigned'];
        }

        if (!$this->isDriverVerified($driver)) {
            return [
                'enforced' => true,
                'reason' => 'Unverified drivers cannot operate during night mode (10PM-5AM)',
                'action' => 'reassign',
            ];
        }

        $this->notifyRiderOfNightMode($ride);

        return ['enforced' => false, 'reason' => 'Driver is verified for night mode'];
    }

    private function isDriverVerified(User $driver): bool
    {
        $profile = $driver->driverProfile;
        if (!$profile) {
            return false;
        }

        return $profile->is_verified && $profile->license_verified;
    }

    private function isVerifiedDriverAvailable(): bool
    {
        return \App\Models\DriverProfile::where('is_verified', true)
            ->where('license_verified', true)
            ->whereHas('user', fn ($q) => $q->where('is_online', true)->where('is_active', true))
            ->exists();
    }

    private function notifyRiderOfNightMode(Ride $ride): void
    {
        $rider = $ride->rider;
        if ($rider) {
            app(PushNotificationService::class)->send(
                $rider,
                'Night Mode Active',
                'Your ride is being handled by a verified driver for your safety.',
                ['type' => 'night_mode', 'ride_id' => $ride->id]
            );
        }
    }
}
