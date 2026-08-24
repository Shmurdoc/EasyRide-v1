<?php

namespace Tests\Unit;

use App\Models\SystemSetting;
use App\Services\FareCalculationService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class FareCalculationServiceTest extends TestCase
{
    use RefreshDatabase;

    private FareCalculationService $service;

    protected function setUp(): void
    {
        parent::setUp();
        $this->service = $this->app->make(FareCalculationService::class);

        SystemSetting::create(['key' => 'fare_standard_base_fare', 'value' => '35']);
        SystemSetting::create(['key' => 'fare_standard_per_km_rate', 'value' => '15']);
        SystemSetting::create(['key' => 'fare_standard_per_minute_rate', 'value' => '3']);
        SystemSetting::create(['key' => 'fare_standard_minimum_fare', 'value' => '50']);
    }

    public function test_fare_calculation_with_osrm_route(): void
    {
        Http::fake([
            'https://router.project-osrm.org/*' => Http::response([
                'code' => 'Ok',
                'routes' => [
                    [
                        'distance' => 10500,
                        'duration' => 900,
                        'geometry' => 'abc123',
                    ],
                ],
            ]),
        ]);

        $result = $this->service->calculate(
            -23.9468, 29.4726,
            -23.9500, 29.4800,
            'standard',
        );

        $this->assertEquals(157.5, $result['distance_fare']);
        $this->assertEquals(45.0, $result['time_fare']);
        $this->assertArrayHasKey('total_fare', $result);
        $this->assertGreaterThan(0, $result['total_fare']);
    }

    public function test_fallback_to_haversine_when_osrm_unreachable(): void
    {
        Http::fake([
            'https://router.project-osrm.org/*' => Http::response(null, 500),
        ]);

        $result = $this->service->calculate(
            -23.9468, 29.4726,
            -23.9500, 29.4800,
            'standard',
        );

        $this->assertArrayHasKey('base_fare', $result);
        $this->assertArrayHasKey('distance_fare', $result);
        $this->assertArrayHasKey('time_fare', $result);
        $this->assertArrayHasKey('total_fare', $result);
        $this->assertGreaterThan(0, $result['total_fare']);
    }

    public function test_fare_estimate_public_endpoint(): void
    {
        Http::fake([
            'https://router.project-osrm.org/*' => Http::response([
                'code' => 'Ok',
                'routes' => [
                    [
                        'distance' => 8000,
                        'duration' => 600,
                        'geometry' => 'polyline123',
                    ],
                ],
            ]),
        ]);

        $response = $this->getJson('/api/v1/rides/fare-estimate?'.http_build_query([
            'pickup_lat' => -23.9468,
            'pickup_lng' => 29.4726,
            'dropoff_lat' => -23.9500,
            'dropoff_lng' => 29.4800,
            'category' => 'premium',
        ]));

        $response->assertOk()
            ->assertJsonStructure([
                'data' => [
                    'distance_km',
                    'duration_minutes',
                    'breakdown' => [
                        'base_fare', 'distance_fare', 'time_fare', 'surge', 'subtotal', 'total_fare',
                    ],
                ],
            ]);
    }
}
