# Graph Report - /home/madoc-hp/Documents/EasyRyde/Absolute/graphify-out-backend  (2026-07-29)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 2003 nodes · 5241 edges · 125 communities (56 shown, 69 thin omitted)
- Extraction: 95% EXTRACTED · 5% INFERRED · 0% AMBIGUOUS · INFERRED: 253 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `650d3b11`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Illuminate\Http\Request
- FoodOrder
- KycVerification
- Illuminate\Console\Command
- Closure
- Illuminate\Http\JsonResponse
- Illuminate\Queue\SerializesModels
- IncidentReport
- PoolRide
- ApiFormRequest
- User
- Controller
- Illuminate\Database\Eloquent\Concerns\HasUuids
- Ride
- WalletService
- PromoCode
- Illuminate\Contracts\Queue\ShouldQueue
- Payment
- DriverController
- AuthController.php
- PeakHour
- StripeService
- FoodAdminController
- NotificationService
- PaymentController
- Rating
- EscrowService
- Ride.php
- Illuminate\Foundation\Http\FormRequest
- PayfastService
- Illuminate\Broadcasting\InteractsWithSockets
- AdminAuditLog
- InAppNotification
- FareCalculationService
- SosController.php
- EmailService
- ReferralCode
- Illuminate\Contracts\Broadcasting\ShouldBroadcast
- PhbimhIntegrationService
- RideStateService
- Illuminate\Database\Eloquent\Relations\BelongsTo
- Illuminate\Support\ServiceProvider
- DriverArrived
- SosAlert
- IncidentAlertNotification
- PushNotificationService
- Delivery
- DriverApproved
- RideStatusChanged
- DeliveryController.php
- RefundService
- AdminNotification
- ConsentController
- IncidentAssignRequest
- PartnerWebhookController.php
- SurgeZone
- ConsentRecord
- RideChatMessage
- ScheduledRide
- SurgePricingService
- DriverService
- HealthCheckController
- ProcessPayoutJob
- Wallet.php
- PartnerApiService
- AdminController
- ChatController.php
- DriverLocationUpdated
- PlaceController.php
- SosService
- SocketService
- PayFastService
- StripeService
- SettlementService
- WalletController
- ReferralController
- ScheduledRideController
- RideMatchingService
- EscrowService
- CashReconciliation
- MenuItem
- TrustedContact
- BreachNotificationService
- RideStatus.php
- DataRetentionController
- Illuminate\Database\Eloquent\Relations\HasOne
- NightModeService
- DriverPayout
- MonitorSystemHealthJob
- AccountApproved
- DriverPayout
- ReferralBonus
- SosAlert
- WeeklyEarningsReport
- RideFareUpdateEvent
- PlatformFeeService
- RestaurantStoreRequest
- UpdateNotificationPreferenceRequest
- RevenueReportRequest
- RideRateRequest
- ConfirmWalletTopUpRequest
- StoreSurgeZoneRequest
- UpdateSurgeZoneRequest
- ConfirmStripePaymentRequest
- .createStripeIntent
- .applyPromo
- WalletDepositRequest
- WalletWithdrawRequest
- AdminSettingsRequest
- PricingUpdateRequest
- FoodAssignDriverRequest
- FoodMenuCreateRequest
- OzowWebhookRequest
- PayFastWebhookRequest
- JoinPoolRequest
- LeavePoolRequest
- DriverActionRequest
- EventServiceProvider

## God Nodes (most connected - your core abstractions)
1. `User` - 228 edges
2. `Ride` - 209 edges
3. `ApiFormRequest` - 150 edges
4. `ApiResponse` - 93 edges
5. `Payment` - 86 edges
6. `Controller` - 83 edges
7. `FoodOrder` - 50 edges
8. `IncidentReport` - 43 edges
9. `WalletService` - 43 edges
10. `Wallet` - 39 edges

## Surprising Connections (you probably didn't know these)
- `DeliveryStatusUpdated` --references--> `Delivery`  [EXTRACTED]
  Events/DeliveryStatusUpdated.php → Models/Delivery.php
- `DriverArrived` --references--> `Ride`  [EXTRACTED]
  Events/DriverArrived.php → Models/Ride.php
- `NewRideRequest` --references--> `Ride`  [EXTRACTED]
  Events/NewRideRequest.php → Models/Ride.php
- `PaymentFailed` --references--> `Payment`  [EXTRACTED]
  Events/PaymentFailed.php → Models/Payment.php
- `PaymentSucceeded` --references--> `Payment`  [EXTRACTED]
  Events/PaymentSucceeded.php → Models/Payment.php

## Import Cycles
- None detected.

## Communities (125 total, 69 thin omitted)

### Community 0 - "Illuminate\Http\Request"
Cohesion: 0.06
Nodes (22): IncidentController, ChatMessageResource, DeliveryResource, FoodOrderItemResource, FoodOrderResource, IncidentResource, KycVerificationResource, MenuItemResource (+14 more)

### Community 1 - "FoodOrder"
Cohesion: 0.06
Nodes (10): FoodOrderStatusUpdated, Illuminate\Database\Eloquent\Collection, FoodOrder, Restaurant, FoodOrderService, FoodDeliveryService, FoodOrderService, Collection (+2 more)

### Community 2 - "KycVerification"
Cohesion: 0.06
Nodes (13): DocumentNotFoundException, EvidenceNotFoundException, KycAlreadyApprovedException, KycAlreadySubmittedException, PaymentAlreadyHeldException, KycController, KycController, KycRejectRequest (+5 more)

### Community 3 - "Illuminate\Console\Command"
Cohesion: 0.05
Nodes (17): App\Models\UserDocument, Command, EncryptExistingPii, ExpireStaleRides, LoadTestRides, ProcessDriverPayouts, PublishScheduledRides, ReleaseEscrowPayments (+9 more)

### Community 4 - "Closure"
Cohesion: 0.07
Nodes (16): Closure, AdminMiddleware, AdminTotpMiddleware, ApiRateLimiterMiddleware, DriverMiddleware, ForceHttps, InputSanitizationMiddleware, RequestTimingMiddleware (+8 more)

### Community 5 - "Illuminate\Http\JsonResponse"
Cohesion: 0.08
Nodes (7): FoodDeliveryController, InspectorController, ReportingController, RideController, UserController, ApiResponse, Illuminate\Http\JsonResponse

### Community 6 - "Illuminate\Queue\SerializesModels"
Cohesion: 0.12
Nodes (20): Illuminate\Bus\Queueable, Illuminate\Foundation\Bus\Dispatchable, Illuminate\Queue\InteractsWithQueue, Illuminate\Queue\SerializesModels, AggregateDailyStatsJob, CleanupStaleRidesJob, DriverAcceptTimeoutJob, DriverArrivalMonitorJob (+12 more)

### Community 7 - "IncidentReport"
Cohesion: 0.08
Nodes (3): IncidentReport, DataRetentionService, IncidentReportingService

### Community 8 - "PoolRide"
Cohesion: 0.10
Nodes (6): PoolController, Illuminate\Support\Collection, PoolPassenger, PoolRide, PoolFareService, PoolMatchingService

### Community 9 - "ApiFormRequest"
Cohesion: 0.06
Nodes (11): DriverApproveRequest, ApiFormRequest, FoodOrderCancelRequest, FoodOrderCreateRequest, FoodOrderRateRequest, FoodUpdateStatusRequest, FareEstimateRequest, RideCancelRequest (+3 more)

### Community 10 - "User"
Cohesion: 0.08
Nodes (12): App\Traits\EncryptsPii, App\Traits\HasTotp, DriverChannel, RideChannel, UserUpdateRequest, Illuminate\Database\Eloquent\Relations\HasMany, Illuminate\Database\Eloquent\SoftDeletes, Illuminate\Foundation\Auth\User (+4 more)

### Community 11 - "Controller"
Cohesion: 0.07
Nodes (11): DashboardController, LiveMapController, RideController, SocialAuthController, TotpController, ConfigController, NotificationPreferenceController, Controller (+3 more)

### Community 12 - "Illuminate\Database\Eloquent\Concerns\HasUuids"
Cohesion: 0.12
Nodes (7): Illuminate\Database\Eloquent\Concerns\HasUuids, Illuminate\Database\Eloquent\Factories\HasFactory, Illuminate\Database\Eloquent\Model, NotificationPreference, RestaurantCategory, Tenant, WebhookEvent

### Community 14 - "WalletService"
Cohesion: 0.13
Nodes (4): Illuminate\Database\Eloquent\Relations\MorphTo, Wallet, WalletTransaction, WalletService

### Community 15 - "PromoCode"
Cohesion: 0.09
Nodes (6): PromoCodeController, PromoCodeCreateRequest, PromoCodeUpdateRequest, ValidateCodeRequest, PromoCode, PromoCodeService

### Community 16 - "Illuminate\Contracts\Queue\ShouldQueue"
Cohesion: 0.10
Nodes (7): Illuminate\Contracts\Queue\ShouldQueue, Illuminate\Notifications\Messages\BroadcastMessage, Illuminate\Notifications\Notification, DeliveryStatusChanged, DiscountApplied, PaymentReceived, RideRequestReceived

### Community 17 - "Payment"
Cohesion: 0.12
Nodes (4): Payment, PaymentRetryService, PaymentService, LengthAwarePaginator

### Community 18 - "DriverController"
Cohesion: 0.08
Nodes (5): DriverController, ToggleOnlineRequest, VehicleRegisterRequest, UpdateLocationRequest, UpdateDriverProfileRequest

### Community 19 - "AuthController.php"
Cohesion: 0.09
Nodes (6): AuthController, CreateDriverRequest, ForgotPasswordRequest, ResetPasswordRequest, LoginRequest, RegisterRequest

### Community 20 - "PeakHour"
Cohesion: 0.12
Nodes (5): PeakHourController, StorePeakHourRequest, UpdatePeakHourRequest, Illuminate\Database\Eloquent\Builder, PeakHour

### Community 21 - "StripeService"
Cohesion: 0.12
Nodes (5): WalletController, WalletResource, OzowService, StripeService, Stripe\StripeClient

### Community 22 - "FoodAdminController"
Cohesion: 0.08
Nodes (5): FoodAdminController, CategoryStoreRequest, MenuItemStoreRequest, MenuItemUpdateRequest, RestaurantUpdateRequest

### Community 24 - "PaymentController"
Cohesion: 0.12
Nodes (3): PaymentController, DisputeRequest, RefundRequest

### Community 25 - "Rating"
Cohesion: 0.15
Nodes (4): RatingController, RatingCreateRequest, Rating, RatingService

### Community 26 - "EscrowService"
Cohesion: 0.13
Nodes (3): ProcessPayments, CashPaymentService, EscrowService

### Community 28 - "Illuminate\Foundation\Http\FormRequest"
Cohesion: 0.12
Nodes (5): ProcessPaymentRequest, StoreDeliveryRequest, UpdateSettingsRequest, StoreRideRequest, Illuminate\Foundation\Http\FormRequest

### Community 30 - "Illuminate\Broadcasting\InteractsWithSockets"
Cohesion: 0.18
Nodes (5): DriverStatusChangeEvent, PaymentFailed, PaymentSucceeded, Illuminate\Broadcasting\InteractsWithSockets, Illuminate\Foundation\Events\Dispatchable

### Community 31 - "AdminAuditLog"
Cohesion: 0.13
Nodes (3): DriverController, UserController, AdminAuditLog

### Community 32 - "InAppNotification"
Cohesion: 0.14
Nodes (4): NotificationController, RegisterTokenRequest, UnregisterTokenRequest, InAppNotification

### Community 33 - "FareCalculationService"
Cohesion: 0.16
Nodes (3): FareCalculationService, ReceiptService, RouteService

### Community 34 - "SosController.php"
Cohesion: 0.12
Nodes (4): SosController, SosAcknowledgeRequest, SosResolveRequest, SosTriggerRequest

### Community 36 - "ReferralCode"
Cohesion: 0.15
Nodes (3): ReferralCode, ReferralRedemption, ReferralService

### Community 37 - "Illuminate\Contracts\Broadcasting\ShouldBroadcast"
Cohesion: 0.14
Nodes (4): DeliveryStatusUpdated, NewRideRequest, RidePassengerLocationEvent, Illuminate\Contracts\Broadcasting\ShouldBroadcast

### Community 38 - "PhbimhIntegrationService"
Cohesion: 0.17
Nodes (3): GuzzleHttp\Client, PhbimhWebhookController, PhbimhIntegrationService

### Community 40 - "Illuminate\Database\Eloquent\Relations\BelongsTo"
Cohesion: 0.17
Nodes (4): Illuminate\Database\Eloquent\Relations\BelongsTo, Dispute, RideLocationLog, RideStatusHistory

### Community 41 - "Illuminate\Support\ServiceProvider"
Cohesion: 0.14
Nodes (5): Illuminate\Support\ServiceProvider, AppServiceProvider, HorizonServiceProvider, PaymentServiceProvider, SentryServiceProvider

### Community 42 - "DriverArrived"
Cohesion: 0.26
Nodes (7): DriverArrived, RideAccepted, RideCancelled, RideCompleted, RideStarted, Illuminate\Events\Dispatcher, SendPushNotification

### Community 43 - "SosAlert"
Cohesion: 0.18
Nodes (4): SosTriggered, SendSosAlerts, SosAlert, EscalationService

### Community 47 - "DriverApproved"
Cohesion: 0.26
Nodes (6): Illuminate\Mail\Mailable, Illuminate\Mail\Mailables\Content, Illuminate\Mail\Mailables\Envelope, DriverApproved, DriverRejected, PaymentReceipt

### Community 49 - "DeliveryController.php"
Cohesion: 0.16
Nodes (3): DeliveryController, AssignDriverRequest, UpdateStatusRequest

### Community 51 - "AdminNotification"
Cohesion: 0.22
Nodes (3): AdminNotificationController, SendAdminNotificationRequest, AdminNotification

### Community 52 - "ConsentController"
Cohesion: 0.18
Nodes (3): ConsentController, ConsentGrantRequest, ConsentRevokeRequest

### Community 53 - "IncidentAssignRequest"
Cohesion: 0.13
Nodes (3): IncidentAssignRequest, IncidentResolveRequest, IncidentStoreRequest

### Community 54 - "PartnerWebhookController.php"
Cohesion: 0.18
Nodes (3): PartnerWebhookController, OrderStatusRequest, ReceivePartnerOrderRequest

### Community 63 - "ProcessPayoutJob"
Cohesion: 0.24
Nodes (3): ProcessPayoutJob, ProcessPayoutsBatchJob, PayoutService

### Community 64 - "Wallet.php"
Cohesion: 0.21
Nodes (3): RefundRequest, RefundRequest, RefundService

### Community 69 - "PlaceController.php"
Cohesion: 0.24
Nodes (3): PlaceController, PlaceReverseRequest, PlaceSearchRequest

### Community 70 - "SosService"
Cohesion: 0.31
Nodes (3): Illuminate\Support\Facades\Notification, SosAlert, SosService

### Community 73 - "StripeService"
Cohesion: 0.16
Nodes (3): OzowService, PaymentRouter, StripeService

## Knowledge Gaps
- **69 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `User` connect `User` to `FoodOrder`, `KycVerification`, `Illuminate\Console\Command`, `Illuminate\Http\JsonResponse`, `Illuminate\Queue\SerializesModels`, `IncidentReport`, `Controller`, `Illuminate\Database\Eloquent\Concerns\HasUuids`, `Ride`, `WalletService`, `Illuminate\Contracts\Queue\ShouldQueue`, `Payment`, `AuthController.php`, `NotificationService`, `Rating`, `Ride.php`, `AdminAuditLog`, `EmailService`, `ReferralCode`, `PhbimhIntegrationService`, `RideStateService`, `PushNotificationService`, `DriverApproved`, `DeliveryController.php`, `AdminNotification`, `ConsentRecord`, `RideChatMessage`, `ScheduledRide`, `PaymentService.php`, `DriverService`, `PartnerApiService`, `AdminController`, `SosService`, `SocketService`, `SettlementService`, `RideMatchingService`, `TrustedContact`, `BreachNotificationService`, `RideStatus.php`, `Illuminate\Database\Eloquent\Relations\HasOne`, `NightModeService`, `DriverPayout`, `SosAlert`?**
  _High betweenness centrality (0.189) - this node is a cross-community bridge._
- **Why does `Ride` connect `Ride` to `Illuminate\Http\Request`, `Illuminate\Console\Command`, `Illuminate\Http\JsonResponse`, `Illuminate\Queue\SerializesModels`, `IncidentReport`, `PoolRide`, `ApiFormRequest`, `User`, `Controller`, `Illuminate\Database\Eloquent\Concerns\HasUuids`, `WalletService`, `PromoCode`, `Illuminate\Contracts\Queue\ShouldQueue`, `Payment`, `NotificationService`, `PaymentController`, `Rating`, `EscrowService`, `Ride.php`, `Illuminate\Foundation\Http\FormRequest`, `Illuminate\Broadcasting\InteractsWithSockets`, `AdminAuditLog`, `FareCalculationService`, `SosController.php`, `Illuminate\Contracts\Broadcasting\ShouldBroadcast`, `RideStateService`, `Illuminate\Database\Eloquent\Relations\BelongsTo`, `DriverArrived`, `Delivery`, `RideStatusChanged`, `RefundService`, `RideChatMessage`, `ScheduledRide`, `PaymentService.php`, `DriverService`, `AdminController`, `ChatController.php`, `SosService`, `SocketService`, `RideMatchingService`, `CashReconciliation`, `RideStatus.php`, `Illuminate\Database\Eloquent\Relations\HasOne`, `NightModeService`, `SosAlert`, `RevenueReportRequest`, `RideRateRequest`, `.createStripeIntent`, `.applyPromo`?**
  _High betweenness centrality (0.186) - this node is a cross-community bridge._
- **Why does `ApiFormRequest` connect `ApiFormRequest` to `KycVerification`, `User`, `Controller`, `PromoCode`, `DriverController`, `AuthController.php`, `PeakHour`, `FoodAdminController`, `PaymentController`, `Rating`, `Illuminate\Foundation\Http\FormRequest`, `InAppNotification`, `SosController.php`, `DeliveryController.php`, `AdminNotification`, `ConsentController`, `IncidentAssignRequest`, `PartnerWebhookController.php`, `ChatController.php`, `PlaceController.php`, `ReferralController`, `ScheduledRideController`, `RestaurantStoreRequest`, `UpdateNotificationPreferenceRequest`, `RevenueReportRequest`, `RideRateRequest`, `ConfirmWalletTopUpRequest`, `StoreSurgeZoneRequest`, `UpdateSurgeZoneRequest`, `ConfirmStripePaymentRequest`, `.createStripeIntent`, `.applyPromo`, `WalletDepositRequest`, `WalletWithdrawRequest`, `AdminSettingsRequest`, `PricingUpdateRequest`, `FoodAssignDriverRequest`, `FoodMenuCreateRequest`, `OzowWebhookRequest`, `PayFastWebhookRequest`, `JoinPoolRequest`, `LeavePoolRequest`, `DriverActionRequest`?**
  _High betweenness centrality (0.120) - this node is a cross-community bridge._
- **Are the 28 inferred relationships involving `User` (e.g. with `.index()` and `.__invoke()`) actually correct?**
  _`User` has 28 INFERRED edges - model-reasoned connections that need verification._
- **Are the 31 inferred relationships involving `Ride` (e.g. with `.join()` and `.handle()`) actually correct?**
  _`Ride` has 31 INFERRED edges - model-reasoned connections that need verification._
- **Should `Illuminate\Http\Request` be split into smaller, more focused modules?**
  _Cohesion score 0.058823529411764705 - nodes in this community are weakly interconnected._
- **Should `FoodOrder` be split into smaller, more focused modules?**
  _Cohesion score 0.059907834101382486 - nodes in this community are weakly interconnected._