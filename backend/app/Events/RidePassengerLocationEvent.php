<?php

declare(strict_types=1);

namespace App\Events;

use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class RidePassengerLocationEvent implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public string $poolRideId,
        public string $passengerId,
        public float $latitude,
        public float $longitude,
    ) {}

    public function broadcastOn(): array
    {
        return [
            new Channel('pool:'.$this->poolRideId),
        ];
    }

    public function broadcastAs(): string
    {
        return 'ride.passenger.location';
    }

    public function broadcastWith(): array
    {
        return [
            'pool_ride_id' => $this->poolRideId,
            'passenger_id' => $this->passengerId,
            'latitude' => $this->latitude,
            'longitude' => $this->longitude,
            'timestamp' => now()->toISOString(),
        ];
    }
}
