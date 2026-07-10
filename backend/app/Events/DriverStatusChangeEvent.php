<?php

declare(strict_types=1);

namespace App\Events;

use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class DriverStatusChangeEvent implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public string $driverId,
        public bool $isOnline,
    ) {}

    public function broadcastOn(): array
    {
        return [
            new Channel('driver:'.$this->driverId),
        ];
    }

    public function broadcastAs(): string
    {
        return 'driver.status.change';
    }

    public function broadcastWith(): array
    {
        return [
            'driver_id' => $this->driverId,
            'is_online' => $this->isOnline,
            'timestamp' => now()->toISOString(),
        ];
    }
}
