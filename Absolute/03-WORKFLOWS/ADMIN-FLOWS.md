# EasyRyde — Admin Flows (Ops, Compliance, Money, Content)

> **Segment**: 03-WORKFLOWS · **Status**: VERIFIED 2026-08-14  
> **Deep drills**: `../../docs/flow/03-admin/admin-user-flow.md`, `admin-system-flow.md`, `admin-data-flow.md`, `admin-integration-flow.md`, `admin-error-flow.md`  
> **Panels**: web admin (`admin/` Vite, 12 pages) + mobile admin (Expo, 5 tabs + 6 stacks) + `web/` (advanced: live map, reports, compliance)

---

## 1. Admin Access Model

```
Login → POST /auth/login (email/password) → TOTP check (X-Totp-Code via AdminTotpMiddleware when enabled)
  → role: admin|super-admin on every /admin/* route
  → every mutation writes admin_audit_logs (action/resource/old/new/ip/ua)
```

## 2. Screen → Route Map (web admin panel)

| Page | Route (frontend) | API calls |
|---|---|---|
| Dashboard | `/` | `GET /admin/dashboard`, `/admin/dashboard/revenue/{day\|week\|month}`, `/rides/{period}` |
| Users | `/users` | `GET /admin/manage/users`, `POST …/{id}/suspend|activate` |
| Drivers | `/drivers` | `GET /admin/manage/drivers`, `POST …/{id}/approve|reject|suspend` |
| Live Map | `/live-map` | `GET /admin/live-map/drivers` (poll) |
| Rides | `/rides` | `GET /admin/manage/rides`, `POST …/{id}/dispute|resolve` |
| Payments | `/payments` | `GET /admin/manage/payments`, `POST …/{id}/refund` |
| KYC | `/kyc` | `GET /admin/manage/kyc{,/stats}`, `POST …/approve|reject`, `bulk-approve` |
| Reports | `/reports` | `GET /admin/reports/{dashboard,revenue,rides,drivers}`, exports |
| Settings | `/settings` | `GET/POST /admin/settings`; peak-hours + surge-zones CRUD + toggle |
| Promo Codes | `/promo-codes` | `GET/POST /promo-codes`, `PUT/DELETE /promo-codes/{id}` |
| Wallet & Payouts | `/wallet-payouts` | `/admin/wallets/*` (stats, transactions, payout-queue, approve/reject/process, bulk-approve, cash-reconciliation) |
| Notifications | `/notifications` | `GET/POST /admin/notifications` |

## 3. Domain Workflows

### 3.1 Driver Onboarding & KYC
```
driver submits docs → review queue (pending) → approve (is_approved+kyc approved → dispatchable) | reject (reason)
bulk-approve for clean batches · documents endpoint for re-verification
```
### 3.2 Money Ops
```
Refund: payments list → refund (full/partial, reason) → wallet credit + payment.status=refunded
Payout queue: pending payouts → approve/reject single or bulk → process (ProcessPayoutJob)
Cash reconciliation: driver-marked cash rides → auto-match with platform expected → reconcile
Escrow: completed card payments held → release after dispute window (ReleaseEscrowBatchJob 02:00)
```
### 3.3 Compliance & Safety
```
SOS: active alerts → acknowledge → resolve (SosController, role-gated)
Incidents: report → assign → investigate → escalate → resolve/close (IncidentReportingService)
Data retention: view retention info → run cleanup (DataRetentionController)
Audit log: query by action/resource.
```
### 3.4 Pricing Ops (settings-driven, applied at fare-calc on the server)
```
Peak hours: day_of_week × time window × multiplier  (PeakHourController + scopeActive)
Surge zones: center + radius × multiplier (SurgeZoneController + scopeActive)
Platform fee %: system_settings.platform_fee_percent (PlatformFeeService, cached)
Fare table per category: system_settings fare_* (FareCalculationService::getFareRates)
```

## 4. Admin Notifications & Broadcasts

- `POST /admin/notifications` → targeted/`audience` push via `AdminNotificationController` (sent/failed counts tracked).
- Socket admin room: all ride/food/delivery status changes mirror to `admin` room for live ops view.

## 5. Inspector Ops (self-diagnostics)

`GET /inspector/{api-stats, ride-flow, queue-health, my-stats}` — counters from `RequestTimingMiddleware` Redis metrics: endpoint latencies, ride state distribution, queue depths. Used by the mobile admin "Inspector" screen.

## References

- RBAC: `../05-SECURITY/RBAC-MATRIX.md` · Money rules: `PAYMENT-FLOWS.md` · SOPs/runbooks: `../09-OPS/RUNBOOKS.md`