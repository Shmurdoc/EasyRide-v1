<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('payments', function (Blueprint $table) {
            if (!Schema::hasColumn('payments', 'idempotency_key')) {
                $table->string('idempotency_key')->nullable()->unique()->after('id');
            }
            if (!Schema::hasIndex('payments', 'payments_status_index')) {
                $table->index('status');
            }
            if (!Schema::hasIndex('payments', 'payments_status_created_at_index')) {
                $table->index(['status', 'created_at']);
            }
        });
    }

    public function down(): void
    {
        if (config('database.default') === 'sqlite') {
            return;
        }

        Schema::table('payments', function (Blueprint $table) {
            if (Schema::hasIndex('payments', 'payments_status_created_at_index')) {
                $table->dropIndex(['status', 'created_at']);
            }
            if (Schema::hasIndex('payments', 'payments_status_index')) {
                $table->dropIndex('status');
            }
            if (Schema::hasColumn('payments', 'idempotency_key')) {
                $table->dropIndex('payments_idempotency_key_unique');
                $table->dropColumn('idempotency_key');
            }
        });
    }
};
