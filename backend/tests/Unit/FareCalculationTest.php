<?php

namespace Tests\Unit;

use App\Models\SystemSetting;
use App\Services\FareCalculationService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class FareCalculationTest extends TestCase
{
    use RefreshDatabase;

    private FareCalculationService $service;

    protected function setUp(): void
    {
        parent::setUp();
        $this->service = $this->app->make(FareCalculationService::class);

        $settings = [
            'fare_standard_base_fare' => '35',
            'fare_standard_per_km_rate' => '15',
            'fare_standard_per_minute_rate' => '3',
            'fare_standard_minimum_fare' => '50',
            'fare_premium_base_fare' => '55',
            'fare_premium_per_km_rate' => '22',
            'fare_premium_per_minute_rate' => '5',
            'fare_premium_minimum_fare' => '80',
            'fare_minivan_base_fare' => '30',
            'fare_minivan_per_km_rate' => '12',
            'fare_minivan_per_minute_rate' => '3',
            'fare_minivan_minimum_fare' => '45',
            'fare_pets_base_fare' => '30',
            'fare_pets_per_km_rate' => '14',
            'fare_pets_per_minute_rate' => '2',
            'fare_pets_minimum_fare' => '45',
        ];
        foreach ($settings as $key => $value) {
            SystemSetting::create(['key' => $key, 'value' => $value]);
        }
    }

    public function test_calculate_fare_returns_correct_structure(): void
    {
        $result = $this->service->calculateFare(10, 30, 'standard');

        $this->assertArrayHasKey('base_fare', $result);
        $this->assertArrayHasKey('per_km_fare', $result);
        $this->assertArrayHasKey('distance_fare', $result);
        $this->assertArrayHasKey('time_fare', $result);
        $this->assertArrayHasKey('surge_multiplier', $result);
        $this->assertArrayHasKey('subtotal', $result);
        $this->assertArrayHasKey('discount', $result);
        $this->assertArrayHasKey('total_fare', $result);
    }

    public function test_standard_fare_calculation(): void
    {
        $result = $this->service->calculateFare(10, 30, 'standard');

        $this->assertEquals(35.0, $result['base_fare']);
        $this->assertEquals(15.0, $result['per_km_fare']);
        $this->assertEquals(150.0, $result['distance_fare']);
        $this->assertEquals(90.0, $result['time_fare']);
        $this->assertEquals(1.0, $result['surge_multiplier']);
        $this->assertEquals(275.0, $result['subtotal']);
        $this->assertEquals(0.0, $result['discount']);
        $this->assertEquals(275.0, $result['total_fare']);
    }

    public function test_premium_fare_calculation(): void
    {
        $result = $this->service->calculateFare(10, 30, 'premium');

        $this->assertEquals(55.0, $result['base_fare']);
        $this->assertEquals(22.0, $result['per_km_fare']);
        $this->assertEquals(220.0, $result['distance_fare']);
        $this->assertEquals(150.0, $result['time_fare']);
        $this->assertEquals(425.0, $result['total_fare']);
    }

    public function test_minimum_fare_enforced(): void
    {
        $result = $this->service->calculateFare(0.5, 1, 'standard');

        $this->assertGreaterThanOrEqual(50.0, $result['total_fare']);
    }

    public function test_surge_multiplier_applied(): void
    {
        $result = $this->service->calculateFare(10, 30, 'standard', 2.0);

        $this->assertEquals(2.0, $result['surge_multiplier']);
        $this->assertEquals(550.0, $result['total_fare']);
    }

    public function test_haversine_distance_calculation(): void
    {
        $distance = $this->service->calculate(
            -23.9468, 29.4726,
            -23.9500, 29.4800,
            'standard',
        );

        $this->assertArrayHasKey('total_fare', $distance);
        $this->assertGreaterThan(0, $distance['total_fare']);
    }

    public function test_calculate_returns_valid_fare_array(): void
    {
        $result = $this->service->calculate(
            -23.9468, 29.4726,
            -23.9500, 29.4800,
            'standard',
        );

        $this->assertIsArray($result);
        $this->assertArrayHasKey('total_fare', $result);
        $this->assertGreaterThan(0, $result['total_fare']);
    }

    public function test_calculate_surge_returns_valid_multipler(): void
    {
        $this->assertEquals(1.15, $this->service->calculateSurge(10, 5));
        $this->assertEquals(2.5, $this->service->calculateSurge(0, 5));
    }

    public function test_calculate_surge_increases_with_demand(): void
    {
        $lowDemand = $this->service->calculateSurge(10, 2);
        $highDemand = $this->service->calculateSurge(10, 20);

        $this->assertGreaterThan($lowDemand, $highDemand);
    }

    public function test_calculate_surge_max_is_2_5(): void
    {
        $result = $this->service->calculateSurge(1, 100);
        $this->assertLessThanOrEqual(2.5, $result);
    }

    public function test_far_distance_produces_higher_fare(): void
    {
        $short = $this->service->calculateFare(2, 6, 'standard');
        $long = $this->service->calculateFare(20, 60, 'standard');

        $this->assertGreaterThan($short['total_fare'], $long['total_fare']);
    }

    public function test_different_categories_produce_different_fares(): void
    {
        $minivan = $this->service->calculateFare(10, 30, 'minivan');
        $standard = $this->service->calculateFare(10, 30, 'standard');
        $premium = $this->service->calculateFare(10, 30, 'premium');

        $this->assertLessThan($standard['total_fare'], $minivan['total_fare']);
        $this->assertGreaterThan($standard['total_fare'], $premium['total_fare']);
    }
}
