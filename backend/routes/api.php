<?php

use App\Http\Controllers\Admin\DashboardController as AdminDashboardController;
use App\Http\Controllers\Admin\DriverController as AdminDriverController;
use App\Http\Controllers\Admin\LiveMapController as AdminLiveMapController;
use App\Http\Controllers\Admin\PaymentController as AdminPaymentController;
use App\Http\Controllers\Admin\RideController as AdminRideController;
use App\Http\Controllers\Admin\UserController as AdminUserController;
use App\Http\Controllers\Api\V1\AdminController;
use App\Http\Controllers\Api\V1\Auth\SocialAuthController;
use App\Http\Controllers\Api\V1\Auth\TotpController;
use App\Http\Controllers\Api\V1\AuthController;
use App\Http\Controllers\Api\V1\ChatController;
use App\Http\Controllers\Api\V1\ConfigController;
use App\Http\Controllers\Api\V1\ConsentController;
use App\Http\Controllers\Api\V1\DataRetentionController;
use App\Http\Controllers\Api\V1\DeliveryController;
use App\Http\Controllers\Api\V1\DriverViolationController;
use App\Http\Controllers\Api\V1\DriverController;
use App\Http\Controllers\Api\V1\FoodAdminController;
use App\Http\Controllers\Api\V1\FoodDeliveryController;
use App\Http\Controllers\Api\V1\HealthCheckController;
use App\Http\Controllers\Api\V1\InspectorController;
use App\Http\Controllers\Api\V1\IncidentController;
use App\Http\Controllers\Api\V1\KycController;
use App\Http\Controllers\Api\V1\NotificationController;
use App\Http\Controllers\Api\V1\AdminNotificationController;
use App\Http\Controllers\Api\V1\NotificationPreferenceController;
use App\Http\Controllers\Api\V1\PartnerWebhookController;
use App\Http\Controllers\Api\V1\PaymentController;
use App\Http\Controllers\Api\V1\PhbimhWebhookController;
use App\Http\Controllers\Api\V1\PeakHourController;
use App\Http\Controllers\Api\V1\PoolController;
use App\Http\Controllers\Api\V1\SurgeZoneController;
use App\Http\Controllers\Api\V1\PlaceController;
use App\Http\Controllers\Api\V1\PromoCodeController;
use App\Http\Controllers\Api\V1\RatingController;
use App\Http\Controllers\Api\V1\ReferralController;
use App\Http\Controllers\Api\V1\ReportingController;
use App\Http\Controllers\Api\V1\RideController;
use App\Http\Controllers\Api\V1\ScheduledRideController;
use App\Http\Controllers\Api\V1\SosController;
use App\Http\Controllers\Api\V1\UserController;
use App\Http\Controllers\Api\V1\WalletController;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->group(function () {
    // Health check endpoint
    Route::get('health', HealthCheckController::class)->middleware('throttle:api');

    // Public config endpoint
    Route::get('config', ConfigController::class)->middleware('throttle:api');

    // Public auth routes
    Route::prefix('auth')->group(function () {
        Route::post('register', [AuthController::class, 'register'])->middleware('throttle:auth-register');
        Route::post('login', [AuthController::class, 'login'])->middleware('throttle:auth-login');
        Route::post('forgot-password', [AuthController::class, 'forgotPassword'])->middleware('throttle:auth-password');
        Route::post('reset-password', [AuthController::class, 'resetPassword'])->middleware('throttle:auth-password');
        Route::post('refresh', [AuthController::class, 'refresh'])->middleware('auth:sanctum');
        Route::get('{provider}/redirect', [SocialAuthController::class, 'redirect'])->middleware('throttle:social-auth');
        Route::get('{provider}/callback', [SocialAuthController::class, 'callback'])->middleware('throttle:social-auth');
    });

    // Public promo validation
    Route::post('promo-codes/validate', [PromoCodeController::class, 'validateCode'])->middleware('throttle:promo-apply');

    // Webhook routes (no auth — protected by IP whitelist + signature verification)
    Route::prefix('webhooks')->middleware('throttle:api')->group(function () {
        Route::post('payfast', [PaymentController::class, 'payfastWebhook'])->middleware('webhook.ip:payfast');
        Route::get('payfast/return', [PaymentController::class, 'payfastReturn']);
        Route::post('ozow', [PaymentController::class, 'ozowWebhook'])->middleware('webhook.ip:ozow');
        Route::get('ozow/return', [PaymentController::class, 'ozowReturn']);
        Route::post('partner/order', [PartnerWebhookController::class, 'receiveOrder'])->middleware('webhook.ip:partner');
        Route::post('partner/status', [PartnerWebhookController::class, 'orderStatus'])->middleware('webhook.ip:partner');
        Route::post('stripe', [PaymentController::class, 'stripeWebhook'])->middleware('webhook.ip:stripe');
        Route::post('twilio', [PaymentController::class, 'twilioWebhook'])->middleware('webhook.ip:twilio');
        // PHBIMH Integration
        Route::post('phbimh', [PhbimhWebhookController::class, 'handleWebhook'])->middleware('webhook.ip:phbimh');
    });

    // Public discovery routes
    Route::get('places/search', [PlaceController::class, 'search'])->middleware('throttle:api');
    Route::get('places/reverse', [PlaceController::class, 'reverse'])->middleware('throttle:api');
    Route::get('rides/fare-estimate', [RideController::class, 'fareEstimate'])->middleware('throttle:api');

    // Authenticated routes
    Route::middleware('auth:sanctum')->group(function () {
        Route::post('auth/logout', [AuthController::class, 'logout']);
        Route::get('auth/me', [AuthController::class, 'me']);

        // Users
        Route::apiResource('users', UserController::class)->except(['store']);
        Route::get('admin/stats', [UserController::class, 'adminStats'])->middleware('role:admin|super-admin');

        // Rides
        Route::prefix('rides')->group(function () {
            Route::get('/', [RideController::class, 'index']);
            Route::post('/', [RideController::class, 'store'])->middleware('throttle:ride-create');
            Route::get('current', [RideController::class, 'current']);
            Route::get('{ride}', [RideController::class, 'show']);
            Route::post('{ride}/cancel', [RideController::class, 'cancel'])->middleware('throttle:ride-cancel');
            Route::post('{ride}/rate', [RideController::class, 'rate']);
            Route::post('{ride}/apply-promo', [RideController::class, 'applyPromo']);
            Route::post('{ride}/no-show', [RideController::class, 'markNoShow']);
            Route::post('{ride}/driver-accept', [RideController::class, 'driverAccept'])->middleware('role:driver');
            Route::post('{ride}/driver-arrived', [RideController::class, 'driverArrived'])->middleware('role:driver');
            Route::post('{ride}/start', [RideController::class, 'startRide'])->middleware('role:driver');
            Route::post('{ride}/complete', [RideController::class, 'completeRide'])->middleware('role:driver');
            Route::post('{ride}/location', [RideController::class, 'updateLocation']);
            Route::get('{ride}/receipt', [RideController::class, 'receipt']);
        });

        // Drivers
        Route::middleware('role:driver')->prefix('drivers')->group(function () {
            Route::get('nearby-rides', [DriverController::class, 'nearbyRides']);
            Route::put('profile', [DriverController::class, 'updateProfile']);
            Route::post('vehicle', [DriverController::class, 'registerVehicle']);
            Route::post('toggle-online', [DriverController::class, 'toggleOnline']);
            Route::get('earnings', [DriverController::class, 'earnings']);
            Route::get('trips', [DriverController::class, 'trips']);
            Route::get('stats', [DriverController::class, 'stats']);
            Route::get('deliveries', [DeliveryController::class, 'driverDeliveries']);
        });

        // Driver general (accessible by admin too)
        Route::prefix('drivers')->group(function () {
            Route::get('/', [DriverController::class, 'index']);
            Route::get('{driver}', [DriverController::class, 'show']);
        });

        // Driver location update (standalone)
        Route::post('drivers/location', [DriverController::class, 'updateLocation'])->middleware(['role:driver', 'throttle:driver-location']);

        // Driver conduct / fines
        Route::middleware('role:driver')->prefix('violations')->group(function () {
            Route::get('/', [DriverViolationController::class, 'myViolations']);
            Route::post('{violation}/pay', [DriverViolationController::class, 'pay'])->middleware('throttle:payments');
        });

        // Payments
        Route::prefix('payments')->group(function () {
            Route::get('/', [PaymentController::class, 'index']);
            Route::get('methods', [PaymentController::class, 'methods']);
            Route::get('{payment}', [PaymentController::class, 'show']);
            Route::post('rides/{ride}/pay', [PaymentController::class, 'processRidePayment'])->middleware('throttle:payments');
            Route::post('{payment}/refund', [PaymentController::class, 'refund'])->middleware('role:admin|super-admin');
            Route::post('{payment}/dispute', [PaymentController::class, 'dispute']);
            Route::post('stripe/create-intent', [PaymentController::class, 'createStripeIntent'])->middleware('throttle:payments');
            Route::post('stripe/confirm', [PaymentController::class, 'confirmStripePayment'])->middleware('throttle:payments');
        });

        // Wallet
        Route::prefix('wallet')->group(function () {
            Route::get('/', [WalletController::class, 'show']);
            Route::get('transactions', [WalletController::class, 'transactions']);
            Route::post('deposit', [WalletController::class, 'deposit'])->middleware('throttle:wallet-deposit');
            Route::post('confirm', [WalletController::class, 'confirm'])->middleware('throttle:wallet-confirm');
            Route::post('withdraw', [WalletController::class, 'withdraw'])->middleware('throttle:wallet-withdraw');
        });

        // Ratings
        Route::prefix('ratings')->group(function () {
            Route::get('/', [RatingController::class, 'index']);
            Route::get('given', [RatingController::class, 'given']);
            Route::post('/', [RatingController::class, 'store']);
            Route::get('{rating}', [RatingController::class, 'show']);
        });

        // Promo Codes
        Route::prefix('promo-codes')->middleware('throttle:promo-crud')->group(function () {
            Route::get('/', [PromoCodeController::class, 'index']);
            Route::get('{promoCode}', [PromoCodeController::class, 'show']);
            Route::post('/', [PromoCodeController::class, 'store'])->middleware('role:admin|super-admin');
            Route::put('{promoCode}', [PromoCodeController::class, 'update'])->middleware('role:admin|super-admin');
            Route::delete('{promoCode}', [PromoCodeController::class, 'destroy'])->middleware('role:admin|super-admin');
        });

        // Deliveries
        Route::prefix('deliveries')->group(function () {
            Route::get('/', [DeliveryController::class, 'index']);
            Route::post('/', [DeliveryController::class, 'store']);
            Route::post('quote', [DeliveryController::class, 'quote']);
            Route::get('available', [DeliveryController::class, 'availableDeliveries'])->middleware('role:driver');
            Route::get('{delivery}', [DeliveryController::class, 'show']);
            Route::put('{delivery}/status', [DeliveryController::class, 'updateStatus']);
            Route::post('{delivery}/accept', [DeliveryController::class, 'driverAccept'])->middleware('role:driver');
            Route::post('{delivery}/cancel', [DeliveryController::class, 'driverCancel'])->middleware('role:driver');
            Route::post('{delivery}/assign', [DeliveryController::class, 'assignDriver'])->middleware('role:admin|super-admin');
        });

        // Food Delivery
        Route::prefix('food')->group(function () {
            Route::get('restaurants', [FoodDeliveryController::class, 'restaurants']);
            Route::get('restaurants/{restaurant}', [FoodDeliveryController::class, 'show']);
            Route::get('restaurants/{restaurant}/menu', [FoodDeliveryController::class, 'menu']);
            Route::post('restaurants/{restaurant}/order', [FoodDeliveryController::class, 'createOrder']);
            Route::get('orders', [FoodDeliveryController::class, 'myOrders']);
            Route::get('orders/{order}', [FoodDeliveryController::class, 'showOrder']);
            Route::post('orders/{order}/cancel', [FoodDeliveryController::class, 'cancelOrder']);
            Route::post('orders/{order}/rate', [FoodDeliveryController::class, 'rateOrder']);
        });

        // Driver food orders
        Route::middleware('role:driver')->prefix('driver/food')->group(function () {
            Route::get('orders', [FoodDeliveryController::class, 'driverOrders']);
            Route::get('orders/available', [FoodDeliveryController::class, 'availableOrders']);
            Route::post('orders/{order}/accept', [FoodDeliveryController::class, 'driverAcceptOrder']);
            Route::post('orders/{order}/cancel', [FoodDeliveryController::class, 'driverCancelOrder']);
            Route::post('orders/{order}/status', [FoodDeliveryController::class, 'updateStatus']);
        });

        // Restaurant orders (for restaurant staff)
        Route::prefix('restaurant/food')->group(function () {
            Route::get('orders', [FoodDeliveryController::class, 'restaurantOrders']);
        });

        // Notifications
        Route::prefix('notifications')->group(function () {
            Route::get('/', [NotificationController::class, 'index']);
            Route::get('unread-count', [NotificationController::class, 'unreadCount']);
            Route::post('{notification}/read', [NotificationController::class, 'markAsRead']);
            Route::post('read-all', [NotificationController::class, 'markAllAsRead']);
            Route::post('register-token', [NotificationController::class, 'registerToken']);
            Route::post('unregister-token', [NotificationController::class, 'unregisterToken']);
        });

        // Notification Preferences
        Route::get('notifications/preferences', [NotificationPreferenceController::class, 'index']);
        Route::put('notifications/preferences', [NotificationPreferenceController::class, 'update']);

        // Scheduled Rides
        Route::prefix('scheduled-rides')->group(function () {
            Route::get('/', [ScheduledRideController::class, 'index']);
            Route::post('/', [ScheduledRideController::class, 'store']);
            Route::post('{id}/cancel', [ScheduledRideController::class, 'cancel']);
        });

        // Referrals
        Route::prefix('referrals')->group(function () {
            Route::get('/my-code', [ReferralController::class, 'myCode']);
            Route::post('/apply', [ReferralController::class, 'apply']);
            Route::get('/stats', [ReferralController::class, 'stats']);
        });

        // SOS
        Route::prefix('sos')->middleware('throttle:sos')->group(function () {
            Route::post('/', [SosController::class, 'trigger']);
            Route::post('{id}/cancel', [SosController::class, 'cancel']);
            Route::post('{id}/acknowledge', [SosController::class, 'acknowledge'])->middleware('role:admin|super-admin');
            Route::post('{id}/resolve', [SosController::class, 'resolve'])->middleware('role:admin|super-admin');
            Route::get('/active', [SosController::class, 'active'])->middleware('role:admin|super-admin');
        });

        // Chat
        Route::prefix('chat')->middleware('throttle:chat')->group(function () {
            Route::get('rides/{ride}/messages', [ChatController::class, 'messages']);
            Route::post('rides/{ride}/messages', [ChatController::class, 'send']);
            Route::get('rides/{ride}/unread', [ChatController::class, 'unread']);
            Route::post('rides/{ride}/read', [ChatController::class, 'markRead']);
        });

        // Reporting (admin)
        Route::prefix('admin/reports')->middleware('role:admin|super-admin')->group(function () {
            Route::get('dashboard', [ReportingController::class, 'dashboard']);
            Route::get('revenue', [ReportingController::class, 'revenue']);
            Route::get('drivers', [ReportingController::class, 'drivers']);
            Route::get('rides', [ReportingController::class, 'rides']);
            Route::get('revenue/export', [ReportingController::class, 'revenueExport']);
        });

        // Admin TOTP 2FA Management
        // enable/verify: role-protected only (TOTP not yet enabled, so can't require it)
        Route::prefix('admin')->middleware('role:admin|super-admin')->group(function () {
            Route::post('totp/enable', [TotpController::class, 'enable'])->middleware('throttle:totp-verify');
            Route::post('totp/verify', [TotpController::class, 'verify'])->middleware('throttle:totp-verify');
        });

        // disable: role-protected AND TOTP-protected (must provide current TOTP to disable 2FA)
        Route::prefix('admin')->middleware(['role:admin|super-admin', 'admin.totp'])->group(function () {
            Route::post('totp/disable', [TotpController::class, 'disable'])->middleware('throttle:totp-verify');
        });

        Route::prefix('admin')->middleware(['role:admin|super-admin', 'admin.totp'])->group(function () {
            Route::get('dashboard', [AdminController::class, 'dashboard']);
            Route::get('users', [AdminController::class, 'users'])->name('admin.users.index');
            Route::get('rides', [AdminController::class, 'rides']);
            Route::get('drivers', [AdminController::class, 'drivers']);
            Route::post('drivers', [AuthController::class, 'createDriver']);
            Route::post('drivers/{driver}/approve', [AdminController::class, 'approveDriver']);
            Route::post('drivers/{driver}/reject', [AdminController::class, 'rejectDriver']);
            Route::put('drivers/{driver}/fleet-type', [AdminController::class, 'updateDriverFleetType']);
            Route::get('settings', [AdminController::class, 'settings']);
            Route::post('settings', [AdminController::class, 'updateSettings']);
            Route::get('audit-logs', [AdminController::class, 'auditLogs']);

            // Conduct / Fraud Console
            Route::prefix('violations')->group(function () {
                Route::get('/', [DriverViolationController::class, 'index']);
                Route::get('{violation}', [DriverViolationController::class, 'show']);
                Route::post('{violation}/waive', [DriverViolationController::class, 'waive']);
                Route::post('{violation}/resolve-dispute', [DriverViolationController::class, 'resolveDispute']);
            });

            // Live Map
            Route::get('live-map/drivers', AdminLiveMapController::class);

            // Food Delivery Admin
            Route::prefix('food')->group(function () {
                Route::get('restaurants', [FoodAdminController::class, 'restaurants']);
                Route::post('restaurants', [FoodAdminController::class, 'storeRestaurant']);
                Route::put('restaurants/{restaurant}', [FoodAdminController::class, 'updateRestaurant']);
                Route::post('restaurants/{restaurant}/categories', [FoodAdminController::class, 'storeCategory']);
                Route::post('restaurants/{restaurant}/menu-items', [FoodAdminController::class, 'storeMenuItem']);
                Route::put('menu-items/{item}', [FoodAdminController::class, 'updateMenuItem']);
                Route::delete('menu-items/{item}', [FoodAdminController::class, 'destroyMenuItem']);
                Route::get('orders', [FoodAdminController::class, 'orders']);
                Route::post('food-orders/{order}/assign-driver', [FoodDeliveryController::class, 'assignDriver']);
            });

            // Payouts
            Route::prefix('payouts')->group(function () {
                Route::get('/', [AdminController::class, 'payouts']);
                Route::get('summary', [AdminController::class, 'payoutSummary']);
                Route::post('{payout}/retry', [AdminController::class, 'retryPayout']);
            });

            // Admin Notifications
            Route::prefix('notifications')->group(function () {
                Route::get('/', [AdminNotificationController::class, 'index']);
                Route::post('/', [AdminNotificationController::class, 'send']);
            });

            // Peak Hours
            Route::apiResource('peak-hours', PeakHourController::class);
            Route::patch('peak-hours/{peak_hour}/toggle', [PeakHourController::class, 'toggle']);

            // Surge Zones
            Route::apiResource('surge-zones', SurgeZoneController::class);
            Route::patch('surge-zones/{surge_zone}/toggle', [SurgeZoneController::class, 'toggle']);

            // Compliance Admin
            Route::prefix('compliance')->group(function () {
                Route::get('kyc/pending', [KycController::class, 'pending']);
                Route::post('kyc/{verification}/approve', [KycController::class, 'approve']);
                Route::post('kyc/{verification}/reject', [KycController::class, 'reject']);
                Route::get('incidents', [IncidentController::class, 'index']);
                Route::get('incidents/open', [IncidentController::class, 'open']);
                Route::get('incidents/stats', [IncidentController::class, 'stats']);
                Route::post('incidents/{incident}/assign', [IncidentController::class, 'assign']);
                Route::post('incidents/{incident}/escalate', [IncidentController::class, 'escalate']);
                Route::post('incidents/{incident}/resolve', [IncidentController::class, 'resolve']);
                Route::post('incidents/{incident}/close', [IncidentController::class, 'close']);
                Route::get('data-retention', [DataRetentionController::class, 'retentionInfo']);
                Route::post('data-retention/cleanup', [DataRetentionController::class, 'runCleanup']);
            });

            // Admin Dashboard (new dedicated controllers)
            Route::prefix('dashboard')->group(function () {
                Route::get('/', [AdminDashboardController::class, 'index']);
                Route::get('revenue/{period}', [AdminDashboardController::class, 'revenue'])
                    ->whereIn('period', ['day', 'week', 'month']);
                Route::get('rides/{period}', [AdminDashboardController::class, 'rides'])
                    ->whereIn('period', ['day', 'week', 'month']);
            });

            // Admin User Management
            Route::prefix('manage/users')->group(function () {
                Route::get('/', [AdminUserController::class, 'index']);
                Route::get('{user}', [AdminUserController::class, 'show']);
                Route::put('{user}', [AdminUserController::class, 'update']);
                Route::post('{user}/suspend', [AdminUserController::class, 'suspend']);
                Route::post('{user}/activate', [AdminUserController::class, 'activate']);
            });

            // Admin Driver Management
            Route::prefix('manage/drivers')->group(function () {
                Route::get('/', [AdminDriverController::class, 'index']);
                Route::get('{driver}', [AdminDriverController::class, 'show']);
                Route::post('{driver}/approve', [AdminDriverController::class, 'approve']);
                Route::post('{driver}/reject', [AdminDriverController::class, 'reject']);
                Route::post('{driver}/suspend', [AdminDriverController::class, 'suspend']);
                Route::get('{driver}/documents', [AdminDriverController::class, 'verifyDocuments']);
            });

            // Admin Ride Management
            Route::prefix('manage/rides')->group(function () {
                Route::get('/', [AdminRideController::class, 'index']);
                Route::get('{ride}', [AdminRideController::class, 'show']);
                Route::post('{ride}/dispute', [AdminRideController::class, 'dispute']);
                Route::post('{ride}/resolve', [AdminRideController::class, 'resolve']);
            });

            // Admin Payment Management
            Route::prefix('manage/payments')->group(function () {
                Route::get('/', [AdminPaymentController::class, 'index']);
                Route::post('{payment}/refund', [AdminPaymentController::class, 'refund']);
                Route::get('reconciliation', [AdminPaymentController::class, 'reconciliation']);
            });

            // Admin Wallet & Payout Management
            Route::prefix('wallets')->group(function () {
                Route::get('/', [\App\Http\Controllers\Admin\WalletController::class, 'driverWallets']);
                Route::get('stats', [\App\Http\Controllers\Admin\WalletController::class, 'overview']);
                Route::get('transactions', [\App\Http\Controllers\Admin\WalletController::class, 'transactionHistory']);
                Route::get('cash-reconciliation', [\App\Http\Controllers\Admin\WalletController::class, 'cashReconciliation']);
                Route::post('cash-reconciliation/{payment}/reconcile', [\App\Http\Controllers\Admin\WalletController::class, 'reconcilePayment']);
                Route::get('{wallet}/transactions', [\App\Http\Controllers\Admin\WalletController::class, 'walletTransactions']);
                Route::get('payout-queue', [\App\Http\Controllers\Admin\WalletController::class, 'payoutQueue']);
                Route::post('payouts/bulk-approve', [\App\Http\Controllers\Admin\WalletController::class, 'bulkApprovePayouts']);
                Route::post('payouts/{payout}/approve', [\App\Http\Controllers\Admin\WalletController::class, 'approvePayout']);
                Route::post('payouts/{payout}/reject', [\App\Http\Controllers\Admin\WalletController::class, 'rejectPayout']);
                Route::post('payouts/{payout}/process', [\App\Http\Controllers\Admin\WalletController::class, 'processPayout']);
            });

            // Admin KYC Management
            Route::prefix('manage/kyc')->group(function () {
                Route::get('/', [\App\Http\Controllers\Admin\KycController::class, 'index']);
                Route::get('stats', [\App\Http\Controllers\Admin\KycController::class, 'stats']);
                Route::get('{verification}', [\App\Http\Controllers\Admin\KycController::class, 'show']);
                Route::post('{verification}/approve', [\App\Http\Controllers\Admin\KycController::class, 'approve']);
                Route::post('{verification}/reject', [\App\Http\Controllers\Admin\KycController::class, 'reject']);
                Route::post('bulk-approve', [\App\Http\Controllers\Admin\KycController::class, 'bulkApprove']);
            });
        });

        // Restaurants (top-level alias)
        Route::get('restaurants', [FoodDeliveryController::class, 'restaurants']);

        // Food Orders (top-level alias)
        Route::get('food-orders', [FoodDeliveryController::class, 'myOrders']);

        // Pool Rides (top-level listing)
        Route::get('pool-rides', [PoolController::class, 'index']);

        // Pool Rides
        Route::prefix('pool')->group(function () {
            Route::post('/join', [PoolController::class, 'join']);
            Route::post('/leave', [PoolController::class, 'leave']);
            Route::get('/{id}/status', [PoolController::class, 'status']);
            Route::get('/matches', [PoolController::class, 'matches']);
        });

        // Pool Rides (Driver)
        Route::middleware('role:driver')->prefix('driver')->group(function () {
            Route::get('/pool/{id}/passengers', [PoolController::class, 'driverPassengers']);
            Route::patch('/pool/{id}/passenger/{passengerId}/pickup', [PoolController::class, 'markPickup']);
            Route::patch('/pool/{id}/passenger/{passengerId}/dropoff', [PoolController::class, 'markDropoff']);
        });

        // Consent
        Route::prefix('consent')->group(function () {
            Route::get('/', [ConsentController::class, 'index']);
            Route::post('/grant', [ConsentController::class, 'grant']);
            Route::post('/revoke', [ConsentController::class, 'revoke']);
            Route::get('/history', [ConsentController::class, 'history']);
        });

        // KYC
        Route::prefix('kyc')->group(function () {
            Route::post('/', [KycController::class, 'submit']);
            Route::get('/my', [KycController::class, 'myVerifications']);
            Route::get('/{verification}/{documentType}', [KycController::class, 'download']);
        });

        // Incidents
        Route::prefix('incidents')->group(function () {
            Route::post('/', [IncidentController::class, 'store']);
            Route::get('/my', [IncidentController::class, 'myIncidents']);
            Route::get('/{incident}', [IncidentController::class, 'show']);
            Route::get('/{incident}/evidence/{index}', [IncidentController::class, 'downloadEvidence']);
        });

        // Inspector (admin only - exposes operational metrics)
        Route::prefix('inspector')->middleware('role:admin|super-admin')->group(function () {
            Route::get('/api-stats', [InspectorController::class, 'apiStats']);
            Route::get('/ride-flow', [InspectorController::class, 'rideFlow']);
            Route::get('/queue-health', [InspectorController::class, 'queueHealth']);
            Route::get('/my-stats', [InspectorController::class, 'myStats']);
        });

        // Data Rights (POPIA)
        Route::prefix('data')->group(function () {
            Route::get('/export', [DataRetentionController::class, 'exportData']);
            Route::post('/anonymize', [DataRetentionController::class, 'requestAnonymization']);
            Route::delete('/erasure', [DataRetentionController::class, 'requestErasure']);
        });
    });
});
