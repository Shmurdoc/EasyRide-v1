# EasyRyde — PCI-DSS Posture

> **Segment**: 05-SECURITY · **Status**: REFRESHED 2026-08-14 — v1 "PCI VIOLATION" finding is closed  
> **Linked**: `PAYMENT-FLOWS.md`, `THREAT-MODEL.md`, `../03-WORKFLOWS/PAYMENT-FLOWS.md`

---

## 1. Card-Data Handling: SAQ-A (Redirect/Intent-Only)

| Claim | Evidence |
|---|---|
| No PAN/CVV/expiry ever stored or transmitted through EasyRyde servers | grep the codebase: no `card_number`, `cvv`, `expiry` fields in backend or clients; Stripe **PaymentIntent** server-side, PayFast/Ozow **redirect** flows |
| Card entry happens on gateway-owned surfaces | Stripe Elements/intent confirm on the client-device to Stripe; PayFast/Ozow hosted pages |
| Server never sees card number | `PaymentController` receives only method + gateway token/refs |
| No card fields in error/log paths | Sentry `send_default_pii=false`; webhook payloads logged → `WebhookEvent.payload` sanitized (no card data) |
| Client never persists card data | SecureStore holds only auth tokens |

## 2. What This Means

- **Scope**: SAQ-A (redirect/IFrame/URL) — no cardholder data environment (CDE) of our own.
- Security audits (2026-07-30) confirmed no card fields anywhere; old C-003 (client-side card form) removed and never restored — **regression guard: any PR adding card input fields fails code review**.

## 3. Controls That Keep Us SAQ-A

| Control | Where |
|---|---|
| Redirect/intent-only gateway flows | `PaymentRouter`, Stripe/PayFast/Ozow services |
| Webhook verification | IP whitelist + signature checks |
| Idempotent payment processing | `idempotency_key`, `ProcessPaymentJob` |
| Escrow + dispute holds instead of holding card data | `EscrowService`, `held_until` |
| Token minting by gateway (no PAN retention) | gateway references only (`gateway_reference`) |
| TLS everywhere | `ForceHttps` + nginx HSTS |

## 4. Gaps / Considerations for Production Sign-off

| Item | Status |
|---|---|
| QSA review of SAQ-A eligibility (redirects actually executed) | PENDING — ops sign-off needed (BACKLOG B-00x) |
| PayFast ITN `verifyPaymentWithServer` reconciliation path exercised in prod sandbox | PENDING |
| Ozow site/private key custody + rotation process | exists (env) — SOP in RUNBOOKS |
| Stripe webhook secret rotation + sentry alerting | PENDING |
| Merchant IDs in prod vs sandbox mode flags | `PAYFAST_MODE`/`OZOW_MODE` env — verify prod=false |

## 5. If Scope Ever Grows (stored cards/tokenization)

- Storing tokens is NOT storing PAN, but creates a CDE if keys/tokens mishandled → keep token custody with gateway.
- Any move to on-server card handling requires: QSA, SAQ-D or full DSS v4 assessment, key mgmt, quarterly scans → treat as a project, not a PR.

## References

- Payment internals: `../03-WORKFLOWS/PAYMENT-FLOWS.md` · Encryption: `../02-DATA-MODEL/ENCRYPTION.md` · Audit: `AUDIT-2026-07-30.md`