<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 1. rides (rider_id, created_at) — composite index for rider ride history queries
        Schema::table('rides', function (Blueprint $table) {
            if (!Schema::hasIndex('rides', 'rides_rider_id_created_at_index')) {
                $table->index(['rider_id', 'created_at']);
            }
        });

        // 2. wallet_transactions (wallet_id, created_at) — skip if already exists
        if (!Schema::hasIndex('wallet_transactions', 'wallet_transactions_wallet_id_created_at_index')) {
            Schema::table('wallet_transactions', function (Blueprint $table) {
                $table->index(['wallet_id', 'created_at']);
            });
        }

        // 3. deliveries — add rider_id column and index
        Schema::table('deliveries', function (Blueprint $table) {
            if (!Schema::hasColumn('deliveries', 'rider_id')) {
                $table->uuid('rider_id')->nullable()->after('ride_id');
                $table->foreign('rider_id')->references('id')->on('users')->onDelete('set null');
            }
            if (!Schema::hasIndex('deliveries', 'deliveries_rider_id_index')) {
                $table->index('rider_id');
            }
        });

        // 4. pool_rides (rider_id, status) — for pool ride queries
        Schema::table('pool_rides', function (Blueprint $table) {
            if (!Schema::hasColumn('pool_rides', 'rider_id')) {
                $table->uuid('rider_id')->nullable()->after('driver_id');
                $table->foreign('rider_id')->references('id')->on('users')->onDelete('cascade');
            }
            if (!Schema::hasIndex('pool_rides', 'pool_rides_rider_id_status_index')) {
                $table->index(['rider_id', 'status']);
            }
        });
    }

    public function down(): void
    {
        if (config('database.default') === 'sqlite') {
            return;
        }

        Schema::table('pool_rides', function (Blueprint $table) {
            if (Schema::hasIndex('pool_rides', 'pool_rides_rider_id_status_index')) {
                $table->dropIndex('pool_rides_rider_id_status_index');
            }
            if (Schema::hasColumn('pool_rides', 'rider_id') && Schema::hasColumn('users', 'id')) {
                $table->dropForeignIfExists('pool_rides_rider_id_foreign');
                $table->dropColumn('rider_id');
            }
        });

        Schema::table('deliveries', function (Blueprint $table) {
            if (Schema::hasIndex('deliveries', 'deliveries_rider_id_index')) {
                $table->dropIndex('deliveries_rider_id_index');
            }
            if (Schema::hasColumn('deliveries', 'rider_id') && Schema::hasColumn('users', 'id')) {
                $table->dropForeignIfExists('deliveries_rider_id_foreign');
                $table->dropColumn('rider_id');
            }
        });

        Schema::table('wallet_transactions', function (Blueprint $table) {
            if (Schema::hasIndex('wallet_transactions', 'wallet_transactions_wallet_id_created_at_index')) {
                $table->dropIndex('wallet_transactions_wallet_id_created_at_index');
            }
        });

        Schema::table('rides', function (Blueprint $table) {
            if (Schema::hasIndex('rides', 'rides_rider_id_created_at_index')) {
                $table->dropIndex('rides_rider_id_created_at_index');
            }
        });
    }
};
