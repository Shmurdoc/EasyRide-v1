<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('admin_notifications', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('title', 100);
            $table->string('body', 500);
            $table->string('type')->default('general');
            $table->string('audience')->default('all');
            $table->uuid('user_id')->nullable();
            $table->unsignedInteger('sent_count')->default(0);
            $table->unsignedInteger('failed_count')->default(0);
            $table->string('status')->default('sending');
            $table->timestamp('sent_at')->nullable();
            $table->uuid('tenant_id')->nullable();
            $table->timestamps();

            $table->index('tenant_id');
            $table->index('status');
            $table->index('created_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('admin_notifications');
    }
};
