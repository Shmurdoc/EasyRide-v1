# EasyRyde — POPIA & GDPR Mapping

> **Segment**: 05-SECURITY · **Status**: REFRESHED 2026-08-14 — v1 "no data-export API" gaps are CLOSED  
> **Linked**: `../02-DATA-MODEL/ENCRYPTION.md`, `../03-WORKFLOWS/AUTH-FLOWS.md` (consent), `INCIDENT-RESPONSE.md`

---

## 1. Law Applicability

- **POPIA (SA)**: primary — processing personal information of SA residents (all users).
- **GDPR**: only if EU residents use the service (tourists via Kruger). Mapped 1:1 where practical — POPIA is the binding baseline.

## 2. PII Inventory → Control

| PII | Table | Protection | Retention |
|---|---|---|---|
| email, phone | users | hashed lookup + plaintext | until erasure |
| name | users | — | until erasure |
| DOB, ID number, licence | driver_profiles | encrypted | driver lifecycle |
| emergency contact | driver_profiles | encrypted | driver lifecycle |
| addresses, names | deliveries, food_orders | encrypted | order lifecycle |
| location data | ride_location_logs, driver_locations | geo + spoof flags | ride lifecycle |
| consent records | consent_records | versioned, IP/UA | permanent (legal) |
| KYC docs | kyc_verifications + files | paths + files on disk | verification lifecycle |

## 3. POPIA Sections → Implementation

| Section | Requirement | Implementation | Status |
|---|---|---|---|
| S.9–12 | Lawful processing, notice | consent_types + versions + consent_text; privacy policy in app | ✅ |
| S.13 | Purpose limitation | consent per purpose; consent gate | ✅ |
| S.14–16 | Further processing / rights object | revoke → stop processing (location/marketing) | ✅ |
| S.18 | Direct marketing consent | `marketing` consent type + `notification_preferences.marketing` | ✅ |
| S.19–20 | Security safeguards | encryption, hashing, TLS, RBAC, audit | ✅ |
| S.22 | Security compromise notification | `BreachNotificationService` (alert admins + affected users) | ✅ |
| S.23–25 | Data subject access/erasure | `GET /data/export`, `POST /data/erasure`, `POST /data/anonymize` (`DataRetentionController`) | ✅ |
| S.26–27 | Trans-border transfers | SA-only hosting (prod) — document regions | ⚠️ document |
| S.28 | Operator agreements | PHBIMH partner + gateway DPA's | ⚠️ ops |
| S.29 | DPIA for high-risk | performed informally; formal DPIA needed at launch | ⚠️ |

## 4. Data Subject Rights (API + UI)

| Right | API | Client UI |
|---|---|---|
| Access (export) | `GET /data/export` (JSON bundle) | ❌ missing UI (B-2xx) |
| Erasure | `POST /data/erasure` | ❌ missing UI |
| Anonymization | `POST /data/anonymize` | admin compliance screen |
| Rectification | `PUT /users/{id}` | Profile screen |
| Consent management | `GET/POST /consent/*` | ConsentScreen |
| Marketing opt-out | prefs + consent revoke | Notification preferences |
| Complaint/objection | support channels | Support screen (static) |

## 5. Retention Schedule (DataRetentionService)

| Category | Period | Job |
|---|---|---|
| Ride/chat/location logs | ride lifecycle + cleanup | CleanupStaleRides, prunes |
| Failed auth tokens | 90 days | RevokeExpiredTokensJob 04:00 |
| Wallet transactions | indefinite (financial records) | prunes only old types |
| Audit logs | indefinite (POPIA S.22 evidence) | admin data-retention info |
| Anonymized users | permanent shell | retention:cleanup 03:30 (`--dry-run` first) |
| Promo/referral ledgers | financial | — |

## 6. Breach Notification Path

`BreachNotificationService` → `notifyDataBreach` (log + admin alert) → `notifyAffectedUsers` (SMS/push/email) → `logBreach`. Trigger per `INCIDENT-RESPONSE.md` R6 timeline (report to Information Regulator without undue delay; ≤72h if feasible).

## References

- Full compliance matrix + gaps: `AUDIT-2026-07-30.md` · Encryption: `../02-DATA-MODEL/ENCRYPTION.md` · Runbook: `INCIDENT-RESPONSE.md`