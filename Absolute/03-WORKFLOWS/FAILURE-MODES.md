# EasyRyde — Failure Modes & Resilience Register

> **Segment**: 03-WORKFLOWS · **Status**: VERIFIED 2026-08-14 (stale entries from v1 removed)  
> **Linked**: `../09-OPS/RUNBOOKS.md` (how to respond), `./AUTH/PAYMENT/RIDER/DRIVER-FLOWS.md` (happy paths)

Format: **Code · When · Impact · Current behavior · Retry/resilience · Gap**.

---

## F-RB — Ride Booking

| Code | When | Impact | Current behavior | Retry / resilience | Gap |
|---|---|---|---|---|---|
| F-RB-01 | No drivers found (search timeout) | Rider stranded | Ride stays `searching`; `RideTimeoutJob`/`CleanupStaleRidesJob` cancel at 30 min; client "looking" UI + expanding radius (`expandSearchRadius`) | 3 driver re-dispatch attempts; radius 5→10→…km | No proactive "no drivers" push yet; rider must cancel |
| F-RB-02 | Driver declines / 15s window expires | Re-queue | `DriverAcceptTimeoutJob` re-dispatch; `ride:claim` lock prevents doubles | re-queue loop | — |
| F-RB-03 | Rider cancels after acceptance | Fee dispute | `CancellationService::calculateFee`; `cancellation_requested` + driver confirm/reject | reason capture | Fee visibility before confirm |
| F-RB-04 | Duplicate create (double-tap) | Double charge risk | `RideService::createRide` concurrent-request lock + throttle 5/min | idempotent-ish | Client dedup pending |
| F-RB-05 | Socket silent during ride | Rider sees stale map | 30s REST poll fallback (`useActiveRide`), `ReconnectionBanner`; `driver:location_update` cached Redis 300s | rejoin room on reconnect | — |

## F-DF — Driver Dispatch & Trips

| Code | When | Impact | Current behavior | Retry | Gap |
|---|---|---|---|---|---|
| F-DF-01 | Socket disconnect mid-offer | Missed ride | Offer re-broadcast on reconnect? — client re-join rooms; local notification | socket ping 25s/pong 20s | Confirm re-offer on reconnect |
| F-DF-02 | Location loss (battery/denied) | Rider tracking stops | stale location TTL 300s cleanup (60s interval); `last_location_update` on users | sync job 5 min | Detect & alert rider |
| F-DF-03 | Driver accepts then stalls en route | No pickup | `DriverArrivalMonitorJob` re-dispatches; status history marks actor | timeout job | Auto-cancel policy window |
| F-DF-04 | Duplicate accept (two devices) | Double booking | `ride:claim:{id}` SET NX EX 30 | Redis lock | — |
| F-DF-05 | Ride completes, payout lag | Cash-flow anxiety | `pending_balance` immediate; batch payout 03:00 | weekly + manual retry | Driver-facing ETA on payout |

## F-AD — Admin & Ops

| Code | When | Impact | Current behavior | Retry | Gap |
|---|---|---|---|---|---|
| F-AD-01 | KYC queue backlog | Unapproved drivers idle | review screens + bulk-approve | — | SLA missing (BACKLOG B-002) |
| F-AD-02 | TOTP lost | Admin locked out | disable flow requires TOTP; recovery path manual (super-admin DB) | — | Document recovery SOP (RUNBOOKS) |
| F-AD-03 | Cash reconciliation drift | Float discrepancy | `CashReconciliationService::reconcileOutstanding`; snapshot balance daily | reconcile job | SOP sign-off (B-004) |
| F-AD-04 | Gateway webhook storm | Double-processing | IP whitelist + idempotency key + `WebhookEvent` dedup | — | — |

## F-PM — Payments

| Code | When | Impact | Current behavior | Retry | Gap |
|---|---|---|---|---|---|
| F-PM-01 | Gateway timeout on pay | Payment stuck `pending` | `PaymentRetryService` idempotent retries; user told "will confirm"; `ProcessPaymentJob` | MAX_RETRIES loop | Status push to app on confirm |
| F-PM-02 | Webhook lost (PayFast ITN) | Never confirmed | `verifyPaymentWithServer` reconciliation path; admin `verifyPayment` | manual verify | Scheduled reconciliation missing |
| F-PM-03 | Escrow release failure | Driver unpaid | `ReleaseEscrowJob` marks `release_failed` after retries; batch 02:00 | retries | Alert to finance (RUNBOOKS) |
| F-PM-04 | Double refund attempt | Overpayment | refund idempotent (status guard `refunded`) | — | — |
| F-PM-05 | Dispute shortfall | Platform eats loss | `dispute_hold_shortfall` recorded; `PaymentAlreadyHeldException` guard | — | Loss policy doc |

## F-FD — Food

| Code | When | Impact | Current behavior | Retry | Gap |
|---|---|---|---|---|---|
| F-FD-01 | Restaurant closed at checkout | Order blocked | `isRestaurantOpen` 422 | — | — |
| F-FD-02 | Driver accepts two delivery types | Starved food orders | Food orders separate queue from rides; no cross-limit | — | B-102 policy |
| F-FD-03 | Order status push lost | Customer confused | 10s poll fallback screen | — | — |

## F-AU — Auth & Security

| Code | When | Impact | Current behavior | Retry | Gap |
|---|---|---|---|---|---|
| F-AU-01 | Brute force login | Account takeover | throttles (5/min) + `failed_attempts`/`locked_until` | — | Alert on lockout? |
| F-AU-02 | Token expiry mid-ride | Client auth errors | 7-day TTL; `useAuth::refreshToken`; socket token revalidation 55s | refresh | — |
| F-AU-03 | Webhook spoof attempt | Fraud | IP whitelists per gateway + HMAC/signatures | — | — |
| F-AU-04 | PII breach | POPIA exposure | Encryption at rest, `BreachNotificationService`, incident response | — | See INCIDENT-RESPONSE |

## F-CM — Cross-Cutting (client)

| Code | When | Impact | Current behavior | Retry | Gap |
|---|---|---|---|---|---|
| F-CM-01 | Offline during mutation | Lost booking | `offlineQueue.ts` persisted queue (`@easyryde/offline_queue`), flush on reconnect; `OfflineBanner` | flush w/ retry | Queue surfaced to user? |
| F-CM-02 | GET cache poisoning-ish | Stale fare | 5-min TTL cache `@easyryde_cache:` | — | — |
| F-CM-03 | Maps/OSRM down | No route polyline | fallback `generateRouteCoords` straight line; fare fallback R50 (`calculateFinalFare`) | — | B-203 audit |
| F-CM-04 | Push token stale | Missed notifications | `deactivateToken` on 410; re-register on login | — | — |

## F-FR — Fraud & Conduct (driver)

| Code | When | Impact | Current behavior | Retry / resilience | Gap |
|---|---|---|---|---|---|
| F-FR-01 | Wallet debit fails for fine (insufficient balance) | Uncollected fine | none (no fine mechanism exists) | violation stays `pending`; SettlementService offsets payouts | Unpaid-fine accrual cap + block-rides gate (setting) |
| F-FR-02 | Collusion false positive (pair bad luck) | Driver churn | none | advisory flag only, human review, evidence json | Threshold tuning + appeal window |
| F-FR-03 | Radius threshold mis-set by admin (0 = off) | No protection | none | validation min 0.1 km on settings write | UI hint + audit trail on change |
| F-FR-04 | Waived fine repeats immediately | Perp loop | none | waiver is recorded; repeat = re-fined, no auto-waive | Recidivism counter |

## F-PL — Fleet Pool Modes

| Code | When | Impact | Current behavior | Retry / resilience | Gap |
|---|---|---|---|---|---|
| F-PL-01 | `easyryde_only` with 0 approved employees online | Riders stranded (no supply) | none | updateSettings rejects mode with 0 online+approved unless `confirm_empty_pool` (audited) | Live counts in admin UI |
| F-PL-02 | Employee ghost account (never verified) | Insider risk | KYC gate covers docs | `fleet_type=easyryde` requires approved KYC; suspending revokes | Periodic list review |

## F-PR — Parcel / Local Delivery

| Code | When | Impact | Current behavior | Retry / resilience | Gap |
|---|---|---|---|---|---|
| F-PR-01 | Phantom parcel booking spam | Platform abuse | none (no booking endpoint yet) | booking throttle 5/min + wallet proof >R200 cargo | — |
| F-PR-02 | POD photo missing / forged | Theft of goods | none | `delivered` hard-gated on pod photo; admin override audit-logged | Photo EXIF check (optional) |
| F-PR-03 | Driver marks `failed` to pocket goods | Theft | none | `failed` requires admin confirm or 24 h sender-conflict window | — |
| F-PR-04 | Under-declared weight (price fraud) | Revenue loss | none | weight re-check on pickup (setting `parcel_weight_check`) | Driver-scale photo |

## Worst-Case Map (single failure → system effect)

```
Gateway webhook loss → payment pending → escrow never releases → payouts batch misses driver
        → driver churn → ride supply drops → rider bounces (true goal at risk)
Mitigation chain: F-PM-02 verify-payment path → F-AD-03 reconcile → RUNBOOKS R3 (payment outage)
```

## References

- Detailed drills: `../../docs/flow/05-production-readiness/flow-simulation-debug.md`, `bug-inventory.md`, `incident-response-runbook.md`
- Load behavior: `../../docs/flow/05-production-readiness/load-testing-plan.md`