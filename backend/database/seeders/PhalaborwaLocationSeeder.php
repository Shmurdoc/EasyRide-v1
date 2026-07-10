<?php

namespace Database\Seeders;

use App\Models\SystemSetting;
use App\Models\Tenant;
use Illuminate\Database\Seeder;

class PhalaborwaLocationSeeder extends Seeder
{
    public function run(): void
    {
        $tenant = Tenant::where('slug', 'default')->first();

        if (! $tenant) {
            $this->command?->warn('No default tenant found. Run ProductionSeeder first.');

            return;
        }

        $pickupPoints = [
            [
                'name' => 'Phalaborwa Town Centre',
                'latitude' => '-23.9468',
                'longitude' => '29.4726',
                'category' => 'town_centre',
            ],
            [
                'name' => 'Mall Phalaborwa',
                'latitude' => '-23.9435',
                'longitude' => '29.4689',
                'category' => 'shopping',
            ],
            [
                'name' => 'Phalaborwa Junction',
                'latitude' => '-23.9410',
                'longitude' => '29.4650',
                'category' => 'shopping',
            ],
            [
                'name' => 'Ba-Phalaborwa Municipality',
                'latitude' => '-23.9475',
                'longitude' => '29.4710',
                'category' => 'government',
            ],
            [
                'name' => 'Phalaborwa Hospital',
                'latitude' => '-23.9500',
                'longitude' => '29.4740',
                'category' => 'hospital',
            ],
            [
                'name' => 'Lesedi Clinic',
                'latitude' => '-23.9420',
                'longitude' => '29.4695',
                'category' => 'hospital',
            ],
            [
                'name' => 'Phalaborwa High School',
                'latitude' => '-23.9455',
                'longitude' => '29.4700',
                'category' => 'school',
            ],
            [
                'name' => 'Mohlakeng Primary School',
                'latitude' => '-23.9480',
                'longitude' => '29.4755',
                'category' => 'school',
            ],
            [
                'name' => 'Phalaborwa Taxi Rank',
                'latitude' => '-23.9462',
                'longitude' => '29.4718',
                'category' => 'transport_hub',
            ],
            [
                'name' => 'Kruger Gate Hotel',
                'latitude' => '-23.9890',
                'longitude' => '29.5600',
                'category' => 'hotel',
            ],
            [
                'name' => 'Kopanong Hotel',
                'latitude' => '-23.9350',
                'longitude' => '29.4620',
                'category' => 'hotel',
            ],
            [
                'name' => 'Phalaborwa Foskor Mine',
                'latitude' => '-23.9300',
                'longitude' => '29.4500',
                'category' => 'industrial',
            ],
            [
                'name' => 'Municipal Swimming Pool',
                'latitude' => '-23.9445',
                'longitude' => '29.4670',
                'category' => 'recreation',
            ],
            [
                'name' => 'Phalaborwa Library',
                'latitude' => '-23.9472',
                'longitude' => '29.4735',
                'category' => 'government',
            ],
            [
                'name' => 'N14 / R71 Intersection',
                'latitude' => '-23.9400',
                'longitude' => '29.4600',
                'category' => 'landmark',
            ],
        ];

        foreach ($pickupPoints as $point) {
            $key = 'pickup_' . strtolower(str_replace(' ', '_', $point['name']));
            SystemSetting::firstOrCreate(
                ['key' => $key, 'tenant_id' => $tenant->id],
                [
                    'value' => json_encode($point),
                    'type' => 'json',
                    'description' => "Pickup point: {$point['name']}",
                ]
            );
        }
    }
}
