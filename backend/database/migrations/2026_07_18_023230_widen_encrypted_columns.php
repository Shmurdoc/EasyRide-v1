<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('driver_profiles', function (Blueprint $table) {
            $table->text('license_number')->nullable()->change();
            $table->text('id_number')->nullable()->change();
            $table->text('emergency_contact_name')->nullable()->change();
            $table->text('emergency_contact_phone')->nullable()->change();
        });
    }

    public function down(): void
    {
        Schema::table('driver_profiles', function (Blueprint $table) {
            $table->string('license_number', 100)->nullable()->change();
            $table->string('id_number', 100)->nullable()->change();
            $table->string('emergency_contact_name', 100)->nullable()->change();
            $table->string('emergency_contact_phone', 100)->nullable()->change();
        });
    }
};
