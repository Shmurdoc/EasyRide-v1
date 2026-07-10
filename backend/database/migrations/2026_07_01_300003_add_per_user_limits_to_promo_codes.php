<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('promo_code_usages', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('promo_code_id');
            $table->uuid('user_id');
            $table->timestamp('used_at');
            $table->timestamps();

            $table->foreign('promo_code_id')->references('id')->on('promo_codes')->onDelete('cascade');
            $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');
            $table->index(['promo_code_id', 'user_id']);
        });

        Schema::table('promo_codes', function (Blueprint $table) {
            $table->unsignedInteger('max_uses_per_user')->default(1)->after('max_uses');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('promo_code_usages');

        Schema::table('promo_codes', function (Blueprint $table) {
            $table->dropColumn('max_uses_per_user');
        });
    }
};
