<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('rides', function (Blueprint $table) {
            if (!Schema::hasColumn('rides', 'status_history')) {
                $table->json('status_history')->nullable()->after('status');
            }
            if (!Schema::hasIndex('rides', 'rides_status_index')) {
                $table->index('status');
            }
            if (!Schema::hasIndex('rides', 'rides_status_created_at_index')) {
                $table->index(['status', 'created_at']);
            }
        });
    }

    public function down(): void
    {
        if (config('database.default') === 'sqlite') {
            return;
        }

        Schema::table('rides', function (Blueprint $table) {
            if (Schema::hasIndex('rides', 'rides_status_created_at_index')) {
                $table->dropIndex(['status', 'created_at']);
            }
            if (Schema::hasIndex('rides', 'rides_status_index')) {
                $table->dropIndex('status');
            }
            if (Schema::hasColumn('rides', 'status_history')) {
                $table->dropColumn('status_history');
            }
        });
    }
};
