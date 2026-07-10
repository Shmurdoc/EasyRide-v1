<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('pool_passengers', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('pool_ride_id');
            $table->uuid('ride_id');
            $table->uuid('user_id');
            $table->decimal('fare_share', 10, 2);
            $table->integer('pickup_order');
            $table->integer('dropoff_order');
            $table->string('status', 30)->default('pending');
            $table->timestamps();

            $table->foreign('pool_ride_id')->references('id')->on('pool_rides')->onDelete('cascade');
            $table->foreign('ride_id')->references('id')->on('rides')->onDelete('cascade');
            $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');
            $table->index('status');
            $table->index(['pool_ride_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pool_passengers');
    }
};
