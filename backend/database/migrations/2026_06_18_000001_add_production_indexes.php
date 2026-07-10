<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('rides', function (Blueprint $table) {
            $table->index(['status', 'created_at']);
        });

        Schema::table('users', function (Blueprint $table) {
            $table->index(['role', 'is_online', 'is_approved']);
            $table->index('phone_number');
        });

        Schema::table('payments', function (Blueprint $table) {
            $table->index(['payer_id', 'status']);
            $table->index('ride_id');
        });
    }

    public function down(): void
    {
        if (config('database.default') === 'sqlite') {
            return;
        }

        Schema::table('rides', function (Blueprint $table) {
            $table->dropIndex(['status', 'created_at']);
        });

        Schema::table('users', function (Blueprint $table) {
            $table->dropIndex(['role', 'is_online', 'is_approved']);
            $table->dropIndex(['phone_number']);
        });

        Schema::table('payments', function (Blueprint $table) {
            $table->dropIndex(['payer_id', 'status']);
            $table->dropIndex(['ride_id']);
        });
    }
};
