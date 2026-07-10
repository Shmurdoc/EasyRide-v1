<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('driver_profiles', function (Blueprint $table) {
            $columns = ['last_location_update', 'last_known_lat', 'last_known_lng'];
            foreach ($columns as $col) {
                if (!Schema::hasColumn('driver_profiles', $col)) {
                    match ($col) {
                        'last_location_update' => $table->timestamp('last_location_update')->nullable(),
                        'last_known_lat' => $table->decimal('last_known_lat', 10, 7)->nullable(),
                        'last_known_lng' => $table->decimal('last_known_lng', 10, 7)->nullable(),
                    };
                }
            }
            if (!Schema::hasIndex('driver_profiles', 'driver_profiles_last_location_update_index')) {
                $table->index('last_location_update');
            }
        });
    }

    public function down(): void
    {
        if (config('database.default') === 'sqlite') {
            return;
        }

        Schema::table('driver_profiles', function (Blueprint $table) {
            if (Schema::hasIndex('driver_profiles', 'driver_profiles_last_location_update_index')) {
                $table->dropIndex('driver_profiles_last_location_update_index');
            }
            foreach (['last_known_lng', 'last_known_lat', 'last_location_update'] as $col) {
                if (Schema::hasColumn('driver_profiles', $col)) {
                    $table->dropColumn($col);
                }
            }
        });
    }
};
