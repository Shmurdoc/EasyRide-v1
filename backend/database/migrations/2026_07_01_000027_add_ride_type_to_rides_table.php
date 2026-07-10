<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('rides', function (Blueprint $table) {
            if (!Schema::hasColumn('rides', 'ride_type')) {
                $table->string('ride_type')->default('standard')->after('status');
            }
            if (!Schema::hasIndex('rides', 'rides_ride_type_index')) {
                $table->index('ride_type');
            }
        });
    }

    public function down(): void
    {
        if (config('database.default') === 'sqlite') {
            return;
        }

        Schema::table('rides', function (Blueprint $table) {
            if (Schema::hasIndex('rides', 'rides_ride_type_index')) {
                $table->dropIndex('rides_ride_type_index');
            }
            if (Schema::hasColumn('rides', 'ride_type')) {
                $table->dropColumn('ride_type');
            }
        });
    }
};
