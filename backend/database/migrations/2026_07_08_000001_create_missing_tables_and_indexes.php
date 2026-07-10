<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // --- Missing Tables ---

        // DT-02: bank_accounts (driver bank accounts for payouts)
        if (!Schema::hasTable('bank_accounts')) {
            Schema::create('bank_accounts', function (Blueprint $table) {
                $table->uuid('id')->primary();
                $table->uuid('user_id');
                $table->string('bank_name'); // e.g., 'Capitec', 'FNB', 'Standard Bank'
                $table->string('account_number'); // Encrypted
                $table->string('account_type')->default('savings'); // savings, current
                $table->string('branch_code')->nullable();
                $table->string('account_holder_name');
                $table->boolean('is_verified')->default(false);
                $table->boolean('is_primary')->default(false);
                $table->timestamps();

                $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');
                $table->index('user_id');
            });
        }

        // DT-03: user_documents (KYC document storage)
        if (!Schema::hasTable('user_documents')) {
            Schema::create('user_documents', function (Blueprint $table) {
                $table->uuid('id')->primary();
                $table->uuid('user_id');
                $table->string('document_type'); // 'id_card', 'drivers_license', 'proof_of_address', 'vehicle_registration'
                $table->string('file_path');
                $table->string('file_name');
                $table->string('mime_type');
                $table->unsignedBigInteger('file_size');
                $table->string('status')->default('pending'); // pending, approved, rejected
                $table->text('rejection_reason')->nullable();
                $table->uuid('verified_by')->nullable();
                $table->timestamp('verified_at')->nullable();
                $table->timestamps();

                $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');
                $table->foreign('verified_by')->references('id')->on('users')->nullOnDelete();
                $table->index('user_id');
                $table->index(['user_id', 'document_type']);
                $table->index('status');
            });
        }

        // DT-05: promo_code_redemptions (track individual promo usage)
        if (!Schema::hasTable('promo_code_redemptions')) {
            Schema::create('promo_code_redemptions', function (Blueprint $table) {
                $table->uuid('id')->primary();
                $table->uuid('promo_code_id');
                $table->uuid('user_id');
                $table->uuid('ride_id')->nullable();
                $table->decimal('discount_amount', 10, 2);
                $table->string('status')->default('applied'); // applied, cancelled, expired
                $table->timestamps();

                $table->foreign('promo_code_id')->references('id')->on('promo_codes')->onDelete('cascade');
                $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');
                $table->foreign('ride_id')->references('id')->on('rides')->nullOnDelete();
                $table->index('promo_code_id');
                $table->index('user_id');
                $table->index(['promo_code_id', 'user_id']);
            });
        }

        // DT-07: ride_feedback (post-ride feedback beyond ratings)
        if (!Schema::hasTable('ride_feedback')) {
            Schema::create('ride_feedback', function (Blueprint $table) {
                $table->uuid('id')->primary();
                $table->uuid('ride_id');
                $table->uuid('user_id');
                $table->string('feedback_type'); // 'safety', 'cleanliness', 'navigation', 'behavior', 'other'
                $table->text('description')->nullable();
                $table->boolean('requires_follow_up')->default(false);
                $table->string('status')->default('submitted'); // submitted, reviewed, resolved
                $table->uuid('reviewed_by')->nullable();
                $table->text('admin_notes')->nullable();
                $table->timestamp('reviewed_at')->nullable();
                $table->timestamps();

                $table->foreign('ride_id')->references('id')->on('rides')->onDelete('cascade');
                $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');
                $table->foreign('reviewed_by')->references('id')->on('users')->nullOnDelete();
                $table->index('ride_id');
                $table->index('user_id');
                $table->index('status');
                $table->index(['status', 'requires_follow_up']);
            });
        }

        // --- Missing Indexes ---

        Schema::table('rides', function (Blueprint $table) {
            if (!Schema::hasIndex('rides', 'rides_status_created_at_index')) {
                $table->index(['status', 'created_at']);
            }
        });

        Schema::table('payments', function (Blueprint $table) {
            if (!Schema::hasIndex('payments', 'payments_status_created_at_index')) {
                $table->index(['status', 'created_at']);
            }
        });

        if (Schema::hasTable('food_orders')) {
            Schema::table('food_orders', function (Blueprint $table) {
                if (!Schema::hasIndex('food_orders', 'food_orders_status_created_at_index')) {
                    $table->index(['status', 'created_at']);
                }
                if (!Schema::hasIndex('food_orders', 'food_orders_driver_id_status_index')) {
                    $table->index(['driver_id', 'status']);
                }
            });
        }

        if (Schema::hasTable('sos_alerts')) {
            Schema::table('sos_alerts', function (Blueprint $table) {
                if (!Schema::hasIndex('sos_alerts', 'sos_alerts_status_created_at_index')) {
                    $table->index(['status', 'created_at']);
                }
            });
        }

        if (Schema::hasTable('promo_codes')) {
            Schema::table('promo_codes', function (Blueprint $table) {
                if (!Schema::hasIndex('promo_codes', 'promo_codes_code_is_active_index')) {
                    $table->index(['code', 'is_active']);
                }
            });
        }
    }

    public function down(): void
    {
        // Drop indexes
        if (Schema::hasTable('promo_codes') && Schema::hasIndex('promo_codes', 'promo_codes_code_is_active_index')) {
            Schema::table('promo_codes', function (Blueprint $table) {
                $table->dropIndex('promo_codes_code_is_active_index');
            });
        }

        if (Schema::hasTable('sos_alerts') && Schema::hasIndex('sos_alerts', 'sos_alerts_status_created_at_index')) {
            Schema::table('sos_alerts', function (Blueprint $table) {
                $table->dropIndex('sos_alerts_status_created_at_index');
            });
        }

        if (Schema::hasTable('food_orders')) {
            Schema::table('food_orders', function (Blueprint $table) {
                if (Schema::hasIndex('food_orders', 'food_orders_driver_id_status_index')) {
                    $table->dropIndex('food_orders_driver_id_status_index');
                }
                if (Schema::hasIndex('food_orders', 'food_orders_status_created_at_index')) {
                    $table->dropIndex('food_orders_status_created_at_index');
                }
            });
        }

        if (Schema::hasIndex('payments', 'payments_status_created_at_index')) {
            Schema::table('payments', function (Blueprint $table) {
                $table->dropIndex('payments_status_created_at_index');
            });
        }

        if (Schema::hasIndex('rides', 'rides_status_created_at_index')) {
            Schema::table('rides', function (Blueprint $table) {
                $table->dropIndex('rides_status_created_at_index');
            });
        }

        // Drop tables
        Schema::dropIfExists('ride_feedback');
        Schema::dropIfExists('promo_code_redemptions');
        Schema::dropIfExists('user_documents');
        Schema::dropIfExists('bank_accounts');
    }
};
