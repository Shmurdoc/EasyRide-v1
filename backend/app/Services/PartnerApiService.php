<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\Delivery;
use App\Models\User;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class PartnerApiService
{
    private const PARTNER_API_URL = 'https://api.phalaborwainmyhand.co.za/v1';

    public function __construct(
        private readonly string $apiKey,
        private readonly string $partnerId,
        private readonly string $webhookSecret,
    ) {}

    public function receiveOrder(array $payload): ?Delivery
    {
        if (! $this->verifyWebhookSignature($payload)) {
            Log::warning('Partner webhook: Invalid signature');

            return null;
        }

        try {
            $orderData = $payload['order'] ?? $payload;

            $delivery = Delivery::create([
                'tenant_id' => config('app.tenant_id', 'default'),
                'sender_id' => $this->findOrCreatePartnerUser($orderData['customer']),
                'pickup_address' => $orderData['pickup']['address'] ?? '',
                'pickup_latitude' => $orderData['pickup']['latitude'] ?? 0,
                'pickup_longitude' => $orderData['pickup']['longitude'] ?? 0,
                'dropoff_address' => $orderData['dropoff']['address'] ?? '',
                'dropoff_latitude' => $orderData['dropoff']['latitude'] ?? 0,
                'dropoff_longitude' => $orderData['dropoff']['longitude'] ?? 0,
                'item_description' => $orderData['item_description'] ?? '',
                'item_value' => $orderData['item_value'] ?? 0,
                'item_weight' => $orderData['item_weight'] ?? 0,
                'fragile' => $orderData['fragile'] ?? false,
                'special_instructions' => $orderData['special_instructions'] ?? '',
                'status' => 'pending',
                'fare_amount' => $this->calculateFare($orderData),
                'partner_reference' => $orderData['order_id'] ?? Str::uuid(),
                'partner_name' => 'phalaborwa_in_my_hand',
                'partner_data' => $orderData,
            ]);

            return $delivery;
        } catch (\Exception $e) {
            Log::error('Partner order creation failed', ['error' => $e->getMessage()]);

            return null;
        }
    }

    public function sendStatusUpdate(string $deliveryId, string $status, array $extra = []): bool
    {
        try {
            $delivery = Delivery::find($deliveryId);
            if (! $delivery) {
                return false;
            }

            $payload = [
                'order_id' => $delivery->partner_reference,
                'status' => $this->mapStatusToPartner($status),
                'timestamp' => now()->toIso8601String(),
                'driver' => $delivery->driver ? [
                    'name' => $delivery->driver->name,
                    'phone' => $delivery->driver->phone_number,
                ] : null,
                ...$extra,
            ];

            $signature = $this->generateSignature($payload);

            $response = Http::withHeaders([
                'Authorization' => 'Bearer '.$this->apiKey,
                'X-Partner-Id' => $this->partnerId,
                'X-Signature' => $signature,
                'Content-Type' => 'application/json',
            ])->post(self::PARTNER_API_URL.'/orders/status', $payload);

            return $response->successful();
        } catch (\Exception $e) {
            Log::error('Partner status update failed', ['error' => $e->getMessage()]);

            return false;
        }
    }

    public function requestDriver(Delivery $delivery): bool
    {
        try {
            $payload = [
                'order_id' => $delivery->partner_reference,
                'pickup' => [
                    'address' => $delivery->pickup_address,
                    'latitude' => $delivery->pickup_latitude,
                    'longitude' => $delivery->pickup_longitude,
                ],
                'dropoff' => [
                    'address' => $delivery->dropoff_address,
                    'latitude' => $delivery->dropoff_latitude,
                    'longitude' => $delivery->dropoff_longitude,
                ],
            ];

            $signature = $this->generateSignature($payload);

            $response = Http::withHeaders([
                'Authorization' => 'Bearer '.$this->apiKey,
                'X-Partner-Id' => $this->partnerId,
                'X-Signature' => $signature,
            ])->post(self::PARTNER_API_URL.'/orders/driver-request', $payload);

            return $response->successful();
        } catch (\Exception $e) {
            Log::error('Partner driver request failed', ['error' => $e->getMessage()]);

            return false;
        }
    }

    private function calculateFare(array $orderData): float
    {
        $distance = $this->calculateDistance(
            $orderData['pickup']['latitude'] ?? 0,
            $orderData['pickup']['longitude'] ?? 0,
            $orderData['dropoff']['latitude'] ?? 0,
            $orderData['dropoff']['longitude'] ?? 0,
        );

        $baseFare = 25.00;
        $perKmRate = 8.00;
        $weightMultiplier = 1.0;

        $weight = $orderData['item_weight'] ?? 0;
        if ($weight > 10) {
            $weightMultiplier = 1.5;
        }
        if ($weight > 25) {
            $weightMultiplier = 2.0;
        }
        if ($orderData['fragile'] ?? false) {
            $weightMultiplier *= 1.2;
        }

        return round($baseFare + ($distance * $perKmRate * $weightMultiplier), 2);
    }

    private function calculateDistance(float $lat1, float $lng1, float $lat2, float $lng2): float
    {
        $earthRadius = 6371;
        $dLat = deg2rad($lat2 - $lat1);
        $dLng = deg2rad($lng2 - $lng1);
        $a = sin($dLat / 2) ** 2 + cos(deg2rad($lat1)) * cos(deg2rad($lat2)) * sin($dLng / 2) ** 2;

        return $earthRadius * 2 * atan2(sqrt($a), sqrt(1 - $a));
    }

    private function findOrCreatePartnerUser(array $customerData): string
    {
        $email = $customerData['email'] ?? ('partner_'.($customerData['phone'] ?? Str::random(8)).'@phalaborwa-partner.local');
        $user = User::firstOrCreate(
            ['email' => $email],
            [
                'name' => $customerData['name'] ?? 'Partner Customer',
                'phone_number' => $customerData['phone'] ?? '',
                'password' => bcrypt(Str::random(32)),
            ]
        );

        if ($user->wasRecentlyCreated) {
            $user->role = 'rider';
            $user->save();
            $user->assignRole('rider');
        }

        return $user->id;
    }

    private function mapStatusToPartner(string $status): string
    {
        return match ($status) {
            'pending' => 'order_received',
            'assigned' => 'driver_assigned',
            'picked_up' => 'picked_up',
            'in_transit' => 'in_transit',
            'delivered' => 'delivered',
            'cancelled' => 'cancelled',
            default => $status,
        };
    }

    public function verifyWebhookSignature(array $payload): bool
    {
        $signature = request()->header('X-Signature');
        if (! $signature) {
            return false;
        }

        $expectedSignature = $this->generateSignature($payload);

        return hash_equals($expectedSignature, $signature);
    }

    private function generateSignature(array $data): string
    {
        ksort($data);
        $payload = json_encode($data, JSON_UNESCAPED_SLASHES);

        return hash_hmac('sha256', $payload, $this->webhookSecret);
    }
}
