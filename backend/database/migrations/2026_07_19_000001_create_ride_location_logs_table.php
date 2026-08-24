<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ride_location_logs', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('ride_id');
            $table->uuid('driver_id');
            $table->decimal('latitude', 10, 7);
            $table->decimal('longitude', 10, 7);
            $table->decimal('accuracy_meters', 8, 2)->nullable();
            $table->decimal('speed_kmh', 6, 2)->nullable();
            $table->decimal('heading', 5, 1)->nullable();
            $table->integer('battery_level')->nullable();
            $table->boolean('is_spoofed')->default(false);
            $table->text('spoof_reason')->nullable();
            $table->timestamp('recorded_at');
            $table->timestamps();

            $table->index('ride_id');
            $table->index('driver_id');
            $table->index(['ride_id', 'recorded_at']);
            $table->index('is_spoofed');
        });

        Schema::table('rides', function (Blueprint $table) {
            if (!Schema::hasColumn('rides', 'estimated_fare_at_booking')) {
                $table->decimal('estimated_fare_at_booking', 8, 2)->nullable()->after('total_fare');
            }
            if (!Schema::hasColumn('rides', 'fare_calculation_log')) {
                $table->json('fare_calculation_log')->nullable()->after('estimated_fare_at_booking');
            }
            if (!Schema::hasColumn('rides', 'server_calculated_distance_km')) {
                $table->decimal('server_calculated_distance_km', 8, 3)->nullable()->after('duration_minutes');
            }
            if (!Schema::hasColumn('rides', 'server_calculated_duration_minutes')) {
                $table->decimal('server_calculated_duration_minutes', 6, 1)->nullable()->after('server_calculated_distance_km');
            }
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ride_location_logs');

        Schema::table('rides', function (Blueprint $table) {
            foreach (['estimated_fare_at_booking', 'fare_calculation_log', 'server_calculated_distance_km', 'server_calculated_duration_minutes'] as $col) {
                if (Schema::hasColumn('rides', $col)) {
                    $table->dropColumn($col);
                }
            }
        });
    }
};
