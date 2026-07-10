<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\User;
use GuzzleHttp\Client;
use GuzzleHttp\Exception\GuzzleException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class PhbimhIntegrationService
{
    private Client $httpClient;

    public function __construct()
    {
        $this->httpClient = new Client([
            'base_uri' => config('services.phbimh.base_url'),
            'timeout' => config('services.phbimh.timeout', 30),
            'headers' => [
                'Authorization' => 'Bearer '.config('services.phbimh.api_key'),
                'Accept' => 'application/json',
                'Content-Type' => 'application/json',
            ],
        ]);
    }

    /**
     * Receive delegated orders from PHBIMH platform.
     *
     * @throws \RuntimeException
     */
    public function delegateOrder(array $payload): array
    {
        $this->validatePayload($payload, ['order_id', 'customer', 'pickup', 'dropoff']);

        try {
            $response = $this->httpClient->post('/easyryde/orders/delegate', [
                'json' => $payload,
            ]);

            $body = json_decode($response->getBody()->getContents(), true);

            if (! is_array($body)) {
                throw new \RuntimeException('Invalid response from PHBIMH');
            }

            Log::info('PHBIMH order delegated', [
                'order_id' => $payload['order_id'],
                'phbimh_response' => $body,
            ]);

            return $body;
        } catch (GuzzleException $e) {
            Log::error('PHBIMH order delegation failed', [
                'order_id' => $payload['order_id'] ?? null,
                'error' => $e->getMessage(),
            ]);

            throw new \RuntimeException('Failed to delegate order to PHBIMH: '.$e->getMessage());
        }
    }

    /**
     * Sync driver profile data to PHBIMH platform.
     *
     * @throws \RuntimeException
     */
    public function syncDriverProfile(User $driver): array
    {
        if (! $driver->hasRole('driver')) {
            throw new \InvalidArgumentException('User is not a driver');
        }

        $profile = $driver->driverProfile;
        $vehicle = $driver->vehicle;

        $payload = [
            'driver_id' => $driver->id,
            'name' => $driver->name,
            'email' => $driver->email,
            'phone' => $driver->phone_number,
            'is_online' => $driver->is_online,
            'is_approved' => $driver->is_approved,
            'is_kyc_verified' => $driver->is_kyc_verified,
            'location' => [
                'latitude' => $driver->current_latitude,
                'longitude' => $driver->current_longitude,
            ],
            'profile' => $profile ? [
                'license_number' => $profile->license_number,
                'license_expiry' => $profile->license_expiry?->format('Y-m-d'),
                'is_verified' => $profile->is_verified,
                'is_approved' => $profile->is_approved,
                'total_trips' => $profile->total_trips,
                'total_earnings' => $profile->total_earnings,
                'average_rating' => $profile->average_rating,
            ] : null,
            'vehicle' => $vehicle ? [
                'make' => $vehicle->make,
                'model' => $vehicle->model,
                'year' => $vehicle->year,
                'color' => $vehicle->color,
                'license_plate' => $vehicle->license_plate,
                'category' => $vehicle->category,
                'is_active' => $vehicle->is_active,
            ] : null,
            'synced_at' => now()->toIso8601String(),
        ];

        try {
            $response = $this->httpClient->post('/easyryde/drivers/sync', [
                'json' => $payload,
            ]);

            $body = json_decode($response->getBody()->getContents(), true);

            if (! is_array($body)) {
                throw new \RuntimeException('Invalid response from PHBIMH');
            }

            Log::info('PHBIMH driver synced', [
                'driver_id' => $driver->id,
                'phbimh_response' => $body,
            ]);

            return $body;
        } catch (GuzzleException $e) {
            Log::error('PHBIMH driver sync failed', [
                'driver_id' => $driver->id,
                'error' => $e->getMessage(),
            ]);

            throw new \RuntimeException('Failed to sync driver to PHBIMH: '.$e->getMessage());
        }
    }

    /**
     * Verify webhook HMAC-SHA256 signature.
     */
    public function verifyWebhookSignature(array $payload, string $signature): bool
    {
        $webhookSecret = config('services.phbimh.webhook_secret');

        if (empty($webhookSecret)) {
            Log::warning('PHBIMH webhook secret not configured');

            return false;
        }

        $expectedSignature = hash_hmac('sha256', json_encode($payload, JSON_UNESCAPED_SLASHES), $webhookSecret);

        return hash_equals($expectedSignature, $signature);
    }

    /**
     * Route webhook events to appropriate handlers.
     */
    public function processWebhook(string $eventType, array $payload): void
    {
        Log::info('PHBIMH webhook received', [
            'event_type' => $eventType,
            'payload_keys' => array_keys($payload),
        ]);

        match ($eventType) {
            'order.created' => $this->handleOrderCreated($payload),
            'order.updated' => $this->handleOrderUpdated($payload),
            'order.cancelled' => $this->handleOrderCancelled($payload),
            'driver.location_updated' => $this->handleDriverLocationUpdate($payload),
            'driver.status_changed' => $this->handleDriverStatusChange($payload),
            default => Log::warning('Unknown PHBIMH webhook event type', ['event_type' => $eventType]),
        };
    }

    private function handleOrderCreated(array $payload): void
    {
        Log::info('PHBIMH order.created', ['order_id' => $payload['order_id'] ?? null]);
    }

    private function handleOrderUpdated(array $payload): void
    {
        Log::info('PHBIMH order.updated', ['order_id' => $payload['order_id'] ?? null]);
    }

    private function handleOrderCancelled(array $payload): void
    {
        Log::info('PHBIMH order.cancelled', ['order_id' => $payload['order_id'] ?? null]);
    }

    private function handleDriverLocationUpdate(array $payload): void
    {
        Log::info('PHBIMH driver.location_updated', ['driver_id' => $payload['driver_id'] ?? null]);
    }

    private function handleDriverStatusChange(array $payload): void
    {
        Log::info('PHBIMH driver.status_changed', ['driver_id' => $payload['driver_id'] ?? null]);
    }

    /**
     * Validate required keys exist in payload.
     *
     * @throws \InvalidArgumentException
     */
    private function validatePayload(array $payload, array $requiredKeys): void
    {
        $missing = array_diff($requiredKeys, array_keys($payload));

        if ($missing !== []) {
            throw new \InvalidArgumentException('Missing required payload keys: '.implode(', ', $missing));
        }
    }
}
