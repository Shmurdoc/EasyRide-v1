<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('notification_preferences', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('user_id');
            $table->boolean('push_enabled')->default(true);
            $table->boolean('email_enabled')->default(true);
            $table->boolean('sms_enabled')->default(true);
            $table->boolean('in_app_enabled')->default(true);
            $table->boolean('ride_updates')->default(true);
            $table->boolean('payment_updates')->default(true);
            $table->boolean('promotions')->default(true);
            $table->boolean('marketing')->default(true);
            $table->boolean('security_alerts')->default(true);
            $table->timestamps();

            $table->unique('user_id');
            $table->foreign('user_id')->references('id')->on('users')->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('notification_preferences');
    }
};
