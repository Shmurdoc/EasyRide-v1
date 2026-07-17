<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // rides: driver_id + created_at for driver ride history queries
        Schema::table('rides', function (Blueprint $table) {
            if (!Schema::hasIndex('rides', 'rides_driver_id_created_at_index')) {
                $table->index(['driver_id', 'created_at']);
            }
        });

        // payments: ride_id + created_at for payment lookups by ride
        Schema::table('payments', function (Blueprint $table) {
            if (!Schema::hasIndex('payments', 'payments_ride_id_created_at_index')) {
                $table->index(['ride_id', 'created_at']);
            }
        });

        // in_app_notifications: user_id + is_read + created_at for unread notification queries
        if (Schema::hasTable('in_app_notifications')) {
            Schema::table('in_app_notifications', function (Blueprint $table) {
                if (!Schema::hasIndex('in_app_notifications', 'in_app_notifications_user_id_is_read_created_at_index')) {
                    $table->index(['user_id', 'is_read', 'created_at']);
                }
            });
        }
    }

    public function down(): void
    {
        if (config('database.default') === 'sqlite') {
            return;
        }

        if (Schema::hasTable('in_app_notifications')) {
            Schema::table('in_app_notifications', function (Blueprint $table) {
                if (Schema::hasIndex('in_app_notifications', 'in_app_notifications_user_id_is_read_created_at_index')) {
                    $table->dropIndex('in_app_notifications_user_id_is_read_created_at_index');
                }
            });
        }

        Schema::table('payments', function (Blueprint $table) {
            if (Schema::hasIndex('payments', 'payments_ride_id_created_at_index')) {
                $table->dropIndex('payments_ride_id_created_at_index');
            }
        });

        Schema::table('rides', function (Blueprint $table) {
            if (Schema::hasIndex('rides', 'rides_driver_id_created_at_index')) {
                $table->dropIndex('rides_driver_id_created_at_index');
            }
        });
    }
};
