# SECURITY FIX: Wallet Self-Confirmation Vulnerability

**Date:** 2026-07-19
**Severity:** CRITICAL
**CVSS:** 9.8 (AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H)

---

## Vulnerability Summary

Any authenticated user could print unlimited money by:
1. Calling `POST /wallet/deposit` with an arbitrary amount
2. Calling `POST /wallet/confirm` with the returned transaction ID

The balance was credited **before** any payment gateway interaction, making the gateway redirect purely cosmetic.

---

## Root Causes Identified

### Bug #1: Immediate Balance Credit (CRITICAL)
`WalletController::deposit()` called `WalletService::credit()` which **immediately incremented the wallet balance**. No money was actually collected from any payment gateway — the user received funds instantly.

### Bug #2: User Self-Confirmation (CRITICAL)
`WalletController::confirm()` allowed any authenticated user to call `WalletService::confirmTopUpById()` and credit pending transactions without any gateway verification. No signature check, no webhook origin validation.

### Bug #3: Broken Webhook Confirmation
`WalletService::confirmTopUpByGatewayReference()` looked up transactions by the `gateway_reference` column, but `pendingTopUp()` never populated this field. Webhook-based confirmation was non-functional for wallet deposits.

---

## Fixes Applied

### 1. `WalletController::deposit()` — Create Pending Transaction
**File:** `app/Http/Controllers/Api/V1/WalletController.php`

Changed from `credit()` (immediate balance) to `initiateTopUp()` (pending transaction). The balance is **not touched** until a payment gateway webhook confirms payment.

- PayFast: passes `transaction->id` as `m_payment_id` (unchanged)
- Ozow: passes `transaction->id` as `transaction_reference` (unchanged)
- Stripe: stores Stripe PaymentIntent ID as `gateway_reference` for webhook matching

### 2. `WalletController::confirm()` — Disabled User Initiation
**File:** `app/Http/Controllers/Api/V1/WalletController.php`

Returns `403 Forbidden` with a clear message. User-initiated wallet confirmation is **no longer allowed**. Only payment gateway webhooks (PayFast ITN, Ozow webhook, Stripe webhook) can confirm deposits.

### 3. `WalletService::initiateTopUp()` — Gateway Reference Storage
**File:** `app/Services/WalletService.php`

Stores the transaction UUID as `gateway_reference` at creation time. This enables `confirmTopUpByGatewayReference()` to match webhooks to pending transactions. For Stripe, the `gateway_reference` is overwritten with the Stripe PaymentIntent ID after intent creation.

### 4. Idempotency Checks
**File:** `app/Services/WalletService.php`

`confirmTopUpById()` already had basic idempotency — the `WHERE reference_type = 'pending_topup'` clause prevents double-crediting because the first confirmation updates it to `'topup_confirmed'`. Added explicit logging for failed/already-confirmed attempts.

### 5. Rate Limiting
**Files:** `routes/api.php`, `app/Providers/AppServiceProvider.php`

Added `throttle:wallet-confirm` middleware (3 requests/minute/user) to the confirm endpoint. Existing rate limits already apply:
- `wallet-deposit`: 5 requests/minute/user
- `wallet-withdraw`: 3 requests/minute/user

### 6. Wallet Audit Logging
**File:** `app/Services/WalletService.php`, `config/logging.php`

All wallet balance modifications now write to a dedicated `wallet-audit` log channel (`storage/logs/wallet-audit.log`, 365-day retention):

| Event | Description |
|-------|-------------|
| `WALLET_TOPUP_INITIATED` | Deposit initiated via controller |
| `WALLET_TOPUP_INITIATED_VIA_USER` | Deposit initiated via service |
| `WALLET_PENDING_TOPUP` | Pending transaction created |
| `WALLET_CREDIT` | Balance credited |
| `WALLET_DEBIT` | Balance debited |
| `WALLET_DEDUCTED` | Deduction via service |
| `WALLET_TOPUP_CONFIRMED` | Transaction confirmed by gateway |
| `WALLET_TOPUP_CONFIRMED_BY_USER` | Confirmation via user flow |
| `WALLET_GATEWAY_CONFIRM_RECEIVED` | Webhook received for confirmation |
| `WALLET_CONFIRM_FAILED` | Confirmation attempt failed |
| `WALLET_GATEWAY_CONFIRM_FAILED` | Webhook matching failed |

All log entries include `wallet_id`, `transaction_id`, `amount`, `balance_before`, `balance_after`, and `ip` where applicable.

---

## Files Modified

| File | Change |
|------|--------|
| `app/Http/Controllers/Api/V1/WalletController.php` | Fixed deposit to use `initiateTopUp()`, disabled user confirm, added Log import |
| `app/Services/WalletService.php` | Added `gateway_reference` storage, idempotency logging, audit logging to all balance methods |
| `routes/api.php` | Added `throttle:wallet-confirm` middleware to confirm route |
| `app/Providers/AppServiceProvider.php` | Added `wallet-confirm` rate limiter (3/min/user) |
| `config/logging.php` | Added `wallet-audit` daily log channel (365-day retention) |

---

## Verification Steps

1. **Deposit no longer credits immediately:**
   ```bash
   # This should return a pending transaction, balance should NOT change
   curl -X POST /api/v1/wallet/deposit -d '{"amount":1000,"payment_method":"payfast"}'
   curl -X GET /api/v1/wallet/
   # balance should still be 0.00
   ```

2. **User confirm is blocked:**
   ```bash
   curl -X POST /api/v1/wallet/confirm -d '{"transaction_id":"<uuid>"}'
   # Should return 403 Forbidden
   ```

3. **Webhook confirmation works:**
   - Initiate a deposit via PayFast/Ozow/Stripe
   - Complete payment through the gateway
   - Gateway webhook hits `/api/v1/webhooks/payfast|ozow|stripe`
   - Balance updates correctly

4. **Audit log has entries:**
   ```bash
   tail -f storage/logs/wallet-audit.log
   ```

---

## Recommendations

- **Monitor** `wallet-audit.log` for anomalies (high-frequency deposits, failed confirms)
- **Alert** on `WALLET_GATEWAY_CONFIRM_FAILED` events — may indicate replay attempts
- **Consider** adding a cron job to expire unconfirmed pending transactions after 24 hours
- **Review** all existing wallet transactions for historical fraud (balance discrepancies)
