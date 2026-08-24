<?php

namespace App\Console\Commands;

use App\Services\EscrowService;
use Illuminate\Console\Command;

class ReleaseEscrowPayments extends Command
{
    protected $signature = 'escrow:release';

    protected $description = 'Release held payments that have passed the 24-hour hold period';

    public function handle(EscrowService $escrow): void
    {
        $count = $escrow->releaseCompletedRides();
        $this->info("Dispatched {$count} escrow release jobs.");
    }
}
