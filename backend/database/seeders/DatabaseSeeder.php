<?php

namespace Database\Seeders;

use App\Models\DriverProfile;
use App\Models\SystemSetting;
use App\Models\Tenant;
use App\Models\User;
use App\Models\Vehicle;
use App\Models\Wallet;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $this->call([
            ProductionSeeder::class,
            PhalaborwaLocationSeeder::class,
            FoodDeliverySeeder::class,
        ]);

        // Create permissions
        $permissions = ['view-dashboard', 'manage-users', 'manage-rides', 'manage-drivers',
            'manage-payments', 'manage-promotions', 'manage-deliveries', 'manage-settings'];

        foreach ($permissions as $permission) {
            Permission::firstOrCreate(['name' => $permission, 'guard_name' => 'web']);
            Permission::firstOrCreate(['name' => $permission, 'guard_name' => 'api']);
        }

        // Create roles and assign permissions
        $superAdmin = Role::firstOrCreate(['name' => 'super-admin', 'guard_name' => 'web']);
        $superAdmin->syncPermissions(Permission::all()->where('guard_name', 'web'));

        $superAdminApi = Role::firstOrCreate(['name' => 'super-admin', 'guard_name' => 'api']);
        $superAdminApi->syncPermissions(Permission::all()->where('guard_name', 'api'));

        $admin = Role::firstOrCreate(['name' => 'admin', 'guard_name' => 'web']);
        $admin->syncPermissions(Permission::all()->where('guard_name', 'web'));

        $adminApi = Role::firstOrCreate(['name' => 'admin', 'guard_name' => 'api']);
        $adminApi->syncPermissions(Permission::all()->where('guard_name', 'api'));

        Role::firstOrCreate(['name' => 'driver', 'guard_name' => 'web']);
        Role::firstOrCreate(['name' => 'driver', 'guard_name' => 'api']);
        Role::firstOrCreate(['name' => 'rider', 'guard_name' => 'web']);
        Role::firstOrCreate(['name' => 'rider', 'guard_name' => 'api']);

        // Create default tenant
        $tenant = Tenant::firstOrCreate(
            ['slug' => 'default'],
            ['name' => 'Default Tenant', 'region' => 'ZA', 'currency' => 'ZAR', 'is_active' => true]
        );

        // Create admin user — plain text password; the 'hashed' cast auto-hashes on set
        $admin = User::firstOrCreate(
            ['email' => 'admin@easyryde.com'],
            [
                'tenant_id' => $tenant->id,
                'name' => 'Admin User',
                'password' => 'password',
                'phone_number' => '+27123456789',
                'role' => 'admin',
                'is_active' => true,
            ]
        );
        // Fix any existing user with a double-hashed password
        if ($admin->wasRecentlyCreated === false) {
            $admin->password = 'password';
            $admin->save();
        }
        $admin->assignRole('super-admin');
        $admin->roles()->syncWithoutDetaching(Role::findByName('super-admin', 'api'));

        // Create driver user
        $driver = User::firstOrCreate(
            ['email' => 'driver@easyryde.com'],
            [
                'tenant_id' => $tenant->id,
                'name' => 'John Driver',
                'password' => 'password',
                'phone_number' => '+27234567890',
                'role' => 'driver',
                'is_active' => true,
                'is_online' => false,
            ]
        );
        if ($driver->wasRecentlyCreated === false) {
            $driver->password = 'password';
            $driver->save();
        }
        $driver->assignRole('driver');
        $driver->roles()->syncWithoutDetaching(Role::findByName('driver', 'api'));

        DriverProfile::firstOrCreate(
            ['user_id' => $driver->id],
            [
                'license_number' => 'LIC-12345',
                'license_expiry' => '2028-12-31',
                'is_verified' => true,
                'is_approved' => true,
            ]
        );

        Vehicle::firstOrCreate(
            ['user_id' => $driver->id],
            [
                'make' => 'Toyota',
                'model' => 'Corolla',
                'year' => 2023,
                'color' => 'White',
                'license_plate' => 'CA-123-456',
                'category' => 'standard',
                'is_active' => true,
            ]
        );

        // Create rider user
        $rider = User::firstOrCreate(
            ['email' => 'rider@easyryde.com'],
            [
                'tenant_id' => $tenant->id,
                'name' => 'Jane Rider',
                'password' => 'password',
                'phone_number' => '+27345678901',
                'role' => 'rider',
                'is_active' => true,
            ]
        );
        if ($rider->wasRecentlyCreated === false) {
            $rider->password = 'password';
            $rider->save();
        }
        $rider->assignRole('rider');
        $rider->roles()->syncWithoutDetaching(Role::findByName('rider', 'api'));

        // Create wallets
        Wallet::firstOrCreate(
            ['user_id' => $driver->id],
            ['balance' => 0, 'pending_balance' => 0, 'currency' => 'ZAR']
        );
        Wallet::firstOrCreate(
            ['user_id' => $rider->id],
            ['balance' => 500, 'pending_balance' => 0, 'currency' => 'ZAR']
        );
        Wallet::firstOrCreate(
            ['user_id' => $admin->id],
            ['balance' => 0, 'pending_balance' => 0, 'currency' => 'ZAR']
        );

        // Create system settings
        $settings = [
            ['app_name', 'EasyRyde', 'text', 'Application name'],
            ['fare_minivan_base', '45', 'number', 'Base fare for minivan rides'],
            ['fare_minivan_per_km', '18', 'number', 'Per km rate for minivan'],
            ['fare_minivan_per_min', '4', 'number', 'Per minute rate for minivan'],
            ['fare_minivan_minimum', '65', 'number', 'Minimum fare for minivan'],
            ['fare_pets_base', '30', 'number', 'Base fare for pet-friendly rides'],
            ['fare_pets_per_km', '14', 'number', 'Per km rate for pets'],
            ['fare_pets_per_min', '2', 'number', 'Per minute rate for pets'],
            ['fare_pets_minimum', '45', 'number', 'Minimum fare for pets'],
            ['fare_standard_base', '35', 'number', 'Base fare for standard rides'],
            ['fare_standard_per_km', '15', 'number', 'Per km rate for standard'],
            ['fare_standard_per_min', '3', 'number', 'Per minute rate for standard'],
            ['fare_standard_minimum', '50', 'number', 'Minimum fare for standard'],
            ['fare_premium_base', '55', 'number', 'Base fare for premium rides'],
            ['fare_premium_per_km', '22', 'number', 'Per km rate for premium'],
            ['fare_premium_per_min', '5', 'number', 'Per minute rate for premium'],
            ['fare_premium_minimum', '80', 'number', 'Minimum fare for premium'],
            ['fare_delivery_base', '20', 'number', 'Base fare for deliveries'],
            ['fare_delivery_per_km', '10', 'number', 'Per km rate for delivery'],
            ['fare_delivery_per_min', '1', 'number', 'Per minute rate for delivery'],
            ['fare_delivery_minimum', '30', 'number', 'Minimum fare for delivery'],
            ['platform_fee_percent', '15', 'number', 'Platform fee percentage'],
            ['driver_search_radius', '5', 'number', 'Default driver search radius in km'],
            ['max_surge_multiplier', '2.5', 'number', 'Maximum surge pricing multiplier'],
            ['rides_pool_mode', 'both', 'enum', 'Rides fleet pool: both, private_only or easyryde_only', ['both', 'private_only', 'easyryde_only']],
            ['food_pool_mode', 'both', 'enum', 'Food fleet pool: both, private_only or easyryde_only', ['both', 'private_only', 'easyryde_only']],
            ['fraud_fine_cancel_after_pickup', '50', 'number', 'Fine for driver cancelling a ride/order after pickup'],
            ['fraud_fine_cancel_near_dropoff', '50', 'number', 'Fine for driver cancelling a ride/order near dropoff'],
            ['fraud_near_dropoff_radius_km', '1.0', 'number', 'Radius (km) from dropoff treated as near-dropoff'],
            ['fraud_collusion_window_days', '7', 'number', 'Window (days) for repeat cancel-pair collusion detection'],
            ['fraud_collusion_pair_cancels', '3', 'number', 'Cancel-pair threshold before collusion flag'],
            ['fraud_unpaid_fines_block_rides', 'false', 'boolean', 'Block drivers with unpaid fines from accepting work'],
            ['parcel_weight_surcharge_per_kg', '2', 'number', 'Per-kg surcharge above 1kg for parcel deliveries'],
            ['service_fee_amount', '10', 'number', 'Flat service fee charged on every ride'],
        ];

        foreach ($settings as $setting) {
            [$key, $value, $type, $description] = $setting;
            $options = $setting[4] ?? null;

            SystemSetting::firstOrCreate(
                ['key' => $key, 'tenant_id' => $tenant->id],
                [
                    'value' => $value,
                    'type' => $type,
                    'description' => $description,
                    'options' => $options ? json_encode($options) : null,
                ]
            );
        }
    }
}
