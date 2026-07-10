<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('pool_rides', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('ride_id');
            $table->uuid('driver_id');
            $table->string('status', 30)->default('matching');
            $table->integer('max_passengers')->default(4);
            $table->integer('current_passengers')->default(1);
            $table->decimal('total_fare', 10, 2);
            $table->json('route_polyline')->nullable();
            $table->timestamps();

            $table->foreign('ride_id')->references('id')->on('rides')->onDelete('cascade');
            $table->foreign('driver_id')->references('id')->on('users')->onDelete('cascade');
            $table->index('status');
            $table->index(['driver_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pool_rides');
    }
};
