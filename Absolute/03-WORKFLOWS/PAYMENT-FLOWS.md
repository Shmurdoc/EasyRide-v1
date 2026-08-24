# EasyRyde — Payment & Money Flows

> **Segment**: 03-WORKFLOWS · **Status**: VERIFIED 2026-08-14  
> **Deep drill**: `../../docs/flow/04-cross-cutting/payment-flow.md`

---

## 1. Payment Method Matrix

| Method | Rider UX | Server path | Money model |
|---|---|---|---|
| cash | hand cash to driver | `CashPaymentService` + `cash_reconciliations` | driver marks cash; admin reconciles; platform fee tracked |
| wallet | pre-funded balance | `WalletService` debit + credit driver | float held platform-side |
| stripe (card) | hosted elements → PaymentIntent | `StripeService` create/confirm + webhook | **escrow_held** → release post-window |
| payfast | redirect → ITN webhook | `PayFastService` verifyItn | completed → driver payout |
| ozow | redirect → webhook | `OzowService` create/verify | completed → driver payout |

**Card data never touches EasyRyde servers** (PCI SAQ-A posture) — `05-SECURITY/PCI-DSS.md`.

## 2. Ride Payment State Machine

```
payment_status: pending → processing → completed|escrow_held → released
                 ↘ failed → retry (idempotent, key) ↘ refunded (admin) ↘ disputed (hold)
```

1. `POST /payments/rides/{ride}/pay` — method + idempotency key (`throttle:payments` 10/min).
2. `PaymentRouter::processor(gateway)` → gateway flow (redirect/intent/webhook).
3. `ProcessPaymentJob` (queue horizon) — idempotent, skips already completed.
4. Webhook verified (IP whitelist + signature) → status transitions + `WebhookEvent` log.
5. `PaymentRetryService` — retry loop w/ idempotency keys, MAX_RETRIES.
6. Escrow hold → `ReleaseEscrowBatchJob` daily 02:00 (`held_until` respected, dispute hold blocks).

## 3. Wallet Ledger Rules

| Op | API | Constraint |
|---|---|---|
| Deposit | `POST /wallet/deposit` (gateway redirect) → `POST /wallet/confirm` (idempotent, gateway ref) | pending → confirmed once |
| Ride charge | `payments/rides/{id}/pay` method=wallet | `hasSufficientFunds` |
| Driver earnings | credited `pending_balance` per trip | payout moves pending → balance |
| Withdraw | `POST /wallet/withdraw` | driver only, pending_balance cap |
| Reconcile | `ReconcileWalletBalancesJob` daily 05:00 + `balance_snapshot` | drift detection |

Every mutation writes `wallet_transactions` (type, balance_before/after, morph reference, gateway_reference).

## 4. Fees, Payouts, Refunds, Disputes

| Concept | Rule | Service |
|---|---|---|
| Platform fee | `platform_fee_percent` (15% default, cached) | `PlatformFeeService` |
| Driver payout | amount − platform_fee − gateway fee | `PayoutService`, `SettlementService` |
| Batch payouts | daily 03:00 / weekly (queue payments) | `ProcessPayoutsBatchJob` |
| Manual payout | admin queue approve → `ProcessPayoutJob` | admin wallet routes |
| Refund | admin-only `POST /payments/{id}/refund`; `refund_requests` queue | `RefundService` (full-refund window), `Payment/RefundService` (admin approve/reject) |
| Dispute | rider raises `POST /payments/{id}/dispute` → hold; admin resolve | `EscrowService::disputePayment/resolveDispute` |
| Cash reconciliation | driver marks → admin matches → reconcile | `CashReconciliationService` |
| Velocity check | `checkPaymentVelocity` guards anomaly | `PaymentService` |

## 5. Webhook Security Map

| Gateway | Route | Middleware |
|---|---|---|
| PayFast | `POST /webhooks/payfast` (+return) | `webhook.ip:payfast` (196.21.166.0/24, .167.0/24) |
| Ozow | `POST /webhooks/ozow` (+return) | `webhook.ip:ozow` (34.242.109.146, 54.220.223.116) |
| Stripe | `POST /webhooks/stripe` | `webhook.ip:stripe` + signature |
| Twilio | `POST /webhooks/twilio` | `webhook.ip:twilio` |
| PHBIMH partner | `POST /webhooks/partner/order|status`, `POST /webhooks/phbimh` | `webhook.ip:partner` + HMAC (`PartnerApiService::verifyWebhookSignature`, `PhbimhIntegrationService`) |
| Bypass | `APP_WEBHOOK_BYPASS=true` | **dev/test only** — never prod |

## 6. Failure Handling (money-critical)

- Gateway timeout → payment stays `pending`; retry with same idempotency key; user sees "payment pending, will confirm".
- Double webhook delivery → idempotency key + status guard; `WebhookEvent` dedup.
- Escrow shortfall on dispute → `dispute_hold_shortfall` tracked, `PaymentAlreadyHeldException` prevents double-hold.
- Failed payout → payout status `failed`, admin retry (`/admin/payouts/{payout}/retry`).

## References

- Threat model: `../05-SECURITY/THREAT-MODEL.md` · PCI: `../05-SECURITY/PCI-DSS.md` · Failure register: `FAILURE-MODES.md` (F-PM-*) · Data: `../02-DATA-MODEL/ENTITIES.md` §1,3