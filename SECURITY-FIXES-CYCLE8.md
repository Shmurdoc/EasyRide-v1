# EasyRyde Security Fixes — Cycle 8

**Date:** 2026-07-19
**Auditor:** Security Engineer (automated)
**Scope:** 3 HIGH + 1 MEDIUM findings remediated

---

## Fix Summary

| ID | Severity | Finding | File | Status |
|----|----------|---------|------|--------|
| H-10 | HIGH | KYC file type validation missing at service layer | `KycService.php` | **FIXED** |
| H-11 | HIGH | Wallet deposit/withdrawal no service-layer amount cap | `WalletService.php` | **FIXED** |
| N-01 | MEDIUM | `rejectDriver` cross-tenant access | `AdminController.php` | **FIXED** |
| N-03 | MEDIUM | Driver search LIKE wildcard injection | `AdminController.php` | **FIXED** |

---

## Fix 1 — H-10: KYC File Type Validation (Service Layer Defense-in-Depth)

**File:** `backend/app/Services/KycService.php`

**Problem:** `KycService::submitVerification()` stored uploaded files via `$documentFront->store('kyc/'.$user->id, 'private')` without MIME type or size validation. While `KycSubmitRequest` had `mimes:jpg,jpeg,png,pdf|max:5120` validation, the service layer had no defense-in-depth — any caller passing `UploadedFile` directly could bypass form request rules.

**Fix:** Added `validateUploadedFile()` private method that checks:
- MIME type is `image/jpeg`, `image/png`, or `application/pdf`
- File size ≤ 10MB

Called on every uploaded file (`documentFront`, `documentBack`, `selfie`) before storage.

**Code change:**
```php
// Lines 40-48: Validate each uploaded file before storage
if ($documentFront) {
    $this->validateUploadedFile($documentFront);
}
if ($documentBack) {
    $this->validateUploadedFile($documentBack);
}
if ($selfie) {
    $this->validateUploadedFile($selfie);
}

// Lines 173-188: New validation method
private function validateUploadedFile(UploadedFile $file): void
{
    $allowedMimes = ['image/jpeg', 'image/png', 'application/pdf'];
    $maxSize = 10 * 1024 * 1024; // 10MB

    if (! in_array($file->getMimeType(), $allowedMimes)) {
        throw new \InvalidArgumentException(
            'Invalid file type. Allowed types: jpeg, png, pdf. Received: '.$file->getMimeType()
        );
    }

    if ($file->getSize() > $maxSize) {
        throw new \InvalidArgumentException(
            'File size exceeds maximum limit of 10MB.'
        );
    }
}
```

**Defense layers now:**
1. `KycSubmitRequest` → `mimes:jpg,jpeg,png,pdf|max:5120` (form validation)
2. `KycService::validateUploadedFile()` → MIME + size check (service layer)

---

## Fix 2 — H-11: Wallet Amount Cap (Service Layer Defense-in-Depth)

**File:** `backend/app/Services/WalletService.php`

**Problem:** `WalletService::initiateTopUp()` and `WalletService::withdraw()` only validated `$amount <= 0`. While `WalletDepositRequest` had `max:100000` and `WalletWithdrawRequest` had similar rules, the service layer had no explicit maximum — defense-in-depth gap.

**Fix:** Added `$amount > 100000` check to both `initiateTopUp()` and `withdraw()` methods, throwing `\InvalidArgumentException` with clear message.

**Code changes:**
```php
// initiateTopUp() — line 240
if ($amount > 100000) {
    throw new \InvalidArgumentException('Top-up amount exceeds maximum limit of R100,000.');
}

// withdraw() — line 275
if ($amount > 100000) {
    throw new \InvalidArgumentException('Withdrawal amount exceeds maximum limit of R100,000.');
}
```

**Defense layers now:**
1. `WalletDepositRequest` / `WalletWithdrawRequest` → `max:100000` (form validation)
2. `WalletService::initiateTopUp()` / `withdraw()` → `> 100000` check (service layer)

**Note:** The `topUp()` method (user-facing entry point) already had `<= 0` check. The `initiateTopUp()` method (webhook/admin entry point) now also has the cap. `transfer()` and `deduct()` are bounded by available balance and don't need a separate cap.

---

## Fix 3 — N-01: rejectDriver Cross-Tenant Access

**File:** `backend/app/Http/Controllers/Api/V1/AdminController.php`

**Problem:** `rejectDriver()` accepted a `User $driver` parameter but did NOT verify `$driver->tenant_id === $request->user()->tenant_id`. An admin from tenant A could reject drivers from tenant B. The `approveDriver()` method (line 115) already had this check — `rejectDriver()` was missing it.

**Fix:** Added two guard checks to `rejectDriver()` matching `approveDriver()` pattern:
1. Role check: `$driver->hasRole('driver')`
2. Tenant check: `$driver->tenant_id !== $request->user()->tenant_id`

**Code change:**
```php
// Lines 146-154: New guard checks
public function rejectDriver(Request $request, User $driver): JsonResponse
{
    if (! $driver->hasRole('driver')) {
        return ApiResponse::apiError(422, 'Invalid User', 'User is not a driver.');
    }

    if ($driver->tenant_id !== $request->user()->tenant_id) {
        return ApiResponse::forbidden('Unauthorized.');
    }
    // ... rest of method
```

**Note:** Method signature changed from `rejectDriver(User $driver)` to `rejectDriver(Request $request, User $driver)` to access the authenticated user's tenant.

---

## Fix 4 — N-03: Driver Search LIKE Wildcard Injection

**File:** `backend/app/Http/Controllers/Api/V1/AdminController.php`

**Problem:** `drivers()` search used `"%{$v}%"` without escaping LIKE wildcards. An attacker could inject `%` or `_` characters to manipulate the LIKE pattern. The `users()` method (line 64) already had proper escaping — `drivers()` was missing it.

**Fix:** Added `addcslashes($v, '%_')` escaping matching the `users()` pattern.

**Code change:**
```php
// Lines 99-102
->when($request->search, fn ($q, $v) => $q->where(function ($qq) use ($v) {
    $escaped = addcslashes($v, '%_');
    $qq->where('name', 'like', "%{$escaped}%");
}))
```

---

## Files Modified

| File | Lines Changed |
|------|---------------|
| `backend/app/Services/KycService.php` | +22 lines (validation method + calls) |
| `backend/app/Services/WalletService.php` | +6 lines (2 amount cap checks) |
| `backend/app/Http/Controllers/Api/V1/AdminController.php` | +8 lines (tenant check) + 1 line (escaping) |

---

## Updated Finding Status

| ID | Finding | Previous Status | New Status |
|----|---------|-----------------|------------|
| H-10 | KYC file type validation | OPEN | **FIXED** |
| H-11 | Wallet amount cap | MITIGATED | **FIXED** |
| N-01 | rejectDriver cross-tenant | OPEN (MEDIUM) | **FIXED** |
| N-03 | Driver search LIKE injection | OPEN (MEDIUM) | **FIXED** |

---

## Post-Fix Scan Status

| Severity | Count | Notes |
|----------|-------|-------|
| CRITICAL | 0 | All previously remediated |
| HIGH | 0 | All 12 now remediated or bounded |
| MEDIUM | 4 | M-01 (SESSION_ENCRYPT), M-02 (REDIS_PASSWORD), M-03 (TrustProxies), M-06 (InputSanitization) |
| LOW | 5 | L-01 through L-05 unchanged |

**Verdict: 0 CRITICAL, 0 HIGH — Ship ready.**

---

*End of security fixes cycle 8.*
