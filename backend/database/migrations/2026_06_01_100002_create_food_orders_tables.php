<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('food_orders', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id');
            $table->uuid('restaurant_id');
            $table->uuid('customer_id');
            $table->uuid('driver_id')->nullable();
            $table->uuid('delivery_id')->nullable();
            $table->string('status', 30)->default('pending');
            $table->decimal('subtotal', 10, 2);
            $table->decimal('delivery_fee', 8, 2)->default(0.00);
            $table->decimal('service_fee', 8, 2)->default(0.00);
            $table->decimal('tip_amount', 8, 2)->default(0.00);
            $table->decimal('total_amount', 10, 2);
            $table->text('delivery_address');
            $table->decimal('delivery_latitude', 10, 7);
            $table->decimal('delivery_longitude', 10, 7);
            $table->text('delivery_notes')->nullable();
            $table->timestamp('estimated_delivery_at')->nullable();
            $table->timestamp('actual_delivery_at')->nullable();
            $table->timestamp('cancelled_at')->nullable();
            $table->uuid('cancelled_by')->nullable();
            $table->text('cancellation_reason')->nullable();
            $table->string('payment_method', 30)->default('cash');
            $table->string('payment_status', 30)->default('pending');
            $table->uuid('payment_id')->nullable();
            $table->integer('rating')->nullable();
            $table->text('rating_comment')->nullable();
            $table->timestamps();

            $table->foreign('tenant_id')->references('id')->on('tenants')->onDelete('cascade');
            $table->foreign('restaurant_id')->references('id')->on('restaurants')->onDelete('cascade');
            $table->foreign('customer_id')->references('id')->on('users')->onDelete('cascade');
            $table->foreign('driver_id')->references('id')->on('users')->onDelete('set null');
            $table->foreign('delivery_id')->references('id')->on('deliveries')->onDelete('set null');
            $table->foreign('cancelled_by')->references('id')->on('users')->onDelete('set null');
            $table->index(['tenant_id', 'status']);
            $table->index(['customer_id', 'status']);
            $table->index(['driver_id', 'status']);
            $table->index('restaurant_id');
            $table->index('status');
        });

        Schema::create('food_order_items', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('food_order_id');
            $table->uuid('menu_item_id')->nullable();
            $table->string('name', 255);
            $table->decimal('price', 8, 2);
            $table->integer('quantity')->default(1);
            $table->text('special_instructions')->nullable();
            $table->decimal('line_total', 10, 2);
            $table->timestamps();

            $table->foreign('food_order_id')->references('id')->on('food_orders')->onDelete('cascade');
            $table->foreign('menu_item_id')->references('id')->on('menu_items')->onDelete('set null');
            $table->index('food_order_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('food_order_items');
        Schema::dropIfExists('food_orders');
    }
};
