<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('wallets', function (Blueprint $table) {
            if (!Schema::hasColumn('wallets', 'balance_snapshot')) {
                $table->decimal('balance_snapshot', 12, 2)->nullable();
            }
            if (!Schema::hasColumn('wallets', 'snapshot_at')) {
                $table->timestamp('snapshot_at')->nullable();
            }
            if (!Schema::hasIndex('wallets', 'wallets_balance_snapshot_index')) {
                $table->index('balance_snapshot');
            }
        });
    }

    public function down(): void
    {
        if (config('database.default') === 'sqlite') {
            return;
        }

        Schema::table('wallets', function (Blueprint $table) {
            if (Schema::hasIndex('wallets', 'wallets_balance_snapshot_index')) {
                $table->dropIndex('wallets_balance_snapshot_index');
            }
            if (Schema::hasColumn('wallets', 'snapshot_at')) {
                $table->dropColumn('snapshot_at');
            }
            if (Schema::hasColumn('wallets', 'balance_snapshot')) {
                $table->dropColumn('balance_snapshot');
            }
        });
    }
};
