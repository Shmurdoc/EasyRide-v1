<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('rides', function (Blueprint $table) {
            if (!Schema::hasIndex('rides', 'rides_rider_id_index')) {
                $table->index('rider_id');
            }
            if (!Schema::hasIndex('rides', 'rides_driver_id_index')) {
                $table->index('driver_id');
            }
            if (!Schema::hasIndex('rides', 'rides_rider_id_status_index')) {
                $table->index(['rider_id', 'status']);
            }
            if (!Schema::hasIndex('rides', 'rides_driver_id_status_index')) {
                $table->index(['driver_id', 'status']);
            }
        });

        Schema::table('payments', function (Blueprint $table) {
            if (!Schema::hasIndex('payments', 'payments_payer_id_index')) {
                $table->index('payer_id');
            }
            if (!Schema::hasIndex('payments', 'payments_payer_id_status_index')) {
                $table->index(['payer_id', 'status']);
            }
        });

        Schema::table('wallet_transactions', function (Blueprint $table) {
            if (!Schema::hasIndex('wallet_transactions', 'wallet_transactions_wallet_id_index')) {
                $table->index('wallet_id');
            }
            if (!Schema::hasIndex('wallet_transactions', 'wallet_transactions_wallet_id_created_at_index')) {
                $table->index(['wallet_id', 'created_at']);
            }
        });

        if (Schema::hasTable('in_app_notifications')) {
            Schema::table('in_app_notifications', function (Blueprint $table) {
                if (!Schema::hasIndex('in_app_notifications', 'in_app_notifications_user_id_index')) {
                    $table->index('user_id');
                }
                if (!Schema::hasIndex('in_app_notifications', 'in_app_notifications_user_id_read_at_index')) {
                    $table->index(['user_id', 'read_at']);
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
                if (Schema::hasIndex('in_app_notifications', 'in_app_notifications_user_id_read_at_index')) {
                    $table->dropIndex(['user_id', 'read_at']);
                }
                if (Schema::hasIndex('in_app_notifications', 'in_app_notifications_user_id_index')) {
                    $table->dropIndex('user_id');
                }
            });
        }

        Schema::table('wallet_transactions', function (Blueprint $table) {
            if (Schema::hasIndex('wallet_transactions', 'wallet_transactions_wallet_id_created_at_index')) {
                $table->dropIndex(['wallet_id', 'created_at']);
            }
            if (Schema::hasIndex('wallet_transactions', 'wallet_transactions_wallet_id_index')) {
                $table->dropIndex('wallet_id');
            }
        });

        Schema::table('payments', function (Blueprint $table) {
            if (Schema::hasIndex('payments', 'payments_payer_id_status_index')) {
                $table->dropIndex(['payer_id', 'status']);
            }
            if (Schema::hasIndex('payments', 'payments_payer_id_index')) {
                $table->dropIndex('payer_id');
            }
        });

        Schema::table('rides', function (Blueprint $table) {
            if (Schema::hasIndex('rides', 'rides_driver_id_status_index')) {
                $table->dropIndex(['driver_id', 'status']);
            }
            if (Schema::hasIndex('rides', 'rides_rider_id_status_index')) {
                $table->dropIndex(['rider_id', 'status']);
            }
            if (Schema::hasIndex('rides', 'rides_driver_id_index')) {
                $table->dropIndex('driver_id');
            }
            if (Schema::hasIndex('rides', 'rides_rider_id_index')) {
                $table->dropIndex('rider_id');
            }
        });
    }
};
