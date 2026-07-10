<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('trusted_contacts', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('owner_id')->constrained('users')->cascadeOnDelete();
            $table->string('name', 100);
            $table->string('phone_number', 20);
            $table->string('relationship', 50)->default('friend');
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->index('owner_id');
            $table->index(['owner_id', 'is_active']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('trusted_contacts');
    }
};
