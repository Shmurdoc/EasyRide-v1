<?php

namespace App\Jobs;

use App\Events\DriverLocationUpdated;
use App\Models\User;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class UpdateDriverLocationJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, SerializesModels;

    public function __construct(
        protected string $driverId,
        protected float $latitude,
        protected float $longitude,
        protected ?string $rideId = null
    ) {}

    public function handle(): void
    {
        try {
            $driver = User::find($this->driverId);
        } catch (\Exception $e) {
            Log::warning('UpdateDriverLocationJob: failed to find driver', [
                'driver_id' => $this->driverId,
                'error' => $e->getMessage(),
            ]);
            return;
        }

        if ($driver === null) {
            return;
        }

        $driver->current_latitude = $this->latitude;
        $driver->current_longitude = $this->longitude;
        $driver->is_online = true;
        $driver->last_location_update = now();
        $driver->save();

        broadcast(new DriverLocationUpdated(
            driverId: $this->driverId,
            latitude: $this->latitude,
            longitude: $this->longitude,
            rideId: $this->rideId,
        ));
    }
}
