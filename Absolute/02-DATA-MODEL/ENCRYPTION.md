# EasyRyde — Encryption & PII Handling

> **Segment**: 02-DATA-MODEL · **Status**: VERIFIED 2026-08-14  
> **Linked**: `../05-SECURITY/PCI-DSS.md`, `POPIA-GDPR.md`, `THREAT-MODEL.md`; trait `backend/app/Traits/EncryptsPii.php`

---

## 1. PII Inventory & Protection Level

| Field | Table | Protection | Notes |
|---|---|---|---|
| password | users | bcrypt (BCRYPT_ROUNDS=12) | never logged |
| email / phone_number | users | **searchable hash** (email_hash sha256 unique, phone_hash idx) + plaintext | 06-09 encrypted then 06-21 decrypted; hashes enable lookup without plaintext equality |
| license_number, id_number, date_of_birth, emergency_contact_name, emergency_contact_phone | driver_profiles | **encrypted** (`encrypted` cast) | columns widened to `text` (migration #70) |
| license_plate | vehicles | **encrypted** | |
| account_number | bank_accounts | **encrypted** | |
| sender_name/phone, recipient_name/phone/address, pickup/dropoff_address | deliveries | **encrypted** | |
| delivery_address | food_orders | **encrypted** | |
| totp_secret | users | encrypted cast + hidden from serialization | |
| payment gateway responses | payments.gateway_response | stored, sanitized | no PAN/CVV ever (PCI) |
| document_number | kyc_verifications | plaintext reference number | files on disk, not DB |

## 2. Mechanics

| Mechanism | Where | Detail |
|---|---|---|
| `EncryptsPii` trait | models | `encryptPiiField/decryptPiiField/hashPiiField (sha256)` |
| Eloquent `encrypted` casts | model `$casts` | transparent encrypt/decrypt per attribute |
| Key rotation | `.env` | `APP_KEY` + `APP_PREVIOUS_KEYS` (old keys kept for decryption during rotation) |
| Data migrations | `pii:encrypt-existing` command | encrypt existing rows; history shows flip-flop (06-09 encrypt users email/phone → 06-21 decrypt) — search hashes are the current compromise |
| Hash uniqueness | `email_hash` | allows dedup + lookup without exposing plaintext |

## 3. Rules (non-negotiables)

1. **Encrypted cast columns are `text`** in migrations — encrypted output exceeds VARCHAR limits (AGENTS.md rule, verified by migration #70).
2. **Never log PII**: Sentry `send_default_pii=false`; `InputSanitizationMiddleware` strips on input; exceptions scrubbed.
3. **Never put PAN/CVV/expiry anywhere** — card data flows only between client and gateway (Stripe elements / redirect). See `05-SECURITY/PCI-DSS.md`.
4. **Hashing beats encryption when you need search**: add `*_hash` columns (dedup, login lookups) instead of raw equality on encrypted fields.
5. **Erasure ≠ delete for riders**: erasure delegates to `DataRetentionService::deleteUserData` — deletes rows but keeps audit/`ride_status_histories` references intact.
6. **Transport**: HTTPS enforced (`ForceHttps` middleware + nginx redirects); Redis with `requirepass` in prod.

## 4. Encryption by Environment (state)

| Field set | Prod intent | Verified |
|---|---|---|
| Driver profile PII + vehicle plate + delivery/food addresses | encrypted | yes (migrations #8/#9/#18/#27 casts) |
| user email/phone | plaintext + hash (searchable) | yes (decrypted #39) |
| payment data | no card data at rest (SAQ-A) | yes (audit 2026-07-30) |

## 5. Retention & Cleanup

| Data | Retention | Automation |
|---|---|---|
| ride/chat/location logs | lifecycle-bound | `CleanupStaleRidesJob`, prunes |
| failed tokens | RevokeExpiredTokensJob (daily 04:00, >90d) | scheduled |
| wallet transactions | prune daily (`model:prune`) | scheduled |
| anonymized users | kept as anonymized shells (POPIA accounting) | `DataRetentionService` |
| audit logs | kept (audit exceptions apply) | `admin/data-retention` info page |

## References

- Threat angles: `../05-SECURITY/THREAT-MODEL.md` · Compliance mapping: `../05-SECURITY/POPIA-GDPR.md` · Card data: `../05-SECURITY/PCI-DSS.md` · Seeding PII: `../08-TESTING/API-TESTS.md`