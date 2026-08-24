# EasyRyde — In-App Advertising Architecture

> **Segment**: 10-BUSINESS · **Status**: PLAN (v1 design, 2026-08-14) — nothing shipped  
> **Linked**: `BUSINESS-ENTITIES.md` (revenue), `../06-DESIGN-SYSTEM/TOKENS.md` (placement styling), `../01-REQUIREMENTS/SYSTEM-OVERVIEW.md` (true goal constraint)

---

## 1. Why (truth check)

Advertising revenue only in service of the true goal: it must not degrade ride safety, dispatch, or payment UX. **Constraint**: ads appear only in non-driving surfaces (food lists, idle driver dashboard, activity feeds, wallet page) and are rate-limited (≤1 ad view per surface per session).

## 2. Proposed Data Model (adds to schema)

| Table | Fields |
|---|---|
| `advertisements` | tenant_id, advertiser_id, title, media_url, deep_link (`easyryde://…`), placements, impressions_cap, starts_at, ends_at, is_active |
| `ad_placements` | advertisement_id, surface (restaurant_list/food_menu/driver_dashboard/wallet/activity), position, weight (rotation priority) |
| `ad_impressions` | advertisement_id, user_id, placement, seen_at, clicked(bool), spend_events |
| `ad_campaigns` (optional later) | budget, cpm/cpc, total_spend, status |

Rotation: weighted by `weight` per surface; impression logged server-side (client reports view → `POST /ads/impression`, rate-limited — **never trust client spend**).

## 3. Serving Path

```
Client requests surface → GET /ads/placements?surface=… (authed, 5/min)
  → AdService: active ∧ within cap ∧ tenant match → sorted by weight
  → client renders (ad component) → on view: POST impression → on tap: deep link registry
  → billing: cpc/cpm accrual job (daily) → ad ledger (ad_impressions.spend_events)
```

## 4. Boundaries

| Allowed | Not allowed |
|---|---|
| Food/restaurant promos on menu & checkout (native) | Any ad visible during active ride tracking |
| Driver-dashboard sponsored tips/content when offline-idle | Ads on SOS, payment, consent, KYC screens |
| Wallet page sponsored offers | Popover/fullscreen interruptive formats |
| Safer-ride vendor promos (e.g. dashcams) targeted to drivers | Cross-tenant leakage (tenant_id scoped) |

## 5. Compliance Stubs

- POPIA: ad determination is covered by `marketing` consent + `notification_preferences.marketing` flag — gate ad calls on it.
- Transparency: every ad shows "Ad" label (a11y + POPIA S.36).
- Minor users: no ads if date_of_birth < 18 (driver profiles have DOB; riders optional — fallback is no targeted ads).

## 6. Rollout Steps

1. Migrations + `AdService` + admin CRUD (`admin/ads/*`) → 2. shared `AdCard` component + placements in 3 surfaces → 3. impression/click ledger + billing job → 4. sponsor portal (admin panel) → 5. report page (impressions/CTR/spend) in `Reports`.

## References

- Revenue context: `BUSINESS-ENTITIES.md` §1 · Growth: `EXPANSION.md` · Consent: `../05-SECURITY/POPIA-GDPR.md`