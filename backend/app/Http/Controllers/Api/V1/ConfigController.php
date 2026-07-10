<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

class ConfigController extends Controller
{
    public function __invoke(Request $request): JsonResponse
    {
        $config = Cache::remember('platform_config', 300, function () {
            return [
                'platform' => [
                    'name' => config('app.name'),
                    'currency' => 'ZAR',
                    'country' => 'ZA',
                    'currency_symbol' => 'R',
                ],
                'ride_categories' => [
                    ['id' => 'standard', 'name' => 'Standard', 'base_fare' => 25.00, 'per_km' => 12.00, 'per_min' => 2.00],
                    ['id' => 'premium', 'name' => 'Premium', 'base_fare' => 40.00, 'per_km' => 18.00, 'per_min' => 3.00],
                    ['id' => 'minivan', 'name' => 'Minivan', 'base_fare' => 35.00, 'per_km' => 15.00, 'per_min' => 2.50],
                    ['id' => 'pets', 'name' => 'Pets', 'base_fare' => 30.00, 'per_km' => 14.00, 'per_min' => 2.00],
                    ['id' => 'delivery', 'name' => 'Delivery', 'base_fare' => 20.00, 'per_km' => 10.00, 'per_min' => 2.00],
                ],
                'payment_methods' => [
                    ['id' => 'cash', 'name' => 'Cash', 'enabled' => true],
                    ['id' => 'wallet', 'name' => 'Wallet', 'enabled' => true],
                    ['id' => 'payfast', 'name' => 'PayFast', 'enabled' => true],
                    ['id' => 'ozow', 'name' => 'Ozow EFT', 'enabled' => true],
                ],
                'surge' => [
                    'enabled' => true,
                    'multiplier_cap' => 3.0,
                ],
                'matching' => [
                    'radius_km' => 10,
                    'timeout_seconds' => 30,
                ],
                'features' => [
                    'ride_hailing' => true,
                    'item_transport' => true,
                    'food_delivery' => true,
                ],
            ];
        });

        return response()->json($config);
    }
}
