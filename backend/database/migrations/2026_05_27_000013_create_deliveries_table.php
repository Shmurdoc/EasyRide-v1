<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('deliveries', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id');
            $table->uuid('ride_id')->nullable();
            $table->string('type', 30)->default('parcel');
            $table->text('description')->nullable();
            $table->text('sender_name')->nullable();
            $table->text('sender_phone')->nullable();
            $table->text('recipient_name')->nullable();
            $table->text('recipient_phone')->nullable();
            $table->text('recipient_address')->nullable();
            $table->decimal('recipient_latitude', 10, 7)->nullable();
            $table->decimal('recipient_longitude', 10, 7)->nullable();
            $table->text('pickup_notes')->nullable();
            $table->text('delivery_notes')->nullable();
            $table->string('package_size', 20)->default('small');
            $table->decimal('package_weight_kg', 6, 2)->nullable();
            $table->decimal('estimated_value', 10, 2)->nullable();
            $table->boolean('requires_signature')->default(false);
            $table->boolean('is_fragile')->default(false);
            $table->string('status', 30)->default('pending');
            $table->timestamp('picked_up_at')->nullable();
            $table->timestamp('delivered_at')->nullable();
            $table->timestamps();

            $table->foreign('tenant_id')->references('id')->on('tenants')->onDelete('cascade');
            $table->foreign('ride_id')->references('id')->on('rides')->onDelete('set null');
            $table->index('status');
            $table->index(['tenant_id', 'status']);
            $table->index('type');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('deliveries');
    }
};
