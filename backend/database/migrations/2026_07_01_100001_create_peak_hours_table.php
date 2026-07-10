<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('peak_hours', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('tenant_id')->nullable()->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->unsignedTinyInteger('day_of_week')->comment('0=Sunday, 6=Saturday');
            $table->time('start_time');
            $table->time('end_time');
            $table->decimal('multiplier', 3, 2)->default(1.00);
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->index(['tenant_id', 'is_active']);
            $table->index(['tenant_id', 'day_of_week']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('peak_hours');
    }
};
