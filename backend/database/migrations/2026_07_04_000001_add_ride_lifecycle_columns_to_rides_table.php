<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('rides', function (Blueprint $table) {
            $table->decimal('cancellation_fee', 8, 2)->nullable()->after('discount_amount');
            $table->boolean('cancelled_by_system')->default(false)->after('cancelled_by');
            $table->boolean('rider_en_route_to_pickup')->default(false)->after('cancelled_by_system');
            $table->decimal('search_radius_km', 5, 2)->default(5.0)->after('rider_en_route_to_pickup');
            $table->timestamp('driver_notified_at')->nullable()->after('search_radius_km');
            $table->timestamp('arrived_at')->nullable()->after('driver_notified_at');
            $table->timestamp('waiting_started_at')->nullable()->after('arrived_at');
            $table->timestamp('no_show_at')->nullable()->after('waiting_started_at');
            $table->timestamp('cancellation_requested_at')->nullable()->after('no_show_at');
            $table->string('cancellation_request_reason')->nullable()->after('cancellation_requested_at');
            $table->integer('estimated_arrival_seconds')->nullable()->after('cancellation_request_reason');
            $table->timestamp('pickup_reached_at')->nullable()->after('estimated_arrival_seconds');
            $table->timestamp('dropoff_reached_at')->nullable()->after('pickup_reached_at');
        });
    }

    public function down(): void
    {
        Schema::table('rides', function (Blueprint $table) {
            $table->dropColumn([
                'cancellation_fee', 'cancelled_by_system', 'rider_en_route_to_pickup',
                'search_radius_km', 'driver_notified_at', 'arrived_at',
                'waiting_started_at', 'no_show_at', 'cancellation_requested_at',
                'cancellation_request_reason', 'estimated_arrival_seconds',
                'pickup_reached_at', 'dropoff_reached_at',
            ]);
        });
    }
};
