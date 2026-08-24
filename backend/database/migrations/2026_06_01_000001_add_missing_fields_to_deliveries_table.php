<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('deliveries', function (Blueprint $table) {
            $table->uuid('sender_id')->nullable()->after('tenant_id');
            $table->uuid('driver_id')->nullable()->after('sender_id');
            $table->text('item_description')->nullable()->after('description');
            $table->decimal('item_value', 10, 2)->nullable()->after('item_description');
            $table->text('pickup_address')->nullable()->after('recipient_longitude');
            $table->decimal('pickup_lat', 10, 7)->nullable()->after('pickup_address');
            $table->decimal('pickup_lng', 10, 7)->nullable()->after('pickup_lat');
            $table->text('dropoff_address')->nullable()->after('pickup_lng');
            $table->decimal('dropoff_lat', 10, 7)->nullable()->after('dropoff_address');
            $table->decimal('dropoff_lng', 10, 7)->nullable()->after('dropoff_lat');
            $table->string('payment_method', 30)->nullable()->after('dropoff_lng');
            $table->string('payment_status', 30)->default('pending')->after('payment_method');
            $table->decimal('fare_amount', 10, 2)->nullable()->after('payment_status');
            $table->text('notes')->nullable()->after('fare_amount');

            $table->foreign('sender_id')->references('id')->on('users')->onDelete('set null');
            $table->foreign('driver_id')->references('id')->on('users')->onDelete('set null');
            $table->index('sender_id');
            $table->index('driver_id');
        });
    }

    public function down(): void
    {
        Schema::table('deliveries', function (Blueprint $table) {
            $table->dropForeign(['sender_id']);
            $table->dropForeign(['driver_id']);
            $table->dropForeign(['tenant_id', 'status']);
            $table->dropColumn([
                'sender_id', 'driver_id', 'item_description', 'item_value',
                'pickup_address', 'pickup_lat', 'pickup_lng',
                'dropoff_address', 'dropoff_lat', 'dropoff_lng',
                'payment_method', 'payment_status', 'fare_amount', 'notes',
            ]);
        });
    }
};
