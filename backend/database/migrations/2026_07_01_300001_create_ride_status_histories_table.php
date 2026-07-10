<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ride_status_histories', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('ride_id');
            $table->string('from_status', 30);
            $table->string('to_status', 30);
            $table->uuid('actor_id')->nullable();
            $table->text('reason')->nullable();
            $table->timestamps();

            $table->foreign('ride_id')->references('id')->on('rides')->onDelete('cascade');
            $table->foreign('actor_id')->references('id')->on('users')->onDelete('set null');
            $table->index('ride_id');
            $table->index(['ride_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ride_status_histories');
    }
};
