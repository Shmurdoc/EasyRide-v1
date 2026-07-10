# EasyRyde Implementation Plan — Superpowers Remediation

**Version:** 1.0.0
**Created:** 2026-07-08T22:00:00Z
**Status:** Pending Approval
**Total Effort:** ~159h across 6 phases
**Critical Path:** A → B → C → D = ~97h sequential
**Parallel Track:** E runs parallel to B+C after A completes

---

## Executive Summary

After completing all 8 superpowers phases (Requirements → Data Model → Workflow Simulation → QA Audit → Security/Privacy → Code Gatekeeper → Test Suite → Ops/Monitoring), the Code Gatekeeper recorded a **NO-GO** decision due to 9 critical blockers and 79 high-priority items.

This plan defines the exact execution order to resolve all blockers and reach **GO** status, enabling code generation.

---

## Pre-Conditions

- [x] Phase 1 (Requirements) — Approved v1.0.0
- [x] Phase 2 (Data Model) — Approved v1.0.0
- [x] Phase 3 (Workflow Simulation) — Approved v1.0.0
- [x] Phase 4 (QA Audit) — Approved v1.0.0
- [x] Phase 5 (Security/Privacy) — Approved v1.0.0
- [x] Phase 6 (Code Gatekeeper) — Approved v1.0.0 (NO-GO)
- [x] Phase 7 (Test Suite) — Created v1.0.0
- [x] Phase 8 (Ops/Monitoring) — Created v1.0.0
- [ ] **GO Decision** — Pending completion of this plan

---

## Execution Phases

### Phase A: Critical Blockers & Architectural Decisions

**Duration:** ~8h
**Dependencies:** None
**Blockers:** ALL downstream phases depend on this

| Task | ID | Effort | Owner | Deliverable |
|------|----|--------|-------|-------------|
| Resolve ride type enum (Phase 1 vs Phase 2) | C-05 | 1h | Architect | Decision doc: adopt Phase 2 enum (standard/premium/minivan/pets/delivery) |
| Resolve surge multiplier range | C-01 | 1h | Architect | Decision doc: adopt 1.00-5.00 (Phase 2 authoritative) |
| Resolve PHBIMH PK incompatibility | IG-01 | 1h | Architect | Decision doc: migrate PHBIMH to UUIDs |
| Define PHBIMH delegation mechanism | A-08 | 1h | Architect | Decision doc: REST API with webhook callbacks |
| Define PHBIMH driver sharing model | A-09 | 1h | Architect | Decision doc: profile sync via REST API |
| Define PHBIMH payment integration | IG-04 | 1h | Architect | Decision doc: EasyRyde processes all payments |
| Rotate Firebase service account key | SG-01 | 2h | DevOps | New key deployed, old key purged from git history |

**Acceptance Criteria:**
- [ ] All 7 architectural decisions documented with rationale
- [ ] Firebase key rotated and git history cleaned
- [ ] Decisions propagated to Phase 1-5 documents (version bump)

---

### Phase B: Missing Fields & Validations

**Duration:** ~20h
**Dependencies:** Phase A (C-01, C-05 decisions)
**Output:** Migrations + FormRequest classes

| Task | ID | Effort | Description |
|------|----|--------|-------------|
| Add missing fields to `rides` table | MF-01 to MF-08 | 4h | 7 fields: cancellation_policy, pool_riders_count, estimated_distance, estimated_duration, actual_distance, actual_duration, route_polyline |
| Add missing fields to `users`/`driver_profiles` | MF-09 to MF-12 | 2h | 3 fields: last_login_at, id_document_url, license_expiry |
| Add missing fields to `payments` | MF-13, MF-14 | 1h | 2 fields: payment_method_details, failure_reason |
| Add missing field to `wallet_transactions` | MF-16 | 0.5h | 1 field: reference_type |
| Add missing fields to `promo_codes` | MF-17, MF-18 | 1h | 2 fields: usage_limit_per_user, applicable_ride_types |
| Add missing fields to `restaurants` | MF-20, MF-21 | 1h | 2 fields: opening_hours_json, delivery_radius_km |
| Add missing fields to `food_orders` | MF-22 to MF-26 | 2h | 4 fields: special_instructions, estimated_delivery_time, actual_delivery_time, driver_earnings |
| Add missing fields to `deliveries` | MF-27 to MF-29 | 1.5h | 3 fields: pickup_notes, delivery_notes, proof_of_delivery_url |
| Add missing fields to `sos_alerts` | MF-30, MF-31 | 1h | 2 fields: resolved_at, resolved_by |
| Add missing field to `consent_records` | MF-32 | 0.5h | 1 field: ip_address |
| Create FormRequest validation classes | MV-01 to MV-15 | 5h | 15 validation rules across all endpoints |

**Acceptance Criteria:**
- [ ] All 32 missing fields added via migrations
- [ ] All 15 validation rules implemented as FormRequest classes
- [ ] Migration tests pass (up/down/seed)
- [ ] Existing tests still pass

---

### Phase C: Missing Workflows & State Machines

**Duration:** ~24h
**Dependencies:** Phase A (PHBIMH decisions), Phase B (schema)
**Output:** Service classes + workflow implementations

| Task | ID | Effort | Description |
|------|----|--------|-------------|
| Promo code application workflow | MW-01 | 2h | Validate, apply discount, record redemption |
| Wallet top-up workflow | MW-02 | 2h | Init payment → confirm → credit wallet |
| Rider dispute filing | MW-03 | 2h | File dispute → hold payout → investigate |
| Driver dispute filing | MW-04 | 2h | File dispute → notify admin → resolve |
| Refund processing workflow | MW-05 | 2h | Calculate refund → process → update wallet |
| Scheduled ride cancellation | MW-06 | 1h | Time-based cancellation rules |
| Document expiry handling | MW-07 | 1h | Auto-deactivate drivers with expired docs |
| Night mode operations | MW-08 | 1h | Adjust pricing/surge during 22:00-05:00 |
| Pool ride matching | MW-09 | 3h | Multi-rider matching, pricing split |
| Pool ride join/leave | MW-10 | 2h | Dynamic pool management |
| Cash reconciliation | MW-11 | 1h | Driver cash collection tracking |
| In-app chat workflow | MW-13 | 2h | Message persistence, read receipts |
| Emergency SMS fallback | MW-15 | 1h | SMS when push fails |
| PHBIMH order delegation | MW-16 | 2h | Accept/decline delegated orders |
| PHBIMH driver sharing | MW-17 | 1h | Profile sync with PHBIMH |
| PHBIMH payment reconciliation | MW-18 | 1h | Cross-platform payment tracking |

**Edge Cases to Handle:**

| ID | Edge Case | Handling |
|----|-----------|----------|
| ME-02 | Driver goes offline mid-ride | Auto-reassign after 60s |
| ME-03 | Rider requests ride while in another ride | Block with error |
| ME-08 | Ride estimate differs >20% from actual | Cap at 120% of estimate |
| ME-10 | Cancellation rate exceeds 1% | Flag driver for review |
| ME-12 | Ride completed but payment never confirmed | Retry 3x, then hold |
| ME-13 | Driver completes ride but rider cancelled | Atomic state check |
| ME-16 | Concurrent wallet deductions | Redis lock + DB transaction |
| ME-18 | GPS spoofing detection | Cross-check with cell tower |
| ME-20 | Account deletion while ride in progress | Block deletion, queue for later |

**Acceptance Criteria:**
- [ ] All 16 workflows implemented as service classes
- [ ] All 9 edge cases handled with proper error responses
- [ ] Unit tests for each workflow
- [ ] Integration tests for edge cases

---

### Phase D: Security & Compliance Controls

**Duration:** ~45h
**Dependencies:** Phase B (MF-32, validations)
**Output:** Middleware, policies, consent flows, POPIA compliance

| Task | ID | Effort | Description |
|------|----|--------|-------------|
| Rate limiting on all endpoints | SG-02 | 4h | 9 rate limit groups from Phase 5 §4.3 |
| RBAC implementation (Spatie) | SG-03 | 8h | 6 roles: rider, driver, restaurant, finance, support, super_admin |
| CSRF protection on admin routes | SG-04 | 2h | Verify existing middleware |
| Input validation hardening | SG-05 | 8h | All FormRequest classes from Phase B |
| Debug info exposure check | SG-06 | 1h | APP_DEBUG=false, hide stack traces |
| POPIA consent capture flow | CG-01 | 4h | Consent banner, version tracking, withdrawal |
| Data subject request workflow | CG-02 | 8h | Export (30 days), anonymize, erasure |
| Breach notification workflow | CG-03 | 4h | 72h Regulator notification, user notification |
| PCI-DSS SAQ-A verification | CG-04 | 2h | No card data storage, tokenization verified |
| POPIA data retention enforcement | CG-07 | 4h | Automated cleanup jobs per retention policy |

**Acceptance Criteria:**
- [ ] All 9 rate limit groups enforced
- [ ] All 6 roles with proper permissions
- [ ] POPIA consent flow tested end-to-end
- [ ] Data export includes all PII fields
- [ ] Data erasure removes PII but preserves financial records
- [ ] Breach notification templates ready
- [ ] No card data in database or logs

---

### Phase E: Integration Architecture (PHBIMH)

**Duration:** ~54h
**Dependencies:** Phase A (architectural decisions)
**Output:** API contracts, mapping layer, real-time sync

| Task | ID | Effort | Description |
|------|----|--------|-------------|
| Design REST API contracts | IG-05 | 6h | OpenAPI specs for all integration endpoints |
| UUID ↔ INT mapping layer | IG-06 | 8h | Mapping service for PHBIMH compatibility |
| Ride model enrichment layer | IG-07 | 6h | Merge PHBIMH + EasyRyde ride data |
| Redis pub/sub bridge | IG-08 | 8h | Real-time sync between platforms |
| Admin panel decision | IG-09 | 4h | Decide: unified or separate |
| Webhook standard (HMAC) | IG-10 | 6h | Webhook signing and verification |
| Resolve ride search radius | C-02 | 1h | Clarify: 5km default |
| Resolve cancellation fee | C-03 | 1h | Clarify: R25 base |
| Resolve payment method enum | C-04 | 1h | Clarify: add `phbimh_wallet` |
| Specify pool ride pricing | A-07 | 1h | Base fare × 0.75/passenger, min R20 |
| Specify card types | A-01 | 1h | Visa, Mastercard, Amex |
| Specify wallet top-up | A-02 | 1h | Min R50, Max R5000 |
| Specify rating algorithm | A-04 | 1h | Exponential moving average, α=0.3 |
| Specify night mode hours | A-05 | 1h | 22:00-05:00 SAST |
| Specify dispatch timing | A-06 | 1h | Within 30s of request |
| Specify delivery radius | A-10 | 1h | 15km from restaurant |
| Specify incident resolution | A-11 | 1h | 24h SLA for P1 |
| Specify data retention | A-12 | 1h | 7 years financial, 2 years ride, 1 year logs |

**Acceptance Criteria:**
- [ ] All API contracts documented in OpenAPI
- [ ] UUID ↔ INT mapping tested
- [ ] Real-time sync working between platforms
- [ ] All contradictions resolved
- [ ] All ambiguities resolved

---

### Phase F: Missing Tables & Indexes

**Duration:** ~8h
**Dependencies:** None (parallel track)
**Output:** Migrations

| Task | ID | Effort | Description |
|------|----|--------|-------------|
| Create `scheduled_rides` table | DT-01 | 2h | Scheduled ride support |
| Create `bank_accounts` table | DT-02 | 1h | Driver bank account storage |
| Create `user_documents` table | DT-03 | 1h | KYC document storage |
| Create `promo_code_redemptions` table | DT-05 | 1h | Track promo usage |
| Create `referral_redemptions` table | DT-06 | 1h | Track referral usage |
| Create `ride_feedback` table | DT-07 | 1h | Post-ride feedback |
| Add 10 missing indexes | DI-01 to DI-10 | 5h | Performance indexes on hot queries |

**Acceptance Criteria:**
- [ ] All 6 tables created with proper migrations
- [ ] All 10 indexes added
- [ ] Migration tests pass
- [ ] Query performance verified

---

## Critical Path Analysis

```
Phase A (8h) ──→ Phase B (20h) ──→ Phase C (24h) ──→ Phase D (45h)
     │                                    │
     └──→ Phase E (54h)                   │
                                          └──→ Phase F (8h) [parallel]
```

**Longest path:** A(8) + B(20) + C(24) + D(45) = **97h**
**With parallelism:** A(8) + max(B+C+D=89, E=54) = **97h**
**Phase F parallel to everything:** +0h on critical path

**Total calendar time (with 2 parallel workers):** ~50h
**Total effort (all workers combined):** ~159h

---

## Risk Register

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| PHBIMH architectural decisions delayed | High | Critical | Schedule decision meeting before Phase A starts |
| Security controls more complex than estimated | Medium | High | Buffer 10h contingency |
| Race conditions require distributed locking redesign | Medium | High | Use Redis locks + DB transactions |
| Migration conflicts with existing schema | Low | Medium | Review all existing migrations first |
| Test failures during remediation | High | Medium | Run tests after each phase |

---

## GO Criteria

All of the following must be true for Phase 6 to record **GO**:

| Criterion | Status |
|-----------|--------|
| All 9 critical blockers resolved | ☐ |
| All 79 high-priority items resolved | ☐ |
| All security controls implemented | ☐ |
| All compliance requirements met | ☐ |
| All missing fields & validations added | ☐ |
| All missing workflows implemented | ☐ |
| All missing tables & indexes created | ☐ |
| All tests pass (Phase 7 targets) | ☐ |
| All ops monitoring configured (Phase 8) | ☐ |
| Re-audit passes (Phase 4 re-run) | ☐ |
| All 5 lead sign-offs obtained | ☐ |

**Estimated completion:** ~159h of work
**Target GO date:** After all items above are checked

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-07-08T22:00:00Z | Initial plan — 6 phases, 129 items, ~159h total |
