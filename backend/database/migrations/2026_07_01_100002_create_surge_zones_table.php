<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('surge_zones', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('tenant_id')->nullable()->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->decimal('center_lat', 10, 7);
            $table->decimal('center_lng', 10, 7);
            $table->integer('radius_meters')->default(1000);
            $table->decimal('multiplier', 3, 2)->default(1.00);
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->index(['tenant_id', 'is_active']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('surge_zones');
    }
};
