<?php

namespace Tests\Unit\Jobs;

use App\Events\DriverLocationUpdated;
use App\Jobs\UpdateDriverLocationJob;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Bus;
use Illuminate\Support\Facades\Event;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class UpdateDriverLocationJobTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Role::create(['name' => 'driver', 'guard_name' => 'web']);
    }

    public function test_job_dispatches_correctly(): void
    {
        Bus::fake();

        $driver = User::factory()->create();
        $driver->assignRole('driver');

        UpdateDriverLocationJob::dispatch($driver->id, -23.9468, 29.4726);

        Bus::assertDispatched(UpdateDriverLocationJob::class);
    }

    public function test_handle_updates_driver_location(): void
    {
        $driver = User::factory()->create([
            'is_online' => false,
            'current_latitude' => 0,
            'current_longitude' => 0,
        ]);
        $driver->assignRole('driver');

        Event::fake();

        (new UpdateDriverLocationJob($driver->id, -23.9468, 29.4726))->handle();

        $driver->refresh();
        $this->assertEquals(-23.9468, (float) $driver->current_latitude);
        $this->assertEquals(29.4726, (float) $driver->current_longitude);
        $this->assertTrue($driver->is_online);
        $this->assertNotNull($driver->last_location_update);
    }

    public function test_handle_sets_driver_online(): void
    {
        $driver = User::factory()->create(['is_online' => false]);
        $driver->assignRole('driver');

        Event::fake();

        (new UpdateDriverLocationJob($driver->id, -23.9468, 29.4726))->handle();

        $driver->refresh();
        $this->assertTrue($driver->is_online);
    }

    public function test_handle_broadcasts_location_event(): void
    {
        $driver = User::factory()->create();
        $driver->assignRole('driver');

        Event::fake();

        (new UpdateDriverLocationJob($driver->id, -23.9468, 29.4726, 'ride-123'))->handle();

        Event::assertDispatched(DriverLocationUpdated::class, function ($event) use ($driver) {
            return $event->driverId === $driver->id
                && $event->latitude === -23.9468
                && $event->longitude === 29.4726
                && $event->rideId === 'ride-123';
        });
    }

    public function test_handle_returns_early_when_driver_not_found(): void
    {
        Event::fake();

        $job = new UpdateDriverLocationJob(\Illuminate\Support\Str::uuid()->toString(), -23.9468, 29.4726);
        $job->handle();

        Event::assertNotDispatched(DriverLocationUpdated::class);
    }
}
