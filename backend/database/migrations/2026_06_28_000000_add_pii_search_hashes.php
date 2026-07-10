<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('email_hash')->nullable()->unique()->after('email');
            $table->string('phone_hash')->nullable()->index()->after('phone_number');
        });
    }

    public function down(): void
    {
        if (config('database.default') === 'sqlite') {
            return;
        }

        Schema::table('users', function (Blueprint $table) {
            $table->dropIndex(['email_hash']);
            $table->dropColumn(['email_hash', 'phone_hash']);
        });
    }
};
