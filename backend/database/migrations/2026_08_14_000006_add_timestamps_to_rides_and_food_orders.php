<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('rides', function (Blueprint $table) {
            $table->timestamp('picked_up_at')->nullable()->after('started_at');
            $table->timestamp('delivered_at')->nullable()->after('picked_up_at');
        });

        Schema::table('food_orders', function (Blueprint $table) {
            $table->timestamp('picked_up_at')->nullable();
            $table->timestamp('delivered_at')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('rides', function (Blueprint $table) {
            $table->dropColumn(['picked_up_at', 'delivered_at']);
        });

        Schema::table('food_orders', function (Blueprint $table) {
            $table->dropColumn(['picked_up_at', 'delivered_at']);
        });
    }
};