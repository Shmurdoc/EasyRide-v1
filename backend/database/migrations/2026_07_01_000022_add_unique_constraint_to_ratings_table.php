<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('ratings', function (Blueprint $table) {
            if (!Schema::hasIndex('ratings', 'ratings_ride_id_rater_id_unique')) {
                $table->unique(['ride_id', 'rater_id']);
            }
        });
    }

    public function down(): void
    {
        if (config('database.default') === 'sqlite') {
            return;
        }

        Schema::table('ratings', function (Blueprint $table) {
            if (Schema::hasIndex('ratings', 'ratings_ride_id_rater_id_unique')) {
                $table->dropIndex(['ride_id', 'rater_id']);
            }
        });
    }
};
