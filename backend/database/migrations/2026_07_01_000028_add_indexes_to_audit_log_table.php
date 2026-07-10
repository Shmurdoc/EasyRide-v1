<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('admin_audit_logs', function (Blueprint $table) {
            if (!Schema::hasIndex('admin_audit_logs', 'admin_audit_logs_user_id_index')) {
                $table->index('user_id');
            }
            if (!Schema::hasIndex('admin_audit_logs', 'admin_audit_logs_action_index')) {
                $table->index('action');
            }
            if (!Schema::hasIndex('admin_audit_logs', 'admin_audit_logs_resource_type_resource_id_index')) {
                $table->index(['resource_type', 'resource_id']);
            }
            if (!Schema::hasIndex('admin_audit_logs', 'admin_audit_logs_created_at_index')) {
                $table->index('created_at');
            }
        });
    }

    public function down(): void
    {
        if (config('database.default') === 'sqlite') {
            return;
        }

        Schema::table('admin_audit_logs', function (Blueprint $table) {
            if (Schema::hasIndex('admin_audit_logs', 'admin_audit_logs_created_at_index')) {
                $table->dropIndex('admin_audit_logs_created_at_index');
            }
            if (Schema::hasIndex('admin_audit_logs', 'admin_audit_logs_resource_type_resource_id_index')) {
                $table->dropIndex('admin_audit_logs_resource_type_resource_id_index');
            }
            if (Schema::hasIndex('admin_audit_logs', 'admin_audit_logs_action_index')) {
                $table->dropIndex('admin_audit_logs_action_index');
            }
            if (Schema::hasIndex('admin_audit_logs', 'admin_audit_logs_user_id_index')) {
                $table->dropIndex('admin_audit_logs_user_id_index');
            }
        });
    }
};
