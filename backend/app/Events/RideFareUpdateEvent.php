<?php

declare(strict_types=1);

namespace App\Events;

use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class RideFareUpdateEvent implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public string $rideId,
        public float $totalFare,
        public array $breakdown = [],
    ) {}

    public function broadcastOn(): array
    {
        return [
            new Channel('ride:'.$this->rideId),
        ];
    }

    public function broadcastAs(): string
    {
        return 'ride.fare.update';
    }

    public function broadcastWith(): array
    {
        return [
            'ride_id' => $this->rideId,
            'total_fare' => $this->totalFare,
            'breakdown' => $this->breakdown,
            'timestamp' => now()->toISOString(),
        ];
    }
}
