<?php

namespace App\Jobs;

use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Redis;

class SyncDriverLocationsJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 1;

    public function __construct()
    {
        $this->onQueue('default');
    }

    public function handle(): void
    {
        try {
            $locationData = Redis::hgetall('driver:locations');

            if (empty($locationData)) {
                return;
            }

            $synced = 0;

            foreach ($locationData as $driverId => $json) {
                $location = json_decode($json, true);

                if (! $location || ! isset($location['lat'], $location['lng'])) {
                    continue;
                }

                User::where('id', $driverId)
                    ->where('role', 'driver')
                    ->update([
                        'current_latitude' => $location['lat'],
                        'current_longitude' => $location['lng'],
                        'last_location_update' => isset($location['timestamp'])
                            ? date('Y-m-d H:i:s', $location['timestamp'])
                            : now(),
                    ]);

                $synced++;
            }

            Log::info('SyncDriverLocationsJob completed', ['synced_count' => $synced]);
        } catch (\Exception $e) {
            Log::error('SyncDriverLocationsJob failed', ['error' => $e->getMessage()]);
            throw $e;
        }
    }
}
