<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement("CREATE UNIQUE INDEX payments_ride_id_active_unique ON payments (ride_id) WHERE status IN ('pending', 'completed', 'paid', 'escrow_held')");
    }

    public function down(): void
    {
        DB::statement('DROP INDEX IF EXISTS payments_ride_id_active_unique');
    }
};
