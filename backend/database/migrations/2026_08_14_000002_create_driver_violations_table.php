<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('driver_violations', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id')->nullable()->index();
            $table->uuid('driver_id')->nullable()->index();
            $table->uuid('rider_id')->nullable()->index();
            $table->uuid('ride_id')->nullable();
            $table->uuid('food_order_id')->nullable();
            $table->uuid('delivery_id')->nullable();
            $table->string('violation_type', 40)->index();
            $table->decimal('fine_amount', 10, 2)->default(0);
            $table->string('status', 20)->default('pending')->index();
            $table->decimal('distance_to_dropoff_km', 8, 2)->nullable();
            $table->string('reason', 255)->nullable();
            $table->json('evidence')->nullable();
            $table->uuid('decided_by')->nullable();
            $table->timestamp('decided_at')->nullable();
            $table->timestamps();

            $table->index(['tenant_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('driver_violations');
    }
};