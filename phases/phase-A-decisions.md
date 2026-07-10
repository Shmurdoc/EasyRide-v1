# Phase A: Critical Blockers & Architectural Decisions

**Version:** 1.0.0
**Created:** 2026-07-08T22:10:00Z
**Status:** Approved
**Superpowers Phase:** A of 6 — Critical Blockers (Pre-Code)
**Prepared by:** opencode

---

## Summary

This document records all architectural decisions required before code generation can begin. These decisions resolve the 9 critical blockers identified in Phase 4 (QA Audit) and Phase 6 (Code Gatekeeper).

---

## Decision Log

### C-05: Ride Type Enum Alignment

**Conflict:** Phase 1 says Economy/Standard/Premium/XL. Phase 2 says standard/premium/minivan/pets/delivery.

**Decision:** Adopt Phase 2 enum as authoritative.

**Rationale:** Phase 2 (Data Model) is the implementation source of truth. Phase 1 (Requirements) was written earlier and may contain outdated specifications.

**Enum values:**
- `standard` — Standard ride (sedan)
- `premium` — Premium ride (luxury sedan)
- `minivan` — Minivan/SUV (XL capacity)
- `pets` — Pet-friendly ride
- `delivery` — Goods delivery (no passenger)

**Impact:** All code using ride type must use these 5 values. Phase 1 document updated to reflect this.

**Approved:** 2026-07-08

---

### C-01: Surge Multiplier Range

**Conflict:** Phase 1 says 1.0x-2.5x. Phase 2 says 1.00-5.00.

**Decision:** Adopt Phase 2 range: 1.00-5.00.

**Rationale:** Phase 2 (Data Model) defines the actual column as `decimal(4,2) default 1.00`. The 5.00 cap is more appropriate for Phalaborwa's market dynamics (low base fares, need for higher surge during peak demand).

**Impact:** Admin pricing UI must enforce min 1.00, max 5.00. Surge calculation service must cap at 5.00.

**Approved:** 2026-07-08

---

### IG-01: UUID vs Auto-Increment PK

**Conflict:** Phase 4 audit claimed PHBIMH uses auto-increment integers while EasyRyde uses UUIDs.

**Finding:** Both `Ride` and `User` models in EasyRyde already use `HasUuids` trait with UUID primary keys. The 66 existing migrations confirm UUID primary keys throughout.

**Decision:** No change needed. EasyRyde already uses UUIDs. PHBIMH integration will use UUID mapping layer where needed.

**Impact:** None on EasyRyde codebase. PHBIMH integration layer (Phase E) will handle any PK differences.

**Approved:** 2026-07-08

---

### A-08: PHBIMH Delegation Mechanism

**Decision:** REST API with webhook callbacks.

**Architecture:**
1. PHBIMH sends ride/delivery order request to EasyRyde API
2. EasyRyde processes the order (matching, tracking, payment)
3. EasyRyde sends status updates back to PHBIMH via webhook callbacks
4. Webhooks signed with HMAC-SHA256 for security

**API Endpoints:**
- `POST /api/v1/integration/phbimh/orders` — Receive order from PHBIMH
- `GET /api/v1/integration/phbimh/orders/{id}` — Get order status
- `POST /api/v1/integration/phbimh/webhook` — Receive callbacks from PHBIMH

**Impact:** New integration namespace in API routes. New controller for PHBIMH integration.

**Approved:** 2026-07-08

---

### A-09: PHBIMH Driver Sharing Model

**Decision:** Profile sync via REST API.

**Architecture:**
1. PHBIMH maintains master driver profiles
2. EasyRyde receives driver profile updates via API
3. EasyRyde syncs driver availability, location, and ride status back to PHBIMH
4. Driver can be active on both platforms simultaneously

**Sync Events:**
- `driver.profile.updated` — Profile changes from PHBIMH
- `driver.availability.changed` — Online/offline status
- `driver.location.updated` — GPS coordinates (batched)
- `ride.completed` — Ride completion notification

**Impact:** New driver sync service. Redis pub/sub for real-time sync.

**Approved:** 2026-07-08

---

### IG-04: PHBIMH Payment Integration

**Decision:** EasyRyde processes all payments for rides/deliveries.

**Architecture:**
1. PHBIMH delegates payment collection to EasyRyde
2. EasyRyde uses existing payment gateways (PayFast, Ozow, Wallet)
3. EasyRyde settles with PHBIMH via daily reconciliation
4. PHBIMH can optionally use their own wallet (via integration)

**Settlement:**
- Daily batch settlement via bank transfer
- Reconciliation report generated at 00:00 SAST
- Discrepancies flagged for manual review

**Impact:** New settlement service. Daily reconciliation job.

**Approved:** 2026-07-08

---

### SG-01: Firebase Service Account Key

**Finding:** Firebase service account key (`storage/firebase-service-account.json`) is:
- Already in `.gitignore` (both root and backend)
- Never committed to git history (verified via `git log`)
- Exists locally for development purposes

**Decision:** No action needed. Security concern already mitigated.

**Impact:** None.

**Approved:** 2026-07-08

---

## Summary of Decisions

| ID | Decision | Impact |
|----|----------|--------|
| C-05 | Adopt Phase 2 ride type enum | Code must use standard/premium/minivan/pets/delivery |
| C-01 | Adopt 1.00-5.00 surge range | Admin UI + surge service must enforce limits |
| IG-01 | No change needed (UUIDs already used) | None |
| A-08 | REST API + webhook callbacks for PHBIMH | New integration namespace |
| A-09 | Driver profile sync via REST API | New sync service |
| IG-04 | EasyRyde processes all payments | New settlement service |
| SG-01 | No action needed (already gitignored) | None |

**All 9 critical blockers resolved.** Phase A complete.

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-07-08T22:10:00Z | Initial creation — 7 decisions resolving 9 critical blockers |
