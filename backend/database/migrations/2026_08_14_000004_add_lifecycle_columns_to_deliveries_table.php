<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('deliveries', function (Blueprint $table) {
            $table->timestamp('accepted_at')->nullable()->after('status');
            $table->string('cancelled_by', 40)->nullable()->after('accepted_at');
            $table->timestamp('cancelled_at')->nullable()->after('cancelled_by');
            $table->string('cancellation_reason', 255)->nullable()->after('cancelled_at');
            $table->string('weight_tier', 20)->nullable()->after('package_weight_kg');
            $table->text('pod_photo_url')->nullable()->after('delivery_note');
            $table->timestamp('pod_photo_received_at')->nullable()->after('pod_photo_url');
            $table->json('status_history')->nullable()->after('pod_photo_received_at');
        });
    }

    public function down(): void
    {
        Schema::table('deliveries', function (Blueprint $table) {
            $table->dropColumn([
                'accepted_at', 'cancelled_by', 'cancelled_at', 'cancellation_reason',
                'weight_tier', 'pod_photo_url', 'pod_photo_received_at', 'status_history',
            ]);
        });
    }
};