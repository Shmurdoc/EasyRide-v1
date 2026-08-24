<?php

namespace Database\Seeders;

use App\Models\PromoCode;
use App\Models\SystemSetting;
use App\Models\Tenant;
use App\Models\User;
use App\Models\Wallet;
use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

class ProductionSeeder extends Seeder
{
    public function run(): void
    {
        // --- Permissions ---
        $permissions = [
            'view-dashboard', 'manage-users', 'manage-rides', 'manage-drivers',
            'manage-payments', 'manage-promotions', 'manage-deliveries', 'manage-settings',
        ];

        foreach ($permissions as $permission) {
            Permission::firstOrCreate(['name' => $permission, 'guard_name' => 'web']);
            Permission::firstOrCreate(['name' => $permission, 'guard_name' => 'api']);
        }

        // --- Roles ---
        $superAdmin = Role::firstOrCreate(['name' => 'super-admin', 'guard_name' => 'web']);
        $superAdmin->syncPermissions(Permission::all()->where('guard_name', 'web'));

        $superAdminApi = Role::firstOrCreate(['name' => 'super-admin', 'guard_name' => 'api']);
        $superAdminApi->syncPermissions(Permission::all()->where('guard_name', 'api'));

        Role::firstOrCreate(['name' => 'admin', 'guard_name' => 'web']);
        Role::firstOrCreate(['name' => 'admin', 'guard_name' => 'api']);
        Role::firstOrCreate(['name' => 'driver', 'guard_name' => 'web']);
        Role::firstOrCreate(['name' => 'driver', 'guard_name' => 'api']);
        Role::firstOrCreate(['name' => 'rider', 'guard_name' => 'web']);
        Role::firstOrCreate(['name' => 'rider', 'guard_name' => 'api']);

        // --- Default tenant ---
        $tenant = Tenant::firstOrCreate(
            ['slug' => 'default'],
            [
                'name' => 'EasyRyde',
                'region' => 'ZA',
                'currency' => 'ZAR',
                'is_active' => true,
            ]
        );

        // --- Super-admin user ---
        $admin = User::firstOrCreate(
            ['email' => 'admin@easyryde.co.za'],
            [
                'tenant_id' => $tenant->id,
                'name' => 'EasyRyde Admin',
                'password' => 'password',
                'phone_number' => '+27000000000',
                'role' => 'admin',
                'is_active' => true,
            ]
        );
        $admin->assignRole('super-admin');
        $admin->roles()->syncWithoutDetaching(Role::findByName('super-admin', 'api'));

        Wallet::firstOrCreate(
            ['user_id' => $admin->id],
            ['balance' => 0, 'pending_balance' => 0, 'currency' => 'ZAR']
        );

        // --- Ride category fares ---
        $rideCategories = [
            'standard' => ['base' => '35', 'per_km' => '15', 'per_min' => '3', 'minimum' => '50'],
            'premium'  => ['base' => '55', 'per_km' => '22', 'per_min' => '5', 'minimum' => '80'],
            'minivan'  => ['base' => '45', 'per_km' => '18', 'per_min' => '4', 'minimum' => '65'],
            'pets'     => ['base' => '30', 'per_km' => '14', 'per_min' => '2', 'minimum' => '45'],
            'delivery' => ['base' => '20', 'per_km' => '10', 'per_min' => '1', 'minimum' => '30'],
        ];

        foreach ($rideCategories as $category => $fares) {
            foreach (['base', 'per_km', 'per_min', 'minimum'] as $field) {
                $key = "fare_{$category}_" . ($field === 'minimum' ? 'minimum' : str_replace('_', '_', $field));
                SystemSetting::firstOrCreate(
                    ['key' => $key, 'tenant_id' => $tenant->id],
                    ['value' => $fares[$field], 'type' => 'number', 'description' => ucfirst(str_replace('_', ' ', $key))]
                );
            }
        }

        // --- General platform settings ---
        $platformSettings = [
            ['app_name', 'EasyRyde', 'text', 'Application name'],
            ['platform_fee_percent', '15', 'number', 'Platform fee percentage'],
            ['service_fee_amount', '10', 'number', 'Flat service fee charged on every ride'],
            ['driver_search_radius', '5', 'number', 'Default driver search radius in km'],
            ['max_surge_multiplier', '2.5', 'number', 'Maximum surge pricing multiplier'],
        ];

        foreach ($platformSettings as [$key, $value, $type, $description]) {
            SystemSetting::firstOrCreate(
                ['key' => $key, 'tenant_id' => $tenant->id],
                ['value' => $value, 'type' => $type, 'description' => $description]
            );
        }

        // --- Phalaborwa-specific system settings ---
        $locationSettings = [
            ['default_latitude', '-23.9468', 'number', 'Default center latitude (Phalaborwa)'],
            ['default_longitude', '29.4726', 'number', 'Default center longitude (Phalaborwa)'],
            ['timezone', 'Africa/Johannesburg', 'text', 'Application timezone'],
            ['currency', 'ZAR', 'text', 'Default currency'],
            ['country_code', 'ZA', 'text', 'Default country code'],
            ['language', 'en', 'text', 'Default language'],
        ];

        foreach ($locationSettings as [$key, $value, $type, $description]) {
            SystemSetting::firstOrCreate(
                ['key' => $key, 'tenant_id' => $tenant->id],
                ['value' => $value, 'type' => $type, 'description' => $description]
            );
        }

        // --- Launch promo codes ---
        $now = now();
        $expiresAt = $now->copy()->addMonths(3);

        PromoCode::firstOrCreate(
            ['code' => 'WELCOME10', 'tenant_id' => $tenant->id],
            [
                'type' => 'percentage',
                'value' => 10.00,
                'min_ride_amount' => 30.00,
                'max_discount' => 50.00,
                'max_uses' => 500,
                'used_count' => 0,
                'max_uses_per_user' => 1,
                'starts_at' => $now,
                'expires_at' => $expiresAt,
                'is_active' => true,
            ]
        );

        PromoCode::firstOrCreate(
            ['code' => 'FIRSTFREE', 'tenant_id' => $tenant->id],
            [
                'type' => 'fixed',
                'value' => 50.00,
                'min_ride_amount' => 0,
                'max_discount' => 50.00,
                'max_uses' => 200,
                'used_count' => 0,
                'max_uses_per_user' => 1,
                'starts_at' => $now,
                'expires_at' => $expiresAt,
                'is_active' => true,
            ]
        );
    }
}
