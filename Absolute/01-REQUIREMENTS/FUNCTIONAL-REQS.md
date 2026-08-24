# EasyRyde — Functional Requirements

> **Segment**: 01-REQUIREMENTS · **Status**: VERIFIED 2026-08-14 — every row maps to a live endpoint/flow  
> **Linked**: `../03-WORKFLOWS/*.md`, `../../docs/flow/` detailed drills, `../../docs/api/openapi.yaml`

**Legend**: FR = functional requirement. Acceptance = how to verify. Endpoint = primary API proof.

---

## FR-1 Auth & Identity

| ID | Requirement | Acceptance | Endpoint |
|---|---|---|---|
| FR-101 | Register with name/email/password | 201 + token; validation errors 422 | `POST /auth/register` (throttle 5/min) |
| FR-102 | Login (email+password) | 200 user+token; lockout after failed attempts (`users.failed_attempts`) | `POST /auth/login` (5/min/IP) |
| FR-103 | Logout revokes Sanctum token | 200; token dies | `POST /auth/logout` |
| FR-104 | Forgot/reset password via email | 200; rate-limited 3/min | `POST /auth/forgot-password`, `/reset-password` |
| FR-105 | Social auth redirect/callback | provider flow | `GET /auth/{provider}/redirect|callback` |
| FR-106 | Admin TOTP enable/verify/disable | 200; `X-Totp-Code` enforced by middleware | `POST /admin/totp/*` |
| FR-107 | Consent gate before using app | required consents enforced; grant/revoke/history | `GET/POST /consent/*` |

## FR-2 Rides

| ID | Requirement | Acceptance | Endpoint |
|---|---|---|---|
| FR-201 | Fare estimate before booking | fare + breakdown; server-side calc | `GET /rides/fare-estimate` |
| FR-202 | Create ride request | 201; ride enters `requested`→`searching`; driver match begins | `POST /rides` (5/min) |
| FR-203 | Live tracking (socket) | `ride:location-update` on `ride:{id}` | `POST /rides/{id}/location` + socket |
| FR-204 | Driver accept with 15s offer window | assign; timeout job re-dispatches | `POST /rides/{ride}/driver-accept` |
| FR-205 | Driver arrive → wait → start → complete | status machine via `transitionTo()`; history rows | `driver-arrived|start|complete` |
| FR-206 | Cancel (rider/driver) with fee rules | fee per `CancellationService`; system timeouts | `POST /rides/{ride}/cancel`, jobs |
| FR-207 | No-show detection & fee | driver marks; refund logic | `POST /rides/{ride}/no-show` |
| FR-208 | Rate ride 1–5 | unique per ride/rater | `POST /rides/{ride}/rate` |
| FR-209 | Receipt (PDF) | `ReceiptService` | `GET /rides/{ride}/receipt` |
| FR-210 | Apply promo to ride | discount lines on payment | `POST /rides/{ride}/apply-promo` |

## FR-3 Payments & Wallet

| ID | Requirement | Acceptance | Endpoint |
|---|---|---|---|
| FR-301 | Pay ride via cash/wallet/card gateway | completed Payment; escrow for cards | `POST /payments/rides/{ride}/pay` |
| FR-302 | Wallet deposit via gateway redirect | pending→confirmed; idempotent | `POST /wallet/deposit`, `/wallet/confirm` |
| FR-303 | Wallet withdraw (driver) | deduction + payout record | `POST /wallet/withdraw` |
| FR-304 | Refund (admin) | refunded status + wallet credit | `POST /payments/{id}/refund` |
| FR-305 | Dispute raise + resolve | dispute hold stops escrow release | `POST /payments/{id}/dispute`; admin resolve |
| FR-306 | Gateway webhooks verified (IP + signature) | 200; `WebhookEvent` logged | `POST /webhooks/{payfast,ozow,stripe}` |
| FR-307 | Driver payouts (daily/weekly, batch) | `PayoutService`; wallet debit + notification | admin wallet routes + jobs |

## FR-4 Food Delivery

| ID | Requirement | Acceptance | Endpoint |
|---|---|---|---|
| FR-401 | Browse restaurants + menu | categories, items, availability | `GET /food/restaurants` (+`/menu`) |
| FR-402 | Create order with cart items | subtotal/delivery/tip; wallet or gateway | `POST /food/restaurants/{r}/order` |
| FR-403 | Track order status (socket) | `food-order:status` | `GET /food/orders/{id}` |
| FR-404 | Driver accept available order | availability list for `role:driver` | `GET /driver/food/orders/available` |
| FR-405 | Rate order | 1–5 | `POST /food/orders/{id}/rate` |

## FR-5 Driver Ops

| ID | Requirement | Acceptance | Endpoint |
|---|---|---|---|
| FR-501 | Register driver profile + vehicle | profile + vehicle saved; `is_approved` gates dispatch | `PUT /drivers/profile`, `POST /drivers/vehicle` |
| FR-502 | Toggle online/offline | status broadcast + geo set | `POST /drivers/toggle-online` |
| FR-503 | Update location (background) | 30/min throttle; sync job to `users` | `POST /drivers/location` |
| FR-504 | Earnings, trips, stats | aggregated views | `GET /drivers/earnings|trips|stats` |
| FR-505 | Nearby rides list | radius search | `GET /drivers/nearby-rides` |
| FR-506 | KYC document submission | statuses pending→approved | `POST /kyc/`, admin approve |

## FR-6 Admin & Compliance

| ID | Requirement | Acceptance | Endpoint |
|---|---|---|---|
| FR-601 | Dashboard metrics (revenue/rides per day/week/month) | `AdminDashboardController` | `GET /admin/dashboard/*` |
| FR-602 | Manage users (suspend/activate), drivers (approve/reject/suspend), rides (dispute/resolve) | audit-logged | `/admin/manage/*` |
| FR-603 | Refunds, reconciliation, payout queue | cash reconciliation rows | `/admin/wallets/*`, `/admin/manage/payments/{id}/refund` |
| FR-604 | KYC review + bulk approve | status transitions | `/admin/manage/kyc/*` |
| FR-605 | Settings, peak hours, surge zones, promos CRUD | settings typed; surge applied at fare calc | `/admin/settings`, `/admin/peak-hours`, `/admin/surge-zones` |
| FR-606 | Audit log query | `AdminAuditLog` rows | `GET /admin/audit-logs` |
| FR-607 | SOS ack/escalate/resolve + incident workflow | statuses + escalation notification | `/admin/compliance/*` |
| FR-608 | Data retention info + cleanup | `DataRetentionService` | `/admin/compliance/data-retention` |
| FR-609 | Push notifications to audience (admin) | `AdminNotificationController` | `POST /admin/notifications` |
| FR-610 | Popia rights: export/anonymize/erasure | user data ops | `GET /data/export`, `POST /data/anonymize`, `POST /data/erasure` |

## FR-7 Realtime (socket)

| ID | Requirement | Acceptance | Endpoint/Event |
|---|---|---|---|
| FR-701 | Ride request fan-out to drivers | `ride:request` on `driver:{id}` | socket `driver:accept-ride` |
| FR-702 | Chat in ride | room `ride:{id}` | `chat:send` |
| FR-703 | Delivery/food status push | `delivery:status`, `food-order:status` | handlers |
| FR-704 | Admin live map of drivers | `admin:driver-location` | `GET /admin/live-map/drivers` |

## FR-8 Misc (deliveries, scheduled, pool, referrals, sos, chat, places, config)

| ID | Requirement | Endpoint |
|---|---|---|
| FR-801 | Parcel delivery request/assign/track | `/deliveries/*` |
| FR-802 | Scheduled rides create/list/cancel + publish job | `/scheduled-rides/*` |
| FR-803 | Pool ride join/leave/matches + driver passenger ops | `/pool/*`, `/driver/pool/*` |
| FR-804 | Referral code apply + bonus + stats | `/referrals/*` |
| FR-805 | SOS trigger/cancel + admin ack/resolve | `/sos/*` |
| FR-806 | Ride chat REST read/unread | `/chat/rides/*` |
| FR-807 | Places search/reverse (Phalaborwa seeded) | `/places/*` |
| FR-808 | Public config + health | `/config`, `/health` |
| FR-809 | Inspector ops (api-stats, ride-flow, queue-health) | `/inspector/*` |

## References

- Workflow detail: `../03-WORKFLOWS/RIDER-FLOWS.md`, `DRIVER-FLOWS.md`, `ADMIN-FLOWS.md`, `FOOD-FLOWS.md`
- Acceptance evidence: `../08-TESTING/TASK-QA-002-REPORT.md` (route matrix), `API-TESTS.md`
- Non-functional constraints: `NONFUNCTIONAL-REQS.md`