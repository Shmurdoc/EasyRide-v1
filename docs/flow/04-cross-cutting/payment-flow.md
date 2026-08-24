# Payment Flow — EasyRyde

**Version:** 1.0.0
**Updated:** 2026-07-02

---

## 1. Overview

Payment processing across the platform. 5 payment methods (Cash, Wallet, PayFast, Ozow, Stripe), escrow system, refunds, driver payouts, and reconciliation.

---

## 2. Payment Methods

| Method | Type | Redirect? | Processing | Region |
|--------|------|-----------|------------|--------|
| Cash | Direct | No | Immediate | Global |
| Wallet | Direct | No | Immediate | Global |
| PayFast | EFT | Yes (browser) | Async (webhook) | South Africa |
| Ozow | Instant EFT | Yes (browser) | Async (webhook) | South Africa |
| Stripe | Card | No (SDK) | Synchronous | Global |

---

## 3. Payment Architecture

```
┌─────────────────────────────────────────────────────┐
│                   CLIENT LAYER                        │
├──────────────────┬───────────────────────────────────┤
│  Rider App       │  PaymentScreen                    │
│  (select method) │  → ProcessPaymentRequest           │
├──────────────────┴───────────────────────────────────┤
│                   API LAYER                           │
│  POST /payments/rides/{ride}/pay                     │
│  → PaymentRouter → { CashPaymentService |             │
│                      WalletPaymentService |           │
│                      StripeService |                  │
│                      PayFastService |                 │
│                      OzowService }                    │
├─────────────────────────────────────────────────────┤
│                   ESCROW LAYER                        │
│  EscrowService: 24h hold → Release → Dispute window  │
├─────────────────────────────────────────────────────┤
│                   GATEWAY LAYER                       │
│  Stripe API | PayFast ITN | Ozow Webhook             │
└─────────────────────────────────────────────────────┘
```

---

## 4. Payment Flows

### 4.1 Cash Payment

```
Rider selects "Cash"
    │
    ├──▶ POST /payments/rides/{ride}/pay
    │    { method: "cash" }
    │
    ├──▶ PaymentService.processRidePayment:
    │    ├── Validate ride exists, not already paid
    │    ├── Calculate fare (base + distance + time + surge - discount)
    │    ├── Create Payment record:
    │    │   { ride_id, payer_id, method: "cash", amount, status: "pending" }
    │    ├── Set ride.payment_status = "pending"
    │    └── Return { payment }
    │
    ├──▶ Rider sees "Payment recorded. Pay driver in cash."
    │
    └──▶ After ride: Driver confirms cash received
         ├── POST /rides/{id}/complete
         └── Payment status → "completed"
              CashReconciliation record created
```

### 4.2 Wallet Payment

```
Rider selects "Wallet"
    │
    ├──▶ POST /payments/rides/{ride}/pay
    │    { method: "wallet" }
    │
    ├──▶ PaymentService.processRidePayment:
    │    ├── Validate ride exists, not already paid
    │    ├── Calculate fare
    │    ├── WalletService.debit:
    │    │   ├── Lock wallet row (lockForUpdate)
    │    │   ├── Check balance >= fare
    │    │   │   └── Insufficient → throw RuntimeException
    │    │   ├── Deduct fare from balance
    │    │   ├── Create WalletTransaction record
    │    │   └── Release lock
    │    ├── Create Payment record: { status: "completed" }
    │    ├── Credit driver wallet (net after platform fee)
    │    ├── Set ride.payment_status = "completed"
    │    └── Return { payment }
    │
    └──▶ Rider sees "Payment complete"
```

### 4.3 Stripe Card Payment

```
Rider selects "Stripe"
    │
    ├──▶ POST /payments/stripe/create-intent
    │    { ride_id, amount }
    │
    ├──▶ StripeService.createPaymentIntent:
    │    ├── Create Stripe PaymentIntent
    │    │   { amount, currency: "ZAR", metadata: { ride_id } }
    │    └── Return { clientSecret }
    │
    ├──▶ Stripe SDK confirms payment on client
    │    (Card details NEVER touch backend)
    │
    ├──▶ POST /payments/stripe/confirm
    │    { paymentIntentId }
    │
    ├──▶ StripeService.confirmPayment:
    │    ├── Retrieve PaymentIntent from Stripe
    │    ├── Check status: "succeeded"
    │    ├── Create Payment record: { status: "completed" }
    │    ├── Credit driver wallet
    │    └── Return { payment }
    │
    └──▶ Stripe webhook (backup):
         POST /webhooks/stripe
         → Verify signature
         → Update payment status
```

### 4.4 PayFast EFT Payment

```
Rider selects "PayFast"
    │
    ├──▶ PayFastService.generatePaymentUrl:
    │    ├── Build PayFast URL with:
    │    │   - merchant_id, merchant_key
    │    │   - amount, item_name
    │    │   - return_url, cancel_url, notify_url
    │    │   - signature (MD5)
    │    └── Return { url }
    │
    ├──▶ Client opens browser: Linking.openURL(url)
    │
    ├──▶ User completes EFT on PayFast
    │
    ├──▶ PayFast sends ITN to POST /webhooks/payfast
    │    ├── Verify MD5 signature
    │    ├── Check payment_status == "COMPLETE"
    │    ├── Create Payment record: { status: "completed" }
    │    └── Credit rider/driver wallets
    │
    └──▶ User returns to app via return_url
         → Check payment status
         → Show success/failure
```

### 4.5 Ozow Instant EFT

```
Rider selects "Ozow"
    │
    ├──▶ OzowService.createPaymentRequest:
    │    ├── Build Ozow request with:
    │    │   - site_code, api_key
    │    │   - amount, reference
    │    │   - return_url, cancel_url, notify_url
    │    │   - signature (HMAC-SHA256)
    │    └── Return { url }
    │
    ├──▶ Client opens browser: Linking.openURL(url)
    │
    ├──▶ User completes instant EFT on Ozow
    │
    ├──▶ Ozow sends webhook to POST /webhooks/ozow
    │    ├── Verify HMAC signature
    │    ├── Check status == "Success"
    │    ├── Create Payment record: { status: "completed" }
    │    └── Credit wallets
    │
    └──▶ User returns via return_url
```

---

## 5. Escrow System

```
Payment completed
    │
    ├──▶ EscrowService.holdPayment:
    │    ├── Set payment.status = "escrow_held"
    │    ├── Set payment.held_until = now + 24 hours
    │    └── Prevent premature driver payout
    │
    ├──▶ 24-hour hold period
    │    ├── Rider can dispute within 24h
    │    └── Driver payout held
    │
    ├──▶ After 24 hours (ReleaseEscrowBatchJob):
    │    ├── ReleaseEscrowJob runs
    │    ├── Set payment.escrow_released = true
    │    ├── Credit driver payout
    │    └── Driver can withdraw
    │
    └──▶ If dispute filed:
         ├── Dispute record created
         ├── Payment.hold = true
         ├── Driver payout withheld
         └── Admin resolves dispute
```

---

## 6. Wallet System

### 6.1 Wallet Operations

| Operation | Endpoint | Effect |
|-----------|----------|--------|
| View balance | GET /wallet/ | Display balance |
| View transactions | GET /wallet/transactions | Transaction history |
| Deposit | POST /wallet/deposit | Add funds |
| Withdraw | POST /wallet/withdraw | Remove funds |

### 6.2 Wallet Transaction Types

| Type | Description | Effect on Balance |
|------|-------------|-------------------|
| `ride_payment` | Rider pays for ride | Debit rider, credit driver |
| `deposit` | Rider tops up wallet | Credit |
| `withdraw` | Driver withdraws earnings | Debit |
| `refund` | Refund for cancelled ride | Credit |
| `promo_bonus` | Promo code bonus | Credit |
| `referral_bonus` | Referral bonus | Credit |

### 6.3 Wallet Safety

- Row-level locking (`lockForUpdate()`) on all balance operations
- Balance reconciliation runs daily (`ReconcileWalletBalancesJob`)
- Auto-correction of discrepancies with critical-level logging

---

## 7. Platform Fee

```
Ride fare: R100.00
    │
    ├──▶ Platform fee (15%): R15.00
    │
    ├──▶ Driver earnings: R85.00
    │
    └──▶ Wallet split:
         ├── Rider wallet: -R100.00
         ├── Platform wallet: +R15.00
         └── Driver wallet: +R85.00
```

---

## 8. Payment Velocity Checks

| Check | Limit | Window | Response |
|-------|-------|--------|----------|
| Payment count | 5 per user | 1 hour | VELOCITY_COUNT_EXCEEDED |
| Payment amount | R5,000 per user | 1 hour | VELOCITY_AMOUNT_EXCEEDED |

---

## 9. Error Handling

| Error | Scenario | Resolution |
|-------|----------|------------|
| Insufficient funds | Wallet balance < fare | "Insufficient balance" |
| Gateway timeout | PayFast/Ozow redirect timeout | "Payment may have processed" |
| Gateway rejection | Card declined | "Card was declined" |
| Idempotency conflict | Duplicate payment | Use existing record |
| Double-debit | Concurrent wallet ops | lockForUpdate prevents |
| Webhook signature invalid | Tampered webhook | Reject, log to Sentry |
| Escrow already held | Double hold attempt | PaymentAlreadyHeldException |

---

## 10. ⚠ CRITICAL BUG

**`RideController::completeRide()` calls `calculateFinalFare()` which returns hardcoded `50.0`**

This means every ride that doesn't have a pre-set `total_fare` gets charged R50 instead of the actual calculated fare. This is a **payment-critical issue** that will cause massive financial discrepancies.

**Fix required before launch.**
