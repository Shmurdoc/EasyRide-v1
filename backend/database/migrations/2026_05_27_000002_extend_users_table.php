<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->uuid('tenant_id')->nullable()->after('id');
            $table->string('phone_number', 50)->nullable()->after('email');
            $table->string('role', 20)->default('rider')->after('phone_number');
            $table->boolean('is_active')->default(true)->after('role');
            $table->boolean('is_online')->default(false)->after('is_active');
            $table->decimal('current_latitude', 10, 7)->nullable()->after('is_online');
            $table->decimal('current_longitude', 10, 7)->nullable()->after('current_latitude');
            $table->timestamp('last_location_update')->nullable()->after('current_longitude');
            $table->uuid('current_ride_id')->nullable()->after('last_location_update');
            $table->softDeletes()->after('updated_at');

            $table->foreign('tenant_id')->references('id')->on('tenants')->onDelete('cascade');
            $table->index('role');
            $table->index('tenant_id');
            $table->index(['current_latitude', 'current_longitude']);
        });
    }

    public function down(): void
    {
        if (config('database.default') === 'sqlite') {
            return;
        }

        Schema::table('users', function (Blueprint $table) {
            $table->dropForeign(['tenant_id']);
            $table->dropIndex(['role']);
            $table->dropIndex(['tenant_id']);
            $table->dropIndex(['current_latitude', 'current_longitude']);
            $table->dropColumn([
                'tenant_id', 'phone_number', 'role', 'is_active', 'is_online',
                'current_latitude', 'current_longitude', 'last_location_update',
                'current_ride_id', 'deleted_at',
            ]);
        });
    }
};
