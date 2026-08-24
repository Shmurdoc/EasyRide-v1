<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('scheduled_rides', function (Blueprint $table) {
            $table->foreignUuid('rider_id')->nullable()->change();
        });
    }

    public function down(): void
    {
        Schema::table('scheduled_rides', function (Blueprint $table) {
            $table->foreignUuid('rider_id')->nullable(false)->change();
        });
    }
};
