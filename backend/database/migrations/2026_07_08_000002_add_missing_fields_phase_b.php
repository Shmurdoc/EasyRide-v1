<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // MF-01, MF-02, MF-03, MF-04, MF-05, MF-06, MF-07: rides table
        Schema::table('rides', function (Blueprint $table) {
            if (!Schema::hasColumn('rides', 'estimated_distance_km')) {
                $table->decimal('estimated_distance_km', 8, 3)->nullable()->after('driver_eta');
            }
            if (!Schema::hasColumn('rides', 'estimated_fare')) {
                $table->decimal('estimated_fare', 10, 2)->nullable()->after('estimated_distance_km');
            }
            if (!Schema::hasColumn('rides', 'estimated_duration_minutes')) {
                $table->decimal('estimated_duration_minutes', 5, 1)->nullable()->after('estimated_fare');
            }
            if (!Schema::hasColumn('rides', 'pickup_note')) {
                $table->string('pickup_note', 500)->nullable()->after('pickup_address');
            }
            if (!Schema::hasColumn('rides', 'dropoff_note')) {
                $table->string('dropoff_note', 500)->nullable()->after('dropoff_address');
            }
            if (!Schema::hasColumn('rides', 'rider_cancel_reason')) {
                $table->string('rider_cancel_reason', 50)->nullable()->after('cancellation_request_reason');
            }
            if (!Schema::hasColumn('rides', 'driver_cancel_reason')) {
                $table->string('driver_cancel_reason', 50)->nullable()->after('rider_cancel_reason');
            }
        });

        // MF-09, MF-10: users table
        Schema::table('users', function (Blueprint $table) {
            if (!Schema::hasColumn('users', 'preferred_language')) {
                $table->string('preferred_language', 10)->default('en')->after('phone');
            }
            if (!Schema::hasColumn('users', 'date_of_birth')) {
                $table->date('date_of_birth')->nullable()->after('preferred_language');
            }
        });

        // MF-11, MF-12: driver_profiles table
        Schema::table('driver_profiles', function (Blueprint $table) {
            if (!Schema::hasColumn('driver_profiles', 'years_of_driving_experience')) {
                $table->unsignedSmallInteger('years_of_driving_experience')->nullable()->after('license_number');
            }
            if (!Schema::hasColumn('driver_profiles', 'languages_spoken')) {
                $table->json('languages_spoken')->nullable()->after('years_of_driving_experience');
            }
        });

        // MF-19: promo_codes table
        Schema::table('promo_codes', function (Blueprint $table) {
            if (!Schema::hasColumn('promo_codes', 'ride_types')) {
                $table->json('ride_types')->nullable()->after('max_discount');
            }
        });

        // MF-21: restaurants table
        Schema::table('restaurants', function (Blueprint $table) {
            if (!Schema::hasColumn('restaurants', 'estimated_prep_time')) {
                $table->unsignedSmallInteger('estimated_prep_time')->nullable()->after('minimum_order');
            }
        });

        // MF-27, MF-28: deliveries table
        Schema::table('deliveries', function (Blueprint $table) {
            if (!Schema::hasColumn('deliveries', 'actual_distance_km')) {
                $table->decimal('actual_distance_km', 8, 3)->nullable()->after('delivery_fee');
            }
            if (!Schema::hasColumn('deliveries', 'delivery_photo_path')) {
                $table->string('delivery_photo_path')->nullable()->after('actual_distance_km');
            }
        });

        // MF-30, MF-31: sos_alerts table
        Schema::table('sos_alerts', function (Blueprint $table) {
            if (!Schema::hasColumn('sos_alerts', 'location_accuracy')) {
                $table->decimal('location_accuracy', 5, 2)->nullable()->after('longitude');
            }
            if (!Schema::hasColumn('sos_alerts', 'admin_response_time_seconds')) {
                $table->unsignedInteger('admin_response_time_seconds')->nullable()->after('resolved_at');
            }
        });

        // MF-32: consent_records table
        Schema::table('consent_records', function (Blueprint $table) {
            if (!Schema::hasColumn('consent_records', 'consent_text')) {
                $table->text('consent_text')->nullable()->after('consent_version');
            }
        });
    }

    public function down(): void
    {
        Schema::table('consent_records', function (Blueprint $table) {
            if (Schema::hasColumn('consent_records', 'consent_text')) {
                $table->dropColumn('consent_text');
            }
        });

        Schema::table('sos_alerts', function (Blueprint $table) {
            if (Schema::hasColumn('sos_alerts', 'admin_response_time_seconds')) {
                $table->dropColumn('admin_response_time_seconds');
            }
            if (Schema::hasColumn('sos_alerts', 'location_accuracy')) {
                $table->dropColumn('location_accuracy');
            }
        });

        Schema::table('deliveries', function (Blueprint $table) {
            if (Schema::hasColumn('deliveries', 'delivery_photo_path')) {
                $table->dropColumn('delivery_photo_path');
            }
            if (Schema::hasColumn('deliveries', 'actual_distance_km')) {
                $table->dropColumn('actual_distance_km');
            }
        });

        Schema::table('restaurants', function (Blueprint $table) {
            if (Schema::hasColumn('restaurants', 'estimated_prep_time')) {
                $table->dropColumn('estimated_prep_time');
            }
        });

        Schema::table('promo_codes', function (Blueprint $table) {
            if (Schema::hasColumn('promo_codes', 'ride_types')) {
                $table->dropColumn('ride_types');
            }
        });

        Schema::table('driver_profiles', function (Blueprint $table) {
            if (Schema::hasColumn('driver_profiles', 'languages_spoken')) {
                $table->dropColumn('languages_spoken');
            }
            if (Schema::hasColumn('driver_profiles', 'years_of_driving_experience')) {
                $table->dropColumn('years_of_driving_experience');
            }
        });

        Schema::table('users', function (Blueprint $table) {
            if (Schema::hasColumn('users', 'date_of_birth')) {
                $table->dropColumn('date_of_birth');
            }
            if (Schema::hasColumn('users', 'preferred_language')) {
                $table->dropColumn('preferred_language');
            }
        });

        Schema::table('rides', function (Blueprint $table) {
            if (Schema::hasColumn('rides', 'driver_cancel_reason')) {
                $table->dropColumn('driver_cancel_reason');
            }
            if (Schema::hasColumn('rides', 'rider_cancel_reason')) {
                $table->dropColumn('rider_cancel_reason');
            }
            if (Schema::hasColumn('rides', 'dropoff_note')) {
                $table->dropColumn('dropoff_note');
            }
            if (Schema::hasColumn('rides', 'pickup_note')) {
                $table->dropColumn('pickup_note');
            }
            if (Schema::hasColumn('rides', 'estimated_duration_minutes')) {
                $table->dropColumn('estimated_duration_minutes');
            }
            if (Schema::hasColumn('rides', 'estimated_fare')) {
                $table->dropColumn('estimated_fare');
            }
            if (Schema::hasColumn('rides', 'estimated_distance_km')) {
                $table->dropColumn('estimated_distance_km');
            }
        });
    }
};
