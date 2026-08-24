# Security Audit Report

**Project:** EasyRyde Backend  
**Audit Date:** 2026-06-26  
**Scope:** `app/Http/Controllers/Api/V1/` (26 controllers)  
**Categories:** Ownership checks, Role checks, Input validation, Mass assignment

---

## Controller Security Scorecard

| # | Controller | Ownership | Role | Validation | Mass Assign | Score |
|---|-----------|-----------|------|------------|-------------|-------|
| 1 | AuthController | ✅ | ⚠️ | ✅ | ✅ | **7/10** |
| 2 | RideController | ✅ | ⚠️ | ✅ | ✅ | **8/10** |
| 3 | PaymentController | ✅ | ✅ | ✅ | ✅ | **8/10** |
| 4 | DriverController | ⚠️ | ⚠️ | ✅ | ✅ | **6/10** |
| 5 | AdminController | ✅ | ✅ | ✅ | ✅ | **9/10** |
| 6 | WalletController | ✅ | ✅ | ✅ | ✅ | **10/10** |
| 7 | UserController | ✅ | ✅ | ✅ | ✅ | **10/10** |
| 8 | SosController | ✅ | ✅ | ✅ | ✅ | **10/10** |
| 9 | ScheduledRideController | ✅ | ✅ | ✅ | ✅ | **10/10** |
| 10 | ReferralController | ✅ | ✅ | ✅ | ✅ | **10/10** |
| 11 | RatingController | ✅ | ✅ | ✅ | ✅ | **10/10** |
| 12 | PromoCodeController | ❌ | ✅ | ✅ | ✅ | **5/10** |
| 13 | PlaceController | ✅ | ✅ | ✅ | ✅ | **10/10** |
| 14 | NotificationController | ✅ | ✅ | ✅ | ✅ | **10/10** |
| 15 | KycController | ✅ | ⚠️ | ✅ | ✅ | **7/10** |
| 16 | IncidentController | ✅ | ⚠️ | ✅ | ✅ | **7/10** |
| 17 | FoodDeliveryController | ✅ | ✅ | ✅ | ✅ | **10/10** |
| 18 | FoodAdminController | ❌ | ⚠️ | ✅ | ✅ | **5/10** |
| 19 | DeliveryController | ✅ | ✅ | ✅ | ✅ | **10/10** |
| 20 | DataRetentionController | ✅ | ✅ | ✅ | ✅ | **10/10** |
| 21 | ConsentController | ✅ | ✅ | ✅ | ✅ | **10/10** |
| 22 | ConfigController | ✅ | ✅ | ✅ | ✅ | **10/10** |
| 23 | ChatController | ✅ | ✅ | ✅ | ✅ | **10/10** |
| 24 | ReportingController | ✅ | ✅ | ✅ | ✅ | **10/10** |
| 25 | PartnerWebhookController | ✅ | ✅ | ✅ | ✅ | **10/10** |
| 26 | HealthCheckController | ✅ | ✅ | ✅ | ✅ | **10/10** |

---

## Issues Found

### HIGH SEVERITY

#### 1. PromoCodeController — No tenant scoping on list/show, no ownership on show/update/destroy
- **File:** `PromoCodeController.php`
- **Lines:** 22-32 (index), 46-49 (show), 51-58 (update), 60-65 (destroy)
- **Issue:** `index()` does not scope to the user's tenant_id (uses optional request param only). `show()`, `update()`, and `destroy()` have **no ownership or tenant check** — any authenticated user can view, modify, or delete any promo code by ID.
- **Mitigation (route-level):** `store`, `update`, `destroy` are protected by `role:admin|super-admin` middleware, and `index`, `show` sit behind `auth:sanctum`. But no defense-in-depth ownership check.
- **Severity:** HIGH

#### 2. KycController — No role check on approve/reject at controller level
- **File:** `KycController.php`
- **Lines:** 53-57 (approve), 60-67 (reject)
- **Issue:** `approve()` and `reject()` have **no role check** in the controller. They rely entirely on route middleware (`role:admin|super-admin` + `admin.totp`). If route middleware changes, any authenticated user could approve/reject KYC verifications.
- **Recommendation:** Add `$request->user()->hasAnyRole(['admin', 'super-admin'])` check.
- **Severity:** HIGH

#### 3. KycController — No role check on pending() at controller level
- **File:** `KycController.php`
- **Lines:** 46-51
- **Issue:** `pending()` returns all pending KYC verifications with no role check. Relies solely on route middleware.
- **Severity:** HIGH

#### 4. IncidentController — Multiple actions with no controller-level role checks
- **File:** `IncidentController.php`
- **Lines:** 42-46 (index), 67-71 (open), 74-78 (assign), 80-85 (escalate), 87-94 (resolve), 96-101 (close), 103-108 (stats)
- **Issue:** These methods have **no role or ownership checks** at the controller level. `open()` exposes all open incidents. `assign()`, `escalate()`, `resolve()`, `close()` perform privileged operations. All rely on route middleware only.
- **Severity:** HIGH

#### 5. FoodAdminController — No ownership/tenant checks on items
- **File:** `FoodAdminController.php`
- **Lines:** 79-86 (updateMenuItem), 88-93 (destroyMenuItem), 95-104 (orders)
- **Issue:** `updateMenuItem` and `destroyMenuItem` have no restaurant ownership verification. `orders()` has no tenant scoping at all — shows every food order in the system.
- **Mitigation:** Routes are behind `role:admin|super-admin` + `admin.totp`.
- **Severity:** HIGH

### MEDIUM SEVERITY

#### 6. DriverController::index — No tenant scoping
- **File:** `DriverController.php`
- **Lines:** 18-32
- **Issue:** Lists ALL drivers in the system regardless of tenant. Authenticated users from any tenant can see drivers from other tenants.
- **Severity:** MEDIUM

#### 7. DriverController::show — No ownership check
- **File:** `DriverController.php`
- **Lines:** 34-46
- **Issue:** Any authenticated user can view any driver's profile by ID. No check that the viewer is the driver or an admin.
- **Severity:** MEDIUM

#### 8. PromoCodeController::index — No tenant scoping
- **File:** `PromoCodeController.php`
- **Lines:** 22-32
- **Issue:** Shows promo codes across all tenants. The `tenant_id` filter is optional from request, not enforced from the user's tenant.
- **Severity:** MEDIUM

#### 9. AuthController::createDriver — No role check
- **File:** `AuthController.php`
- **Lines:** 86-108
- **Issue:** Creates a driver account with no controller-level role check. Relies on route middleware `role:admin|super-admin` + `admin.totp`. Also uses `$validated['tenant_id']` allowing creation in any tenant.
- **Severity:** MEDIUM

#### 10. AdminController — Uses `request()` helper instead of injected `$request`
- **File:** `AdminController.php`
- **Lines:** 99-129 (approveDriver), 131-153 (rejectDriver), 155-163 (settings), 244-259 (retryPayout)
- **Issue:** Uses `request()->user()` and `request()->ip()` instead of the injected `$request` parameter. Works but is inconsistent and could cause subtle bugs if middleware changes.
- **Severity:** MEDIUM

#### 11. PaymentController::refund — No ownership check at controller level
- **File:** `PaymentController.php`
- **Lines:** 343-359
- **Issue:** `refund()` accepts any Payment and processes a refund. No check that the payment belongs to the user's tenant. Route has `role:admin|super-admin`.
- **Severity:** MEDIUM

#### 12. RideController::driverAccept — No role check
- **File:** `RideController.php`
- **Lines:** 194-210
- **Issue:** No explicit `$request->user()->hasRole('driver')` check. Any authenticated user can accept a ride. Route has `role:driver` middleware.
- **Severity:** MEDIUM

### LOW SEVERITY

#### 13. RideController::updateLocation — Updates user's location without ride ownership
- **File:** `RideController.php`
- **Lines:** 294-307
- **Issue:** Accepts a Ride model as parameter but never uses it — updates the authenticated user's location instead. Confusing parameter that suggests ownership of the ride isn't verified.
- **Severity:** LOW

#### 14. FoodAdminController::storeRestaurant — No intra-tenant ownership
- **File:** `FoodAdminController.php`
- **Lines:** 34-44
- **Issue:** Uses `...$validated` spread on `::create()` which could allow overriding `tenant_id` if the FormRequest doesn't block it.
- **Severity:** LOW

---

## Summary

| Category | Count | Details |
|----------|-------|---------|
| HIGH severity | 5 | PromoCode ownership, KYC role checks (×2), Incident role checks, FoodAdmin tenant scoping |
| MEDIUM severity | 7 | Tenant scoping gaps (Driver, PromoCode), missing role checks (Auth, Ride, Payment), inconsistent `request()` usage |
| LOW severity | 2 | Dead param, mass assignment spread |

**Overall assessment:** The app relies heavily on route middleware for authorization. While most sensitive routes are properly guarded at the route level (`role:admin|super-admin` + `admin.totp` for admin, `role:driver` for driver actions), there is **minimal defense-in-depth** in the controllers themselves. Several controllers would be wide open if a route middleware were misconfigured or removed.

### Top recommendations

1. Add controller-level role checks to `KycController` (approve, reject, pending) and `IncidentController` (assign, escalate, resolve, close, open, stats)
2. Add tenant scoping to `PromoCodeController::index` and ownership checks to PromoCode `show`/`update`/`destroy`
3. Add tenant scoping to `DriverController::index` and `FoodAdminController::orders`
4. Add a driver role check to `RideController::driverAccept()` at the controller level
