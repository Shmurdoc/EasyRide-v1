<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('in_app_notifications')) {
            Schema::table('in_app_notifications', function (Blueprint $table) {
                if (!Schema::hasColumn('in_app_notifications', 'dedup_hash')) {
                    $table->string('dedup_hash')->nullable()->after('id');
                }
                if (!Schema::hasIndex('in_app_notifications', 'in_app_notifications_dedup_hash_index')) {
                    $table->index('dedup_hash');
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
                if (Schema::hasIndex('in_app_notifications', 'in_app_notifications_dedup_hash_index')) {
                    $table->dropIndex('in_app_notifications_dedup_hash_index');
                }
                if (Schema::hasColumn('in_app_notifications', 'dedup_hash')) {
                    $table->dropColumn('dedup_hash');
                }
            });
        }
    }
};
